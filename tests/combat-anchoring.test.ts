import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { TURN_BASED_DURATIONS, anchoredRounds, needsAnchor } from "../src/combat-anchoring.js";

describe("needsAnchor", () => {
  it("anchors effects without a start combatant", () => {
    assert.equal(needsAnchor(undefined, "c1", "b"), true);
    assert.equal(needsAnchor({ combat: "c1", combatant: null }, "c1", "b"), true);
  });

  it("anchors effects anchored to another combat", () => {
    assert.equal(needsAnchor({ combat: "old", combatant: "b" }, "c1", "b"), true);
  });

  it("re-anchors effects anchored to a different combatant of this combat", () => {
    assert.equal(needsAnchor({ combat: "c1", combatant: "a" }, "c1", "b"), true);
  });

  it("leaves effects already anchored to the right combatant", () => {
    assert.equal(needsAnchor({ combat: "c1", combatant: "b" }, "c1", "b"), false);
  });
});

describe("anchoredRounds", () => {
  it("ends at every creature's first turn when the combat starts", () => {
    assert.equal(anchoredRounds(0, 0, true), 0);
    assert.equal(anchoredRounds(2, 0, true), 0);
  });

  it("ends this round when a joining creature's turn is still ahead", () => {
    assert.equal(anchoredRounds(3, 1, false), 0);
  });

  it("ends next round when a joining creature's turn has passed", () => {
    assert.equal(anchoredRounds(0, 2, false), 1);
    assert.equal(anchoredRounds(2, 2, false), 1);
  });
});

describe("TURN_BASED_DURATIONS", () => {
  it("covers the target- and user-turn durations only", () => {
    assert.deepEqual(
      [...TURN_BASED_DURATIONS].sort(),
      ["endOfTargetTurn", "endOfUserCurrent", "endOfUserTurn", "startOfTargetTurn", "startOfUserTurn"]
    );
  });
});
