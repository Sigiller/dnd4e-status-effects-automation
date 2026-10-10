/** @module dnd4e-status-effects-automation/tests/statuses */

import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

import { NUMERIC_STATUS_DATA, STATE_STATUSES } from "../scripts/config.mjs";
import {
	buildHudEffectData,
	hydrateStatusEffects,
	registerMissingNumericStatuses,
	resolveDurationType
} from "../scripts/statuses.mjs";

/** Minimal stand-in for the v14 CONFIG.statusEffects proxy (array indexed by position and id). */
function statusList(entries) {
	const list = new Proxy([], {
		set(target, prop, value) {
			target[prop] = value;
			if (Number.isInteger(Number(prop)) && value?.id) target[value.id] = value;
			return true;
		}
	});
	for (const entry of entries) list.push(entry);
	return list;
}

function legacy(id) {
	return { name: `EFFECT.${id}`, img: `systems/dnd4e/icons/statusEffects/${id}.svg`, description: `EFFECTDESC.${id}` };
}

beforeEach(() => {
	globalThis.foundry = {
		utils: {
			deepClone: structuredClone,
			mergeObject: (original, other) => Object.assign(original, other)
		}
	};
	globalThis.dnd4e = {
		applications: {
			apps: {
				CustomStatusConfig: {
					LEGACY_STATUSES: Object.fromEntries(Object.keys(NUMERIC_STATUS_DATA).map(id => [id, legacy(id)]))
				}
			}
		}
	};
	globalThis.CONFIG = {
		statusEffects: statusList([{ id: "dazed", name: "EFFECT.statusDazed" }]),
		DND4E: { statusEffect: { dazed: { name: "EFFECT.statusDazed" } } }
	};
});

afterEach(() => {
	for (const key of ["foundry", "dnd4e", "CONFIG", "game", "getDocumentClass"]) delete globalThis[key];
});

describe("resolveDurationType", () => {
	it("defaults conditions to save ends", () => {
		assert.equal(resolveDurationType("dazed", "default"), "saveEnd");
		assert.equal(resolveDurationType("attack_down", "default"), "saveEnd");
	});

	it("defaults state statuses to no duration", () => {
		for (const id of ["dead", "bloodied", "prone", "mark"]) {
			assert.ok(STATE_STATUSES.has(id));
			assert.equal(resolveDurationType(id, "default"), "");
		}
	});

	it("lets an explicit choice override the default", () => {
		assert.equal(resolveDurationType("prone", "endOfTargetTurn"), "endOfTargetTurn");
		assert.equal(resolveDurationType("dazed", "none"), "");
	});
});

describe("registerMissingNumericStatuses", () => {
	it("adds every numeric status from the system's legacy definitions", () => {
		registerMissingNumericStatuses();
		for (const id of Object.keys(NUMERIC_STATUS_DATA)) {
			assert.equal(CONFIG.statusEffects[id]?.img, legacy(id).img);
			assert.equal(CONFIG.DND4E.statusEffect[id]?.name, legacy(id).name);
		}
	});

	it("keeps statuses the GM already restored", () => {
		const restored = { id: "regen", name: "Custom Regen", img: "custom.svg" };
		CONFIG.statusEffects.push(restored);
		registerMissingNumericStatuses();
		assert.equal(CONFIG.statusEffects.filter(s => s.id === "regen").length, 1);
		assert.equal(CONFIG.statusEffects.regen, restored);
	});
});

describe("hydrateStatusEffects", () => {
	it("attaches default changes and dots to numeric statuses", () => {
		registerMissingNumericStatuses();
		hydrateStatusEffects();
		assert.deepEqual(CONFIG.statusEffects.attack_down.system.changes.map(c => [c.key, c.value]),
			[["system.modifiers.attack.untyped", "-2"]]);
		assert.deepEqual(CONFIG.statusEffects.defUp.system.changes.map(c => [c.key, c.value]),
			[["system.modifiers.defences.untyped", "2"]]);
		assert.deepEqual(CONFIG.statusEffects.ongoing_1.system.dots, [{ amount: "5*@tier", types: [] }]);
		assert.deepEqual(CONFIG.statusEffects.regen.system.dots, [{ amount: "5", types: ["healing"] }]);
	});

	it("does not give statuses a duration", () => {
		registerMissingNumericStatuses();
		hydrateStatusEffects();
		assert.equal(CONFIG.statusEffects.attack_down.system.durationType, undefined);
		assert.equal(CONFIG.statusEffects.dazed.system, undefined);
	});
});

describe("buildHudEffectData", () => {
	const actor = { uuid: "Actor.target" };

	beforeEach(() => {
		globalThis.getDocumentClass = () => ({
			async fromStatusEffect(statusId) {
				const data = { name: statusId, statuses: [statusId], system: {} };
				return {
					updateSource(updates) {
						for (const [path, value] of Object.entries(updates)) {
							const keys = path.split(".");
							const last = keys.pop();
							let node = data;
							for (const key of keys) node = node[key] ??= {};
							node[last] = value;
						}
					},
					toObject: () => structuredClone(data)
				};
			}
		});
		globalThis.game = { combat: { combatant: { actor: { uuid: "Actor.current" } } } };
	});

	it("applies the resolved duration type", async () => {
		const data = await buildHudEffectData(actor, "dazed", "default", false);
		assert.equal(data.system.durationType, "saveEnd");
		assert.equal(data.origin, undefined);
		assert.equal(data.flags, undefined);
	});

	it("uses the current combatant as origin for user-turn durations", async () => {
		const data = await buildHudEffectData(actor, "dazed", "endOfUserTurn", false);
		assert.equal(data.origin, "Actor.current");
	});

	it("falls back to the target as origin outside combat", async () => {
		globalThis.game = { combat: null };
		const data = await buildHudEffectData(actor, "dazed", "startOfUserTurn", false);
		assert.equal(data.origin, "Actor.target");
	});

	it("marks right-click applications as overlays", async () => {
		const data = await buildHudEffectData(actor, "stunned", "default", true);
		assert.equal(data.flags.core.overlay, true);
	});
});
