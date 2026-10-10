import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { NO_DURATION_STATUSES, STATE_STATUSES } from "../src/config.js";
import { VALUED_STATUSES } from "../src/values.js";
import {
  buildHudEffectData,
  hydrateStatusEffects,
  registerMissingNumericStatuses,
  resolveDurationType,
} from "../src/statuses.js";
import type { Dnd4eStatusDefinition, Dnd4eStatusEffect } from "../src/types/dnd4e.js";
import { clearGlobals, setGlobal } from "./helpers/globals.js";

type StatusList = Dnd4eStatusEffect[] & Record<string, Dnd4eStatusEffect | undefined>;

/** Minimal stand-in for the v14 CONFIG.statusEffects proxy (array indexed by position and id). */
function statusList(entries: Dnd4eStatusEffect[]): StatusList {
  const list = new Proxy([] as unknown as StatusList, {
    set(target, prop, value: Dnd4eStatusEffect) {
      Reflect.set(target, prop, value);
      if (Number.isInteger(Number(prop)) && value.id) Reflect.set(target, value.id, value);
      return true;
    },
  });
  for (const entry of entries) list.push(entry);
  return list;
}

function legacy(id: string): Dnd4eStatusDefinition {
  return { name: `EFFECT.${id}`, img: `systems/dnd4e/icons/statusEffects/${id}.svg`, description: `EFFECTDESC.${id}` };
}

interface TestConfig {
  statusEffects: StatusList;
  DND4E: { statusEffect: Record<string, Dnd4eStatusDefinition> };
}

let config: TestConfig;

function status(id: string): Dnd4eStatusEffect {
  const entry = config.statusEffects[id];
  assert.ok(entry, `status ${id} registered`);
  return entry;
}

beforeEach(() => {
  setGlobal("foundry", {
    utils: {
      deepClone: structuredClone,
      mergeObject: (original: object, other: object) => Object.assign(original, other),
    },
  });
  setGlobal("dnd4e", {
    applications: {
      apps: {
        CustomStatusConfig: {
          LEGACY_STATUSES: Object.fromEntries(Object.keys(VALUED_STATUSES).map((id) => [id, legacy(id)])),
        },
      },
    },
  });
  config = {
    statusEffects: statusList([{ id: "dazed", name: "EFFECT.statusDazed", img: "dazed.svg" }]),
    DND4E: { statusEffect: { dazed: { name: "EFFECT.statusDazed", img: "dazed.svg" } } },
  };
  setGlobal("CONFIG", config);
});

afterEach(() => {
  clearGlobals("foundry", "dnd4e", "CONFIG", "game", "getDocumentClass");
});

describe("resolveDurationType", () => {
  it("defaults conditions to save ends", () => {
    assert.equal(resolveDurationType("dazed", "default"), "saveEnd");
    assert.equal(resolveDurationType("ongoing_1", "default"), "saveEnd");
  });

  it("uses the built-in per-status defaults", () => {
    const expected: Record<string, string> = {
      attack_down: "endOfTargetTurn",
      attack_up: "endOfTargetTurn",
      defDown: "endOfUserTurn",
      defUp: "endOfTargetTurn",
      grantingCA: "endOfTargetTurn",
      immobilized: "endOfTargetTurn",
      insubstantial: "endOfUserTurn",
      invisible: "endOfUserTurn",
      curse: "",
      disarmed: "",
      drunk: "",
      grabbed: "",
      helpless: "",
      oath: "",
    };
    for (const [id, duration] of Object.entries(expected)) {
      assert.equal(resolveDurationType(id, "default"), duration, id);
    }
  });

  it("defaults state statuses to no duration", () => {
    for (const id of ["mark", "cover", "helpless", "unconscious"]) {
      assert.ok(STATE_STATUSES.has(id));
      assert.equal(resolveDurationType(id, "default"), "");
    }
  });

  it("lets an explicit choice override the default", () => {
    assert.equal(resolveDurationType("mark", "endOfUserTurn"), "endOfUserTurn");
    assert.equal(resolveDurationType("unconscious", "saveEnd"), "saveEnd");
    assert.equal(resolveDurationType("dazed", "none"), "");
  });

  it("never gives a duration to statuses that end through game state or actions", () => {
    for (const id of ["prone", "dead", "dying", "bloodied", "regen", "running", "charging", "flying"]) {
      assert.ok(NO_DURATION_STATUSES.has(id));
      for (const choice of ["default", "saveEnd", "endOfTargetTurn", "endOfUserTurn", "endOfEncounter", "endOfDay"]) {
        assert.equal(resolveDurationType(id, choice), "", `${id} with ${choice}`);
      }
    }
  });
});

describe("registerMissingNumericStatuses", () => {
  it("adds every numeric status from the system's legacy definitions", () => {
    registerMissingNumericStatuses();
    for (const id of Object.keys(VALUED_STATUSES)) {
      assert.equal(status(id).img, legacy(id).img);
      assert.equal(config.DND4E.statusEffect[id]?.name, legacy(id).name);
    }
  });

  it("keeps statuses the GM already restored", () => {
    const restored = { id: "regen", name: "Custom Regen", img: "custom.svg" };
    config.statusEffects.push(restored);
    registerMissingNumericStatuses();
    assert.equal(config.statusEffects.filter((entry) => entry.id === "regen").length, 1);
    assert.equal(config.statusEffects.regen, restored);
  });
});

describe("hydrateStatusEffects", () => {
  it("attaches changes and dots at the built-in start values", () => {
    registerMissingNumericStatuses();
    hydrateStatusEffects();
    assert.deepEqual(
      status("attack_down").system?.changes?.map((change) => [change.key, change.value]),
      [["system.modifiers.attack.untyped", "-1"]]
    );
    assert.deepEqual(
      status("defUp").system?.changes?.map((change) => [change.key, change.value]),
      [["system.modifiers.defences.untyped", "1"]]
    );
    assert.deepEqual(status("ongoing_1").system?.dots, [{ amount: "5", types: [] }]);
    assert.deepEqual(status("regen").system?.dots, [{ amount: "5", types: ["healing"] }]);
  });

  it("uses configured start values", () => {
    registerMissingNumericStatuses();
    hydrateStatusEffects({ attack_down: { start: 3 }, ongoing_2: { start: 10 } });
    assert.equal(status("attack_down").system?.changes?.[0]?.value, "-3");
    assert.deepEqual(status("ongoing_2").system?.dots, [{ amount: "10", types: [] }]);
  });

  it("does not give statuses a duration", () => {
    registerMissingNumericStatuses();
    hydrateStatusEffects();
    assert.equal((status("attack_down").system as Record<string, unknown>).durationType, undefined);
    assert.equal(status("dazed").system, undefined);
  });
});

describe("buildHudEffectData", () => {
  const actor = { uuid: "Actor.target" } as unknown as Actor.Implementation;

  interface EffectData {
    name: string;
    system: { durationType?: string; changes?: { value: string }[]; dots?: { amount: string }[] };
    origin?: string;
    flags?: { core: { overlay: boolean } };
  }

  beforeEach(() => {
    setGlobal("getDocumentClass", () => ({
      fromStatusEffect(statusId: string) {
        const data: Record<string, unknown> = { name: statusId, statuses: [statusId], system: {} };
        return Promise.resolve({
          name: statusId,
          updateSource(updates: Record<string, unknown>) {
            for (const [path, value] of Object.entries(updates)) {
              const keys = path.split(".");
              const last = keys.pop() ?? path;
              let node = data;
              for (const key of keys) node = (node[key] ??= {}) as Record<string, unknown>;
              node[last] = value;
            }
          },
          toObject: () => structuredClone(data),
        });
      },
    }));
    setGlobal("game", { combat: { started: true, combatant: { actor: { uuid: "Actor.current" } } } });
  });

  it("applies the resolved duration type", async () => {
    const data = (await buildHudEffectData(actor, "dazed", "default", false)) as EffectData;
    assert.equal(data.system.durationType, "saveEnd");
    assert.equal(data.origin, undefined);
    assert.equal(data.flags, undefined);
  });

  it("uses the current combatant as origin for user-turn durations", async () => {
    const data = (await buildHudEffectData(actor, "dazed", "endOfUserTurn", false)) as EffectData;
    assert.equal(data.origin, "Actor.current");
  });

  it("ignores the combatant of a combat that hasn't started", async () => {
    setGlobal("game", { combat: { started: false, combatant: { actor: { uuid: "Actor.current" } } } });
    const data = (await buildHudEffectData(actor, "dazed", "endOfUserTurn", false)) as EffectData;
    assert.equal(data.origin, "Actor.target");
  });

  it("falls back to the target as origin outside combat", async () => {
    setGlobal("game", { combat: null });
    const data = (await buildHudEffectData(actor, "dazed", "startOfUserTurn", false)) as EffectData;
    assert.equal(data.origin, "Actor.target");
  });

  it("marks overlay applications", async () => {
    const data = (await buildHudEffectData(actor, "stunned", "default", true)) as EffectData;
    assert.equal(data.flags?.core.overlay, true);
  });

  it("gives valued statuses their start value, name and flag", async () => {
    const data = (await buildHudEffectData(actor, "attack_down", "default", false, {}, { attack_down: { start: 2 } })) as EffectData & {
      flags: Record<string, { value?: number }>;
    };
    assert.equal(data.name, "attack_down \u22122");
    assert.equal(data.system.changes?.[0]?.value, "-2");
    assert.equal(data.flags["dnd4e-status-effects-automation"]?.value, 2);
  });

  it("leaves statuses without a value unchanged", async () => {
    const data = (await buildHudEffectData(actor, "dazed", "default", false)) as EffectData;
    assert.equal(data.name, "dazed");
    assert.equal(data.system.changes, undefined);
  });

  it("uses the configured per-status default", async () => {
    const data = (await buildHudEffectData(actor, "dazed", "default", false, { dazed: "endOfEncounter" })) as EffectData;
    assert.equal(data.system.durationType, "endOfEncounter");
  });
});
