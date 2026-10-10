import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildStatusRows, resetStatusRows, rowsToStatusOptions } from "../src/settings/status-rows.js";
import type { Dnd4eStatusEffect } from "../src/types/dnd4e.js";

const STATUSES: Dnd4eStatusEffect[] = [
  { id: "prone", name: "Prone", img: "prone.svg" },
  { id: "dazed", name: "Dazed", img: "dazed.svg" },
  { id: "mark", name: "Marked", img: "mark.svg" },
  { id: "dazed", name: "Dazed duplicate", img: "dazed.svg" },
  { id: "secret", name: "Secret", img: "secret.svg", hud: false },
];

const localizeName = (name: string) => name;

describe("buildStatusRows", () => {
  it("lists each HUD status once, sorted by name, with effective defaults", () => {
    const rows = buildStatusRows(STATUSES, { hidden: new Set(["mark"]), durations: { dazed: "endOfEncounter" }, values: {} }, localizeName);
    assert.deepEqual(
      rows.map((row) => [row.id, row.visible, row.locked, row.duration]),
      [
        ["dazed", true, false, "endOfEncounter"],
        ["mark", false, false, "none"],
        ["prone", true, true, "none"],
      ]
    );
  });

  it("ignores stored durations for locked statuses", () => {
    const rows = buildStatusRows(STATUSES, { hidden: new Set(), durations: { prone: "saveEnd" }, values: {} }, localizeName);
    assert.equal(rows.find((row) => row.id === "prone")?.duration, "none");
  });
});

describe("rowsToStatusOptions", () => {
  it("stores hidden statuses and only durations that differ from the built-in default", () => {
    const rows = buildStatusRows(STATUSES, { hidden: new Set(), durations: {}, values: {} }, localizeName).map((row) =>
      row.id === "dazed" ? { ...row, duration: "endOfTargetTurn", visible: false } : row
    );
    const { hidden, durations } = rowsToStatusOptions(rows);
    assert.deepEqual([...hidden], ["dazed"]);
    assert.deepEqual(durations, { dazed: "endOfTargetTurn" });
  });

  it("stores nothing for rows at their defaults", () => {
    const rows = buildStatusRows(STATUSES, { hidden: new Set(), durations: {}, values: {} }, localizeName);
    const { hidden, durations } = rowsToStatusOptions(rows);
    assert.equal(hidden.size, 0);
    assert.deepEqual(durations, {});
  });
});

describe("resetStatusRows", () => {
  it("restores visibility and built-in durations", () => {
    const rows = buildStatusRows(STATUSES, { hidden: new Set(["dazed", "mark"]), durations: { dazed: "endOfDay", mark: "saveEnd" }, values: { regen: { step: 3 } } }, localizeName);
    const reset = resetStatusRows(rows);
    const { hidden, durations } = rowsToStatusOptions(reset);
    assert.equal(hidden.size, 0);
    assert.deepEqual(durations, {});
  });
});

describe("status row values", () => {
  const VALUED: Dnd4eStatusEffect[] = [
    { id: "attack_down", name: "Attack Down", img: "a.svg" },
    { id: "regen", name: "Regeneration", img: "r.svg" },
    { id: "dazed", name: "Dazed", img: "d.svg" },
  ];

  it("gives valued rows their effective start and step, others none", () => {
    const rows = buildStatusRows(VALUED, { hidden: new Set(), durations: {}, values: { regen: { step: 3 } } }, localizeName);
    assert.deepEqual(rows.map((row) => [row.id, row.value]), [
      ["attack_down", { start: 1, step: 1 }],
      ["dazed", null],
      ["regen", { start: 5, step: 3 }],
    ]);
  });

  it("stores only start/step that differ from the built-in values", () => {
    const rows = buildStatusRows(VALUED, { hidden: new Set(), durations: {}, values: {} }, localizeName).map((row) =>
      row.id === "attack_down" ? { ...row, value: { start: 2, step: 1 } } : row
    );
    assert.deepEqual(rowsToStatusOptions(rows).values, { attack_down: { start: 2 } });
  });

  it("reset restores built-in start and step", () => {
    const rows = buildStatusRows(VALUED, { hidden: new Set(), durations: {}, values: { regen: { start: 9 } } }, localizeName);
    assert.deepEqual(rowsToStatusOptions(resetStatusRows(rows)).values, {});
  });
});
