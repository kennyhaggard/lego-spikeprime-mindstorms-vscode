import * as mpy from "@pybricks/mpy-cross-v6";

import * as vscode from "vscode";

import {
    clearProgramSlot,
    configureRawMessageLogging,
    getClient,
    getLogger,
    getProgramInfo,
    initClient,
    initHubStatusBarItems,
    onDeactivate,
    onHubConnected,
    registerSharedCommands,
    startProgramInSlot,
    uploadFileToHub,
    uploadProgramToHub,
} from "../shared-extension";
import { Command, setTimeoutAsync } from "../utils";
import { WebUsbClient } from "./clients/web-usb-client";

let wasmUri: vscode.Uri;

export async function activate(context: vscode.ExtensionContext) {
    wasmUri = vscode.Uri.joinPath(context.extensionUri, "dist/mpy-cross-v6.wasm");

    initHubStatusBarItems(context);
    configureRawMessageLogging(context);

    registerSharedCommands(context);

    const connectToHubCommand = vscode.commands.registerCommand(Command.ConnectToHub, async () => {
        try {
            initClient(WebUsbClient);

            await vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: "Connecting to Hub...",
                },
                () => getClient()!.connect(""),
            );

            await onHubConnected();
        }
        catch (e) {
            console.error(e);
            vscode.window.showErrorMessage("Connecting to Hub Failed!" + (e instanceof Error ? ` ${e.message}` : ""));
        }
    });

    const uploadProgramCommand = vscode.commands.registerCommand(Command.UploadProgram, async () => {
        if (!getClient()?.isConnectedIn) {
            vscode.window.showErrorMessage("LEGO Hub not connected! Please connect first!");
            return;
        }

        try {
            const programInfo = await getProgramInfo();
            if (!programInfo) {
                return;
            }

            await vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: programInfo.isAutostartIn
                        ? "Uploading and running program..."
                        : `Uploading Program to Hub (Slot #${programInfo.slotId})...`,
                },
                async (progress) => {
                    await performUploadProgram(
                        programInfo.slotId,
                        programInfo.includeFileNames,
                        progress,
                    );
                    if (programInfo.isAutostartIn) {
                        await setTimeoutAsync(() => { /* noop */ }, 250);
                        await startProgramInSlot(programInfo.slotId, false);
                    }
                },
            );

            if (!programInfo.isAutostartIn) {
                vscode.window.showInformationMessage("Program uploaded!");
            }
        }
        catch (e) {
            console.error(e);
            vscode.window.showErrorMessage("Program Upload Failed!" + (e instanceof Error ? ` ${e.message}` : ""));
        }
    });
    context.subscriptions.push(
        connectToHubCommand,
        uploadProgramCommand,
    );
}

// this method is called when your extension is deactivated
export async function deactivate() {
    await onDeactivate();
}

async function performUploadProgram(
    slotId: number,
    includeFileNames: string[],
    progress?: vscode.Progress<{ increment: number }>,
) {
    const editor = vscode.window.activeTextEditor;
    const config = vscode.workspace.getConfiguration();
    const logger = getLogger();

    if (!editor) {
        vscode.window.showInformationMessage("Please open a file");
        return;
    }

    const document = editor.document;
    const documentContent = document.getText();
    const includeFiles = await Promise.all(includeFileNames.map(async (name) => {
        if (name.includes("/") || name.includes("\\") || name === "." || name === "..") {
            throw new Error(`Included file must be in the same directory: ${name}`);
        }
        if (new TextEncoder().encode(name).length > 31) {
            throw new Error(`Included file name is too long: ${name}`);
        }

        const uri = vscode.Uri.joinPath(document.uri, "..", name);
        try {
            return { name, data: await vscode.workspace.fs.readFile(uri) };
        }
        catch {
            throw new Error(`Included file not found: ${uri.toString()}`);
        }
    }));

    let compileResult: mpy.CompileResult | undefined;
    if (config.get("legoSpikePrimeMindstorms.compileBeforeUpload")) {
        compileResult = await mpy.compile(
            document.fileName,
            documentContent,
            [],
            wasmUri.toString(),
        );

        if (compileResult?.status !== 0) {
            logger?.error(compileResult.err.join("\r\n"));
            logger?.error("\r\n");
            throw new Error("Compilation Failed!");
        }
    }

    const data = compileResult?.mpy ?? new TextEncoder().encode(documentContent);
    await clearProgramSlot(slotId);
    for (const includeFile of includeFiles) {
        await uploadFileToHub(includeFile.data, includeFile.name, slotId);
    }
    await uploadProgramToHub(
        data,
        slotId,
        !!compileResult?.mpy,
        progress,
    );
}