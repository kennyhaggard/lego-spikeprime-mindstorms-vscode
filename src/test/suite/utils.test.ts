import * as assert from "assert";

import {
    formatBluetoothAddress,
    hasLegoProgramHeader,
    parseLegoProgramHeader,
} from "../../utils";

suite("Utils Test Suite", () => {
    test("Formats a compact Bluetooth address", () => {
        assert.strictEqual(
            formatBluetoothAddress("aabbccddeeff"),
            "AA:BB:CC:DD:EE:FF",
        );
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
});