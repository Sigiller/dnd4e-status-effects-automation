import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decideStatusClick } from "../src/hud/status-click.js";
import { formatValue, isValueManaged, readEffectValue, valueEffectUpdate, valueSettings } from "../src/values.js";

describe("valueSettings", () => {
  it("has the built-in start and step per valued status", () => {
    assert.deepEqual(valueSettings("attack_down"), { start: 1, step: 1 });
    assert.deepEqual(valueSettings("defUp"), { start: 1, step: 1 });
    assert.deepEqual(valueSettings("ongoing_2"), { start: 5, step: 5 });
    assert.deepEqual(valueSettings("regen"), { start: 5, step: 1 });
  });

  it("applies configured overrides field by field", () => {
    assert.deepEqual(valueSettings("attack_up", { attack_up: { step: 2 } }), { start: 1, step: 2 });
  });

  it("returns null for statuses without a value", () => {
    assert.equal(valueSettings("dazed"), null);
  });
});

describe("formatValue / valueEffectUpdate", () => {
  it("signs modifiers and leaves dots plain", () => {
    assert.equal(formatValue("attack_down", 3), "−3");
    assert.equal(formatValue("defUp", 2), "+2");
    assert.equal(formatValue("ongoing_1", 10), "10");
  });

  it("derives name, flag and system data from the value", () => {
    assert.deepEqual(valueEffectUpdate("defDown", 2, "Defense Down"), {
      name: "Defense Down −2",
      "flags.dnd4e-status-effects-automation.value": 2,
      "system.changes": [{ key: "system.modifiers.defences.untyped", type: "add", value: "-2", phase: "initial", priority: null }],
    });
    assert.deepEqual(valueEffectUpdate("regen", 6, "Regeneration"), {
      name: "Regeneration 6",
      "flags.dnd4e-status-effects-automation.value": 6,
      "system.dots": [{ amount: "6", types: ["healing"] }],
    });
  });
});

describe("readEffectValue", () => {
  it("prefers the module flag", () => {
    assert.equal(readEffectValue({ flags: { "dnd4e-status-effects-automation": { value: 4 } } }, "attack_down", 1), 4);
  });

  it("falls back to the change or dot amount for effects without the flag", () => {
    assert.equal(
      readEffectValue({ system: { changes: [{ key: "system.modifiers.attack.untyped", value: "-2" }] } }, "attack_down", 1),
      2
    );
    assert.equal(readEffectValue({ system: { dots: [{ amount: "10" }] } }, "ongoing_1", 5), 10);
  });

  it("evaluates formula amounts when an evaluator is given", () => {
    assert.equal(readEffectValue({ system: { dots: [{ amount: "5*@tier" }] } }, "ongoing_1", 5, () => 10), 10);
    assert.equal(readEffectValue({ system: { dots: [{ amount: "1d6" }] } }, "ongoing_1", 5, () => null), 5);
  });

  it("falls back to the start value when nothing is readable", () => {
    assert.equal(readEffectValue({ system: { dots: [{ amount: "5*@tier" }] } }, "ongoing_1", 5), 5);
    assert.equal(readEffectValue({}, "attack_up", 1), 1);
  });
});

describe("decideStatusClick", () => {
  const valued = { value: 3, step: 1 };

  it("left-click adds an inactive status", () => {
    assert.deepEqual(decideStatusClick({ button: 0, shift: false, active: false, valued: null }), { type: "create", overlay: false });
  });

  it("left-click raises an active valued status and ignores an active plain one", () => {
    assert.deepEqual(decideStatusClick({ button: 0, shift: false, active: true, valued }), { type: "setValue", value: 4 });
    assert.deepEqual(decideStatusClick({ button: 0, shift: false, active: true, valued: null }), { type: "none" });
  });

  it("right-click lowers a valued status and removes it at 0", () => {
    assert.deepEqual(decideStatusClick({ button: 2, shift: false, active: true, valued }), { type: "setValue", value: 2 });
    assert.deepEqual(decideStatusClick({ button: 2, shift: false, active: true, valued: { value: 1, step: 1 } }), { type: "delete" });
    assert.deepEqual(decideStatusClick({ button: 2, shift: false, active: true, valued: { value: 5, step: 5 } }), { type: "delete" });
  });

  it("right-click removes an active plain status and does nothing on an inactive one", () => {
    assert.deepEqual(decideStatusClick({ button: 2, shift: false, active: true, valued: null }), { type: "delete" });
    assert.deepEqual(decideStatusClick({ button: 2, shift: false, active: false, valued }), { type: "none" });
  });

  it("shift+left-click adds as an overlay or toggles the overlay", () => {
    assert.deepEqual(decideStatusClick({ button: 0, shift: true, active: false, valued }), { type: "create", overlay: true });
    assert.deepEqual(decideStatusClick({ button: 0, shift: true, active: true, valued }), { type: "toggleOverlay" });
  });
});

describe("isValueManaged", () => {
  it("accepts flagged effects and the module's own data shape", () => {
    assert.equal(isValueManaged({ flags: { "dnd4e-status-effects-automation": { value: 2 } } }, "attack_down"), true);
    assert.equal(isValueManaged({ system: { changes: [{ key: "system.modifiers.attack.untyped", value: "-1" }] } }, "attack_down"), true);
    assert.equal(isValueManaged({ system: { dots: [{ amount: "5", types: ["healing"] }] } }, "regen"), true);
  });

  it("rejects power effects with other or extra data", () => {
    assert.equal(
      isValueManaged({ system: { changes: [{ key: "system.modifiers.attack.untyped", value: -2 }, { key: "power.damage.global.untyped", value: -2 }] } }, "attack_down"),
      false
    );
    assert.equal(isValueManaged({ system: { dots: [{ amount: "5", types: ["fire"] }] } }, "ongoing_1"), false);
    assert.equal(isValueManaged({}, "dazed"), false);
  });
});
