import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { paletteValues, runStatusClick, type StatusClickContext } from "../src/hud/status-actions.js";
import { clearGlobals, setGlobal } from "./helpers/globals.js";

const FLAG = "dnd4e-status-effects-automation";

interface MockEffect {
  id: string;
  name: string;
  statuses: Set<string>;
  flags: Record<string, Record<string, unknown>>;
  system: { changes: { key: string; value: unknown }[]; dots: { amount: unknown; types: string[] }[] };
  update: (data: Record<string, unknown>) => Promise<void>;
  getFlag: (scope: string, key: string) => unknown;
}

let updates: [string, Record<string, unknown>][];
let deleted: string[][];
let created: boolean[];

function effect(id: string, status: string, extra: Partial<Pick<MockEffect, "name" | "flags" | "system">> = {}): MockEffect {
  const e: MockEffect = {
    id,
    name: extra.name ?? status,
    statuses: new Set([status]),
    flags: extra.flags ?? {},
    system: extra.system ?? { changes: [], dots: [] },
    update: (data) => {
      updates.push([id, data]);
      return Promise.resolve();
    },
    getFlag: (scope, key) => e.flags[scope]?.[key],
  };
  return e;
}

function actorWith(...effects: MockEffect[]) {
  const actor = {
    effects: {
      get: (id: string) => effects.find((e) => e.id === id),
      filter: (fn: (e: MockEffect) => boolean) => effects.filter(fn),
    },
    deleteEmbeddedDocuments: (_name: string, ids: string[]) => {
      deleted.push(ids);
      return Promise.resolve([]);
    },
  };
  return actor as unknown as Actor.Implementation;
}

const attackDown = (value: number) => ({
  flags: { [FLAG]: { value } },
  system: { changes: [{ key: "system.modifiers.attack.untyped", value: String(-value) }], dots: [] },
});

function ctx(button: number, extra: Partial<StatusClickContext> = {}): StatusClickContext {
  return {
    button,
    shift: false,
    overrides: {},
    baseName: "Attack Down",
    create: (overlay) => {
      created.push(overlay);
      return Promise.resolve();
    },
    ...extra,
  };
}

beforeEach(() => {
  updates = [];
  deleted = [];
  created = [];
  setGlobal("CONFIG", { statusEffects: {} });
});

afterEach(() => {
  clearGlobals("CONFIG");
});

describe("runStatusClick", () => {
  it("raises a managed value by its step", async () => {
    const actor = actorWith(effect("e1", "attack_down", attackDown(2)));
    assert.deepEqual(await runStatusClick(actor, "attack_down", ctx(0)), { type: "setValue", value: 3 });
    assert.equal(updates[0]?.[1].name, "Attack Down −3");
  });

  it("leaves power effects with other changes alone: left does nothing, right removes", async () => {
    const hex = effect("e1", "attack_down", {
      name: "Hex",
      system: { changes: [{ key: "power.attack.global.untyped", value: -2 }, { key: "power.damage.global.untyped", value: -2 }], dots: [] },
    });
    assert.deepEqual(await runStatusClick(actorWith(hex), "attack_down", ctx(0)), { type: "none" });
    assert.equal(updates.length, 0);
    assert.deepEqual(await runStatusClick(actorWith(hex), "attack_down", ctx(2)), { type: "delete" });
    assert.deepEqual(deleted, [["e1"]]);
  });

  it("removes every effect of the status at once", async () => {
    const actor = actorWith(effect("e1", "dazed"), effect("e2", "dazed"), effect("e3", "stunned"));
    await runStatusClick(actor, "dazed", ctx(2));
    assert.deepEqual(deleted, [["e1", "e2"]]);
  });

  it("removes a valued status when lowering reaches 0", async () => {
    await runStatusClick(actorWith(effect("e1", "attack_down", attackDown(1))), "attack_down", ctx(2));
    assert.deepEqual(deleted, [["e1"]]);
  });

  it("creates with or without overlay, and toggles the overlay on an active status", async () => {
    await runStatusClick(actorWith(), "dazed", ctx(0));
    await runStatusClick(actorWith(), "dazed", ctx(0, { shift: true }));
    assert.deepEqual(created, [false, true]);
    await runStatusClick(actorWith(effect("e1", "dazed", { flags: { core: { overlay: true } } })), "dazed", ctx(0, { shift: true }));
    assert.deepEqual(updates, [["e1", { "flags.core.overlay": false }]]);
  });

  it("reads older formula amounts through the evaluator before stepping", async () => {
    const legacy = effect("e1", "ongoing_1", { system: { changes: [], dots: [{ amount: "5*@tier", types: [] }] } });
    const action = await runStatusClick(actorWith(legacy), "ongoing_1", ctx(0, { evaluate: () => 10, baseName: "Ongoing Effect (1)" }));
    assert.deepEqual(action, { type: "setValue", value: 15 });
  });
});

describe("paletteValues", () => {
  it("shows the first effect's value (the one clicks change) and skips unmanaged effects", () => {
    const actor = actorWith(
      effect("e1", "attack_down", { ...attackDown(1), name: "Attack Down −1" }),
      effect("e2", "attack_down", { ...attackDown(3), name: "Attack Down −3" }),
      effect("e3", "defUp", { system: { changes: [{ key: "power.defence.global.untyped", value: 2 }], dots: [] } })
    );
    assert.deepEqual(paletteValues(actor, {}), { attack_down: { text: "−1", label: "Attack Down −1" } });
  });
});
