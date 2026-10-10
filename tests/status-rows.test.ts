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
    const rows = buildStatusRows(STATUSES, { hidden: new Set(["mark"]), durations: { dazed: "endOfEncounter" } }, localizeName);
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
    const rows = buildStatusRows(STATUSES, { hidden: new Set(), durations: { prone: "saveEnd" } }, localizeName);
    assert.equal(rows.find((row) => row.id === "prone")?.duration, "none");
  });
});

describe("rowsToStatusOptions", () => {
  it("stores hidden statuses and only durations that differ from the built-in default", () => {
    const rows = buildStatusRows(STATUSES, { hidden: new Set(), durations: {} }, localizeName).map((row) =>
      row.id === "dazed" ? { ...row, duration: "endOfTargetTurn", visible: false } : row
    );
    const { hidden, durations } = rowsToStatusOptions(rows);
    assert.deepEqual([...hidden], ["dazed"]);
    assert.deepEqual(durations, { dazed: "endOfTargetTurn" });
  });

  it("stores nothing for rows at their defaults", () => {
    const rows = buildStatusRows(STATUSES, { hidden: new Set(), durations: {} }, localizeName);
    const { hidden, durations } = rowsToStatusOptions(rows);
    assert.equal(hidden.size, 0);
    assert.deepEqual(durations, {});
  });
});

describe("resetStatusRows", () => {
  it("restores visibility and built-in durations", () => {
    const rows = buildStatusRows(STATUSES, { hidden: new Set(["dazed", "mark"]), durations: { dazed: "endOfDay", mark: "saveEnd" } }, localizeName);
    const reset = resetStatusRows(rows);
    const { hidden, durations } = rowsToStatusOptions(reset);
    assert.equal(hidden.size, 0);
    assert.deepEqual(durations, {});
  });
});
