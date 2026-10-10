import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PALETTE_COLUMNS } from "../src/constants.js";
import { clampColumns, columnsFromDrag } from "../src/hud/palette-columns.js";

describe("clampColumns", () => {
	it("keeps the palette between 4 and 10 icons per row", () => {
		assert.equal(PALETTE_COLUMNS.min, 4);
		assert.equal(PALETTE_COLUMNS.max, 10);
		assert.equal(clampColumns(2), 4);
		assert.equal(clampColumns(4), 4);
		assert.equal(clampColumns(7), 7);
		assert.equal(clampColumns(10), 10);
		assert.equal(clampColumns(15), 10);
	});

	it("falls back to the core default for invalid values", () => {
		assert.equal(clampColumns(undefined), 5);
		assert.equal(clampColumns(NaN), 5);
	});
});

describe("columnsFromDrag", () => {
	const columnWidth = 27; // 24px icon + 3px gap

	it("snaps to whole columns", () => {
		assert.equal(columnsFromDrag(5, 10, columnWidth), 5);
		assert.equal(columnsFromDrag(5, 14, columnWidth), 6);
		assert.equal(columnsFromDrag(5, 54, columnWidth), 7);
		assert.equal(columnsFromDrag(5, -27, columnWidth), 4);
	});

	it("stops at the limits however far the pointer moves", () => {
		assert.equal(columnsFromDrag(5, -500, columnWidth), 4);
		assert.equal(columnsFromDrag(5, 500, columnWidth), 10);
	});
});
