/**
 * Save-ends handling on top of the dnd4e system:
 *
 * 1. Expiry on a successful save. The system calls ActiveEffect.registry.refresh("save") on the client that
 *    rolled (or, for players, on every GM via socket), but core only deletes expired effects on the active GM's
 *    client. With two GMs connected, a save rolled by the non-active GM never removes the effect. Effects on
 *    unlinked combatant tokens are also missing from the registry after a reload, so core can't expire them at
 *    all. The wrapped refresh removes the effect itself on exactly one client.
 * 2. Registry gap after reload. Combatant#actor builds unlinked token actors before core initializes the effect
 *    registry, so their effects are never registered and turn-based durations don't expire. They are registered
 *    on ready.
 * 3. NPC saves roll automatically with the actor's own save bonuses; player characters keep the save dialog.
 */
import { getEffectSystem, isPlayerCharacterType, type Dnd4eActor, type Dnd4eActorMethods } from "./types/dnd4e.js";

interface RefreshContext extends Record<string, unknown> {
  effect?: string;
}

/** The parts of core's ActiveEffectRegistry (v14) used here. */
interface EffectRegistry extends Iterable<ActiveEffect.Implementation> {
  refresh(event: string, context?: RefreshContext): Promise<void>;
  addFromParent(document: Actor.Implementation): unknown;
  has(effect: ActiveEffect.Implementation): boolean;
}

function effectRegistry(): EffectRegistry {
  return (foundry.documents.ActiveEffect as unknown as { registry: EffectRegistry }).registry;
}

/** Effects whose save is being rolled on this client, mapped to the rolling actor. */
const localSaves = new Map<string, Actor.Implementation>();

export interface SaveExpiryState {
  isActiveGM: boolean;
  isGM: boolean;
  rolledLocally: boolean;
}

/**
 * Whether this client is responsible for removing an effect after a successful save.
 * The active GM handles saves relayed from players; a GM who rolled locally handles their own,
 * since that refresh never reaches the active GM.
 */
export function shouldResolveSaveExpiry({ isActiveGM, isGM, rolledLocally }: SaveExpiryState): boolean {
  return isActiveGM || (isGM && rolledLocally);
}

/** Whether end-of-turn saves for this actor type are rolled without a dialog. */
export function rollsSavesAutomatically(actorType: string): boolean {
  return !isPlayerCharacterType(actorType);
}

/**
 * Find the effect a save was rolled against. The rolling actor (known when this client rolled) identifies it
 * directly. Otherwise only the effect id is known: look in the registry (which covers world actors, combatants
 * and materialized tokens), then the viewed scene's unlinked tokens. Unlinked tokens of one base actor can share
 * inherited effect ids, so an id matching more than one effect is ambiguous and nothing is returned.
 */
export function findActorEffect(effectId: string, hintActor?: Actor.Implementation): ActiveEffect.Implementation | null {
  const hinted = hintActor?.effects.get(effectId);
  if (hinted) return hinted;
  const matches = new Set<ActiveEffect.Implementation>();
  for (const effect of effectRegistry()) {
    if (effect.id === effectId) matches.add(effect);
  }
  if (!matches.size) {
    for (const token of canvas?.scene?.tokens ?? []) {
      if (token.actorLink) continue;
      const effect = token.actor?.effects.get(effectId);
      if (effect) matches.add(effect);
    }
  }
  return matches.size === 1 ? ([...matches][0] ?? null) : null;
}

function wrapRegistryRefresh(): void {
  const registry = effectRegistry();
  const refresh = registry.refresh.bind(registry);
  registry.refresh = async (event, context) => {
    const effectId = context?.effect;
    if (event !== "save" || !effectId) return refresh(event, context);
    const rollingActor = localSaves.get(effectId);
    const resolves = shouldResolveSaveExpiry({
      isActiveGM: Boolean(game.users?.activeGM?.isSelf),
      isGM: Boolean(game.user?.isGM),
      rolledLocally: Boolean(rollingActor),
    });
    const effect = resolves ? findActorEffect(effectId, rollingActor) : null;
    await refresh(event, context);
    const parent = effect?.parent as Actor.Implementation | null | undefined;
    if (effect?.id && parent?.effects.has(effect.id)) await effect.delete();
  };
}

function actorPrototype(): Dnd4eActorMethods {
  return CONFIG.Actor.documentClass.prototype as unknown as Dnd4eActorMethods;
}

function wrapRollSave(): void {
  const prototype = actorPrototype();
  const rollSave = prototype.rollSave;
  prototype.rollSave = async function (this: Dnd4eActor, event, form, options) {
    const effectId = options.effectSave ? options.effectId : undefined;
    if (effectId) localSaves.set(effectId, this);
    try {
      return await rollSave.call(this, event, form, options);
    } finally {
      if (effectId) localSaves.delete(effectId);
    }
  };
}

function wrapPromptSaves(): void {
  const prototype = actorPrototype();
  const promptEoTSavesSocket = prototype.promptEoTSavesSocket;
  prototype.promptEoTSavesSocket = async function (this: Dnd4eActor) {
    if (!rollsSavesAutomatically(String(this.type))) return promptEoTSavesSocket.call(this);
    if (!game.settings?.get("dnd4e", "saveReminders")) return;
    const saveEnds = this.effects.filter((effect) => getEffectSystem(effect).durationType === "saveEnd");
    for (const effect of saveEnds) {
      if (!effect.id || !this.effects.has(effect.id)) continue;
      await this.rollSave(null, null, {
        effectSave: true,
        effectId: effect.id,
        dc: getEffectSystem(effect).saveDC || 10,
      });
    }
  };
}

/** Register effects of unlinked combatant tokens that were built before the effect registry existed. */
function registerCombatantEffects(): void {
  const registry = effectRegistry();
  for (const combat of game.combats ?? []) {
    for (const combatant of combat.combatants) {
      if (!combatant.token || combatant.token.actorLink) continue;
      const actor = combatant.actor;
      if (!actor) continue;
      registry.addFromParent(actor);
      for (const effect of actor.effects) {
        if (registry.has(effect)) (effect as unknown as { updateDuration(): unknown }).updateDuration();
      }
    }
  }
}

/** Install the save wrappers. Call during init, after the system has set CONFIG.Actor.documentClass. */
export function registerSaveAutomation(): void {
  wrapRegistryRefresh();
  wrapRollSave();
  wrapPromptSaves();
  Hooks.once("ready", registerCombatantEffects);
}
