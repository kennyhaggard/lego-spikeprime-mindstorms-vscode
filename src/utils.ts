import CRC32 = require("crc-32");

const CRC32_ALIGNMENT = 4;

export const enum Command {
    ConnectToHub = "lego-spikeprime-mindstorms-vscode.connectToHub",
    DisconnectFromHub = "lego-spikeprime-mindstorms-vscode.disconnectFromHub",
    SetHubName = "lego-spikeprime-mindstorms-vscode.setHubName",
    UploadAllPrograms = "lego-spikeprime-mindstorms-vscode.uploadAllPrograms",
    UploadProgram = "lego-spikeprime-mindstorms-vscode.uploadProgram",
}

export function setTimeoutAsync(callback: () => void, delay: number) {
    return new Promise<void>((resolve) => {
        setTimeout(() => {
            callback();
            resolve();
        }, delay);
    });
}

export function formatBluetoothAddress(address: string): string {
    const hexAddress = address.replace(/[^0-9a-f]/gi, "");
    if (hexAddress.length !== 12) {
        return address.toUpperCase();
    }

    return hexAddress.match(/.{2}/g)!.join(":").toUpperCase();
}

export function hasLegoProgramHeader(firstLine: string): boolean {
    return firstLine.startsWith("# LEGO");
}

export interface LegoProgramHeader {
    slotId: number;
    isAutostartIn: boolean;
    includeFileNames: string[];
}

export interface LegoProgramManifestEntry {
    fileName: string;
    slotId: number;
}

export function parseLegoProgramHeader(firstLine: string): LegoProgramHeader {
    const includeFileNames: string[] = [];
    let slotId = NaN;

    if (hasLegoProgramHeader(firstLine)) {
        for (const token of firstLine.slice("# LEGO".length).trim().split(/\s+/)) {
            if (token.startsWith("slot:")) {
                slotId = Number(token.slice("slot:".length));
            }
            else if (token.startsWith("include:")) {
                for (const fileName of token.slice("include:".length).split(",")) {
                    const trimmedFileName = fileName.trim();
                    if (trimmedFileName && !includeFileNames.includes(trimmedFileName)) {
                        includeFileNames.push(trimmedFileName);
                    }
                }
            }
        }
    }

    return {
        slotId,
        isAutostartIn: hasLegoProgramHeader(firstLine)
            && firstLine.slice("# LEGO".length).trim().split(/\s+/).includes("autostart"),
        includeFileNames,
    };
}

export function getImportedModuleNames(source: string): string[] {
    const moduleNames: string[] = [];
    const addModuleName = (moduleName: string) => {
        if (!moduleNames.includes(moduleName)) {
            moduleNames.push(moduleName);
        }
    };

    for (const line of source.replace(/\\\r?\n/g, " ").split(/\r?\n/)) {
        const statement = line.trimStart();
        const fromMatch = statement.match(
            /^from\s+(\.*[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*|\.)\s+import\s+(.+)$/,
        );
        if (fromMatch) {
            const [, importedFrom, importedNames] = fromMatch;
            if (/^[A-Za-z_]\w*$/.test(importedFrom)) {
                addModuleName(importedFrom);
            }
            else if (/^\.[A-Za-z_]\w*$/.test(importedFrom)) {
                addModuleName(importedFrom.slice(1));
            }
            else if (importedFrom === ".") {
                for (const importedName of importedNames.split(",")) {
                    const nameMatch = importedName.trim().match(
                        /^([A-Za-z_]\w*)(?:\s+as\s+[A-Za-z_]\w*)?$/,
                    );
                    if (nameMatch) {
                        addModuleName(nameMatch[1]);
                    }
                }
            }
            continue;
        }

        const importMatch = statement.match(/^import\s+(.+)$/);
        if (!importMatch) {
            continue;
        }

        for (const importedName of importMatch[1].split(",")) {
            const nameMatch = importedName.trim().match(
                /^([A-Za-z_]\w*)(?:\s+as\s+[A-Za-z_]\w*)?(?:\s*#.*)?$/,
            );
            if (nameMatch) {
                addModuleName(nameMatch[1]);
            }
        }
    }

    return moduleNames;
}

export function validateLegoProgramManifest(
    programs: LegoProgramManifestEntry[],
): void {
    const filesBySlot = new Map<number, string>();

    for (const program of programs) {
        if (!Number.isInteger(program.slotId)
            || program.slotId < 0
            || program.slotId > 19) {
            throw new Error(
                `${program.fileName} must declare a slot from 0 to 19`,
            );
        }

        const existingFile = filesBySlot.get(program.slotId);
        if (existingFile) {
            throw new Error(
                `Slot ${program.slotId} is declared by both ${existingFile} and ${program.fileName}`,
            );
        }

        filesBySlot.set(program.slotId, program.fileName);
    }
}

export function crc32WithAlignment(data: Uint8Array, seed = 0): number {
    const remainder = data.length % CRC32_ALIGNMENT;
    const alignedData = new Uint8Array(data.length + (CRC32_ALIGNMENT - remainder) % CRC32_ALIGNMENT);
    alignedData.set(data);

    return CRC32.buf(alignedData, seed);
}