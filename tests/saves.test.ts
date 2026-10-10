import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { findActorEffect, rollsSavesAutomatically, shouldResolveSaveExpiry } from "../src/saves.js";
import { clearGlobals, setGlobal } from "./helpers/globals.js";

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

describe("findActorEffect", () => {
  const effect = (id: string, owner: string) => ({ id, owner });
  const actorWith = (...effects: { id: string }[]) => ({ effects: new Map(effects.map((e) => [e.id, e])) });

  function install(registry: object[], tokens: object[] = []) {
    setGlobal("foundry", { documents: { ActiveEffect: { registry } } });
    setGlobal("canvas", { scene: { tokens } });
  }

  afterEach(() => {
    clearGlobals("foundry", "canvas");
  });

  it("uses the rolling actor's effect when known", () => {
    const own = effect("e1", "B");
    install([effect("e1", "C")]);
    assert.equal(findActorEffect("e1", actorWith(own) as unknown as Actor.Implementation), own as never);
  });

  it("returns the single registry match", () => {
    const only = effect("e1", "B");
    install([only, effect("e2", "B")]);
    assert.equal(findActorEffect("e1"), only as never);
  });

  it("returns nothing when tokens share the effect id", () => {
    install([effect("e1", "B"), effect("e1", "C")]);
    assert.equal(findActorEffect("e1"), null);
  });

  it("falls back to unlinked tokens on the viewed scene", () => {
    const onToken = effect("e1", "D");
    install([], [{ actorLink: true, actor: actorWith(effect("e1", "PC")) }, { actorLink: false, actor: actorWith(onToken) }]);
    assert.equal(findActorEffect("e1"), onToken as never);
  });
});
