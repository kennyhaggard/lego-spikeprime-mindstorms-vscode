import * as fs from "fs";
import * as path from "path";

export function findFileInParentDirectories(
    fileName: string,
    startDirectory: string,
    projectDirectory: string,
): string | undefined {
    const projectPath = path.resolve(projectDirectory);
    let currentPath = path.resolve(startDirectory);
    const relativeStartPath = path.relative(projectPath, currentPath);
    if (relativeStartPath === ".."
        || relativeStartPath.startsWith(`..${path.sep}`)
        || path.isAbsolute(relativeStartPath)) {
        return undefined;
    }

    while (true) {
        const candidatePath = path.join(currentPath, fileName);
        if (fs.existsSync(candidatePath) && fs.statSync(candidatePath).isFile()) {
            return candidatePath;
        }
        if (currentPath === projectPath) {
            return undefined;
        }
        currentPath = path.dirname(currentPath);
    }
}