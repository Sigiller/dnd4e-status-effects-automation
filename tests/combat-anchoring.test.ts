import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { TURN_BASED_DURATIONS, anchorActorEffects, anchoredRounds, needsAnchor } from "../src/combat-anchoring.js";
import { clearGlobals, setGlobal } from "./helpers/globals.js";

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

  it("ends 'End of Current Turn' with the anchor's current turn", () => {
    assert.equal(anchoredRounds(2, 2, false, true), 0);
    assert.equal(anchoredRounds(0, 2, false, true), 1);
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

interface MockEffect {
  id: string;
  origin?: string;
  system: { durationType: string };
  _source: { start?: { combat?: string | null; combatant?: string | null } };
}

describe("anchorActorEffects", () => {
  const actorA = { name: "A", documentName: "Actor" };
  const combatantIds = new Map<object, string>([[actorA, "cA"]]);
  let updateCalls: Record<string, unknown>[][];

  function mockActor(effects: MockEffect[]) {
    const actor = {
      effects,
      updateEmbeddedDocuments: (_name: string, updates: Record<string, unknown>[]) => {
        updateCalls.push(updates);
        return Promise.resolve([]);
      },
    };
    combatantIds.set(actor, "cB");
    return actor;
  }

  const combat = {
    id: "c1",
    turns: [{ id: "cA" }, { id: "cB" }, { id: "cC" }],
    getCombatantsByActor: (actor: object) => {
      const id = combatantIds.get(actor);
      return id ? [{ id }] : [];
    },
  };

  function effect(id: string, durationType: string, extra: Partial<MockEffect> = {}): MockEffect {
    return { id, system: { durationType }, _source: {}, ...extra };
  }

  const run = (actor: object, context: { round: number; turn: number; starting: boolean }) =>
    anchorActorEffects(combat as unknown as Combat.Implementation, actor as unknown as Actor.Implementation, context);

  beforeEach(() => {
    updateCalls = [];
    setGlobal("fromUuidSync", (uuid: string) => (uuid === "Actor.A" ? actorA : null));
  });

  afterEach(() => {
    clearGlobals("fromUuidSync");
  });

  it("anchors unanchored effects at combat start in one batched update", async () => {
    const actor = mockActor([effect("e1", "endOfTargetTurn"), effect("e2", "startOfTargetTurn"), effect("e3", "saveEnd")]);
    await run(actor, { round: 1, turn: 0, starting: true });
    assert.equal(updateCalls.length, 1);
    assert.deepEqual(updateCalls[0], [
      { _id: "e1", start: { combat: "c1", combatant: "cB", round: 1, turn: 0 }, duration: { value: 0, units: "rounds" } },
      { _id: "e2", start: { combat: "c1", combatant: "cB", round: 1, turn: 0 }, duration: { value: 0, units: "rounds" } },
    ]);
  });

  it("anchors user-turn durations to the origin creature", async () => {
    const actor = mockActor([effect("e1", "endOfUserTurn", { origin: "Actor.A" })]);
    await run(actor, { round: 1, turn: 0, starting: true });
    assert.equal((updateCalls[0]?.[0]?.start as { combatant: string }).combatant, "cA");
  });

  it("gives joiners one round when their turn has passed, none when it is ahead", async () => {
    const actor = mockActor([effect("e1", "endOfTargetTurn")]);
    await run(actor, { round: 2, turn: 2, starting: false });
    assert.equal((updateCalls[0]?.[0]?.duration as { value: number }).value, 1);
    updateCalls = [];
    await run(actor, { round: 2, turn: 0, starting: false });
    assert.equal((updateCalls[0]?.[0]?.duration as { value: number }).value, 0);
  });

  it("ends a joiner's 'End of Current Turn' with the current combatant's turn", async () => {
    const actor = mockActor([effect("e1", "endOfUserCurrent", { origin: "Actor.A" })]);
    await run(actor, { round: 1, turn: 0, starting: false });
    assert.deepEqual(updateCalls[0]?.[0]?.duration, { value: 0, units: "rounds" });
  });

  it("leaves effects already anchored to the right combatant", async () => {
    const actor = mockActor([effect("e1", "endOfTargetTurn", { _source: { start: { combat: "c1", combatant: "cB" } } })]);
    await run(actor, { round: 1, turn: 0, starting: true });
    assert.equal(updateCalls.length, 0);
  });
});
