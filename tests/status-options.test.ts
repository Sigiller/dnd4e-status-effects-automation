import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { normalizeStatusOptions } from "../src/status-options.js";
import { builtinDefaultDuration, defaultDuration, resolveDurationType } from "../src/statuses.js";

const DURATION_TYPES = ["saveEnd", "endOfTargetTurn", "endOfEncounter", "endOfDay", "custom"];

describe("normalizeStatusOptions", () => {
	it("returns empty options for a missing or malformed value", () => {
		for (const raw of [undefined, null, "x", { hidden: "dazed", durations: 3 }]) {
			const { hidden, durations } = normalizeStatusOptions(raw, DURATION_TYPES);
			assert.equal(hidden.size, 0);
			assert.deepEqual(durations, {});
		}
	});

	it("keeps hidden ids and valid durations, dropping unknown durations", () => {
		const { hidden, durations } = normalizeStatusOptions({
			hidden: ["torch", 5, "ammo_count"],
			durations: { dazed: "endOfTargetTurn", mark: "none", slowed: "bogus" }
		}, DURATION_TYPES);
		assert.deepEqual([...hidden], ["torch", "ammo_count"]);
		assert.deepEqual(durations, { dazed: "endOfTargetTurn", mark: "none" });
	});
});

describe("defaultDuration with settings", () => {
	it("falls back to the built-in default without an override", () => {
		assert.equal(defaultDuration("dazed"), builtinDefaultDuration("dazed"));
		assert.equal(defaultDuration("mark"), "");
	});

	it("uses the configured default", () => {
		assert.equal(defaultDuration("dazed", { dazed: "endOfTargetTurn" }), "endOfTargetTurn");
		assert.equal(defaultDuration("dazed", { dazed: "none" }), "");
		assert.equal(defaultDuration("mark", { mark: "endOfEncounter" }), "endOfEncounter");
	});

	it("never gives a duration to locked statuses, even when configured", () => {
		assert.equal(defaultDuration("prone", { prone: "saveEnd" }), "");
		assert.equal(resolveDurationType("regen", "default", { regen: "endOfEncounter" }), "");
	});

	it("applies the configured default only to the HUD's Default choice", () => {
		const overrides = { dazed: "endOfEncounter" };
		assert.equal(resolveDurationType("dazed", "default", overrides), "endOfEncounter");
		assert.equal(resolveDurationType("dazed", "saveEnd", overrides), "saveEnd");
		assert.equal(resolveDurationType("dazed", "none", overrides), "");
	});
});
