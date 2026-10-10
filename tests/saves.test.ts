import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { rollsSavesAutomatically, shouldResolveSaveExpiry } from "../src/saves.js";

describe("shouldResolveSaveExpiry", () => {
	it("lets the active GM resolve saves relayed from players", () => {
		assert.equal(shouldResolveSaveExpiry({ isActiveGM: true, isGM: true, rolledLocally: false }), true);
	});

	it("lets a non-active GM resolve the save they rolled themselves", () => {
		assert.equal(shouldResolveSaveExpiry({ isActiveGM: false, isGM: true, rolledLocally: true }), true);
	});

	it("keeps other GMs from also deleting a relayed save", () => {
		assert.equal(shouldResolveSaveExpiry({ isActiveGM: false, isGM: true, rolledLocally: false }), false);
	});

	it("never resolves on a player client", () => {
		assert.equal(shouldResolveSaveExpiry({ isActiveGM: false, isGM: false, rolledLocally: true }), false);
	});
});

describe("rollsSavesAutomatically", () => {
	it("keeps the save dialog for player characters", () => {
		assert.equal(rollsSavesAutomatically("Player Character"), false);
	});

	it("auto-rolls for NPCs and hazards", () => {
		assert.equal(rollsSavesAutomatically("NPC"), true);
		assert.equal(rollsSavesAutomatically("Hazard"), true);
	});
});
