import * as assert from "assert";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { findFileInParentDirectories } from "../../file-search";
import {
    formatBluetoothAddress,
    formatProgramLog,
    getImportedModuleNames,
    hasLegoProgramHeader,
    parseLegoProgramHeader,
    validateLegoProgramManifest,
} from "../../utils";

suite("Utils Test Suite", () => {
    test("Formats a compact Bluetooth address", () => {
        assert.strictEqual(
            formatBluetoothAddress("aabbccddeeff"),
            "AA:BB:CC:DD:EE:FF",
        );
    });

    test("Formats program logs with a two-digit slot prefix", () => {
        assert.strictEqual(
            formatProgramLog(3, "starting program."),
            "Slot 03: starting program.",
        );
    });

    test("Finds the nearest file while searching toward the project root", () => {
        const outsideDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "lego-includes-"));
        const projectDirectory = path.join(outsideDirectory, "project");
        const programDirectory = path.join(projectDirectory, "src", "missions");
        fs.mkdirSync(programDirectory, { recursive: true });
        fs.writeFileSync(path.join(outsideDirectory, "outside.py"), "");
        fs.writeFileSync(path.join(projectDirectory, "gadget.py"), "");
        fs.writeFileSync(path.join(projectDirectory, "src", "nearest.py"), "");

        try {
            assert.strictEqual(
                findFileInParentDirectories("gadget.py", programDirectory, projectDirectory),
                path.join(projectDirectory, "gadget.py"),
            );
            assert.strictEqual(
                findFileInParentDirectories("nearest.py", programDirectory, projectDirectory),
                path.join(projectDirectory, "src", "nearest.py"),
            );
            assert.strictEqual(
                findFileInParentDirectories("outside.py", programDirectory, projectDirectory),
                undefined,
            );
        }
        finally {
            fs.rmSync(outsideDirectory, { recursive: true, force: true });
        }
    });

    test("Normalizes an already separated Bluetooth address", () => {
        assert.strictEqual(
            formatBluetoothAddress("aa:bb:cc:dd:ee:ff"),
            "AA:BB:CC:DD:EE:FF",
        );
    });

    test("Recognizes a LEGO program header only at the start of the first line", () => {
        assert.strictEqual(hasLegoProgramHeader("# LEGO slot:3 autostart"), true);
        assert.strictEqual(hasLegoProgramHeader(" # LEGO slot:3"), false);
        assert.strictEqual(hasLegoProgramHeader("# lego slot:3"), false);
        assert.strictEqual(hasLegoProgramHeader("print('LEGO')"), false);
    });

    test("Parses slot, autostart, and included files in any order", () => {
        assert.deepStrictEqual(
            parseLegoProgramHeader(
                "# LEGO include:gadget.py,helpers.py slot:0 autostart",
            ),
            {
                slotId: 0,
                isAutostartIn: true,
                includeFileNames: ["gadget.py", "helpers.py"],
            },
        );
    });

    test("Ignores empty and duplicate include entries", () => {
        assert.deepStrictEqual(
            parseLegoProgramHeader(
                "# LEGO slot:3 include:gadget.py,,gadget.py include:extra.py",
            ).includeFileNames,
            ["gadget.py", "extra.py"],
        );
    });

    test("Finds local module candidates in Python import statements", () => {
        assert.deepStrictEqual(
            getImportedModuleNames([
                "import gadget",
                "import helpers as h, utilities",
                "from config import VALUE",
                "from wildcard import *",
                "    from nested import run",
                "from . import sibling as local",
                "from .relative import item",
                "from package.module import item",
                "from ..parent import item",
                "# import commented_out",
            ].join("\n")),
            [
                "gadget",
                "helpers",
                "utilities",
                "config",
                "wildcard",
                "nested",
                "sibling",
                "relative",
            ],
        );
    });

    test("Finds imports continued with a backslash", () => {
        assert.deepStrictEqual(
            getImportedModuleNames("import first, \\\n                second as alias"),
            ["first", "second"],
        );
    });

    test("Validates unique program slots", () => {
        assert.doesNotThrow(() => validateLegoProgramManifest([
            { fileName: "mission1.py", slotId: 0 },
            { fileName: "sub/mission2.py", slotId: 1 },
        ]));

        assert.throws(
            () => validateLegoProgramManifest([
                { fileName: "mission1.py", slotId: 0 },
                { fileName: "sub/mission2.py", slotId: 0 },
            ]),
            /Slot 0 is declared by both mission1\.py and sub\/mission2\.py/,
        );
    });

    test("Rejects invalid batch program slots", () => {
        assert.throws(
            () => validateLegoProgramManifest([
                { fileName: "mission.py", slotId: NaN },
            ]),
            /mission\.py must declare a slot from 0 to 19/,
        );
    });
});