/**
 * Anchor turn-based dnd4e durations to the right combatant when the effect predates the combat turn order.
 *
 * ActiveEffect4e#_preCreate only anchors "end/start of target's/user's next turn" effects (start.combatant plus the
 * off-by-one decrement) when the effect is created while a combat is running. An effect created before the combat
 * starts, or on a creature that joins a running combat, has no anchor. Core then counts its single round from the
 * round the creature joined, so it ends one round late. Here such effects are anchored when the combat starts and when
 * a combatant joins.
 */
import { USER_TURN_DURATIONS } from "./config.js";
import { getEffectSystem } from "./types/dnd4e.js";

const TARGET_TURN_DURATIONS: ReadonlySet<string> = new Set(["endOfTargetTurn", "startOfTargetTurn"]);

/** dnd4e durations measured in the turns of a specific creature. */
export const TURN_BASED_DURATIONS: ReadonlySet<string> = new Set([...TARGET_TURN_DURATIONS, ...USER_TURN_DURATIONS]);

export interface EffectStartSource {
  combat?: string | null;
  combatant?: string | null;
}

/**
 * Whether an effect must be (re)anchored: it has no anchor in this combat, or it is anchored to a combatant other
 * than the one whose turns it is measured in (core anchors effects on creatures outside the combat to whoever's
 * turn it was).
 */
export function needsAnchor(
  start: EffectStartSource | null | undefined,
  combatId: string,
  anchorCombatantId: string
): boolean {
  return start?.combat !== combatId || start.combatant !== anchorCombatantId;
}

/**
 * Rounds left for an effect that should end at the anchor creature's next turn.
 * @param anchorTurn The anchor combatant's position in the turn order
 * @param currentTurn The combat's current turn
 * @param starting Whether the combat is starting (every creature's first turn is still ahead)
 */
export function anchoredRounds(anchorTurn: number, currentTurn: number, starting: boolean): number {
  if (starting) return 0;
  return anchorTurn > currentTurn ? 0 : 1;
}

/** The actor an effect's origin points at (an Actor, or the owner of an Item). */
function originActor(effect: ActiveEffect.Implementation): Actor.Implementation | null {
  if (!effect.origin) return null;
  const origin = fromUuidSync(effect.origin) as { documentName?: string; actor?: Actor.Implementation | null } | null;
  if (!origin) return null;
  if (origin.documentName === "Actor") return origin as unknown as Actor.Implementation;
  return origin.actor ?? null;
}

function combatantFor(combat: Combat.Implementation, actor: Actor.Implementation | null): Combatant.Implementation | undefined {
  if (!actor) return undefined;
  return combat.getCombatantsByActor(actor as Actor.Stored)[0];
}

interface AnchorContext {
  round: number;
  turn: number;
  starting: boolean;
}

async function anchorActorEffects(
  combat: Combat.Implementation,
  actor: Actor.Implementation,
  { round, turn, starting }: AnchorContext
): Promise<void> {
  const combatId = combat.id;
  if (!combatId) return;
  for (const effect of actor.effects) {
    const durationType = getEffectSystem(effect).durationType;
    if (!TURN_BASED_DURATIONS.has(durationType)) continue;
    const anchorActor = USER_TURN_DURATIONS.has(durationType) ? (originActor(effect) ?? actor) : actor;
    const anchor = combatantFor(combat, anchorActor) ?? combatantFor(combat, actor);
    // Combatant#turnNumber is only assigned once the combat has a current turn, so use the sorted turn order.
    const anchorTurn = anchor ? combat.turns.findIndex((combatant) => combatant.id === anchor.id) : -1;
    if (!anchor?.id || anchorTurn < 0) continue;
    const start = (effect._source as { start?: EffectStartSource | null }).start;
    if (!needsAnchor(start, combatId, anchor.id)) continue;
    await effect.update({
      start: { combat: combatId, combatant: anchor.id, round, turn },
      duration: { value: anchoredRounds(anchorTurn, turn, starting), units: "rounds" },
    } as never);
  }
}

function uniqueActors(combatants: Iterable<Combatant.Implementation>): Actor.Implementation[] {
  const actors = new Set<Actor.Implementation>();
  for (const combatant of combatants) {
    if (combatant.actor) actors.add(combatant.actor);
  }
  return [...actors];
}

/** Anchor every combatant's unanchored turn-based effects to the turn order the combat is about to start with. */
async function anchorOnCombatStart(combat: Combat.Implementation): Promise<void> {
  for (const actor of uniqueActors(combat.combatants)) {
    await anchorActorEffects(combat, actor, { round: 1, turn: 0, starting: true });
  }
}

/** Combat#startCombat as a `this`-typed property, since the wrapper takes it off the prototype. */
interface StartCombatHost {
  startCombat: (this: Combat.Implementation) => Promise<unknown>;
}

function wrapStartCombat(): void {
  const prototype = CONFIG.Combat.documentClass.prototype as unknown as StartCombatHost;
  const startCombat = prototype.startCombat;
  prototype.startCombat = async function (this: Combat.Implementation) {
    // Anchor before the combat update: core fires the first combatant's turn-start expiry during that update.
    if (game.user?.isGM) await anchorOnCombatStart(this);
    return startCombat.call(this);
  };
}

function onCreateCombatant(combatant: Combatant.Implementation, _options: unknown, userId: string): void {
  if (userId !== game.user?.id) return;
  // The combat rebuilds its turn order after the createCombatant hooks run (same tick), so wait for it.
  queueMicrotask(() => {
    const combat = combatant.combat;
    const actor = combatant.actor;
    if (!combat?.started || !actor || combat.turn === null) return;
    void anchorActorEffects(combat, actor, { round: combat.round, turn: combat.turn, starting: false });
  });
}

export function registerCombatAnchoring(): void {
  wrapStartCombat();
  Hooks.on("createCombatant", onCreateCombatant);
}
