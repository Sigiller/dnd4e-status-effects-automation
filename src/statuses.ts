import {
  DEFAULT_DURATION,
  DEFAULT_DURATIONS,
  NO_DURATION_STATUSES,
  NUMERIC_STATUS_DATA,
  STATE_STATUSES,
  USER_TURN_DURATIONS,
} from "./config.js";
import { MODULE_ID } from "./constants.js";
import { statusEffects } from "./types/dnd4e.js";

/** Status id → "none" or a CONFIG.DND4E.durationType key, from the module settings. */
export type DurationOverrides = Readonly<Record<string, string>>;

/**
 * Register numeric statuses the system only ships as optional "legacy" custom statuses, unless the GM
 * already restored them. Uses the system's own definitions so ids, icons and labels stay identical.
 * Must run after the system's init hook has built CONFIG.statusEffects.
 */
export function registerMissingNumericStatuses(): void {
  const statuses = statusEffects();
  const legacy = dnd4e.applications.apps.CustomStatusConfig?.LEGACY_STATUSES ?? {};
  for (const id of Object.keys(NUMERIC_STATUS_DATA)) {
    if (statuses[id]) continue;
    const definition = legacy[id];
    if (!definition) {
      console.warn(`${MODULE_ID} | No dnd4e definition for status "${id}", skipping registration`);
      continue;
    }
    const { name, img, description } = definition;
    statuses.push({ id, name, img, description });
    CONFIG.DND4E.statusEffect[id] = { name, img, description };
  }
}

/**
 * Attach default automation data to the numeric statuses, so every effect created from them
 * (Token HUD, macros, other modules) carries the system data the dnd4e system automates.
 */
export function hydrateStatusEffects(): void {
  const statuses = statusEffects();
  for (const [id, data] of Object.entries(NUMERIC_STATUS_DATA)) {
    const status = statuses[id];
    if (!status) continue;
    status.system = foundry.utils.mergeObject(status.system ?? {}, foundry.utils.deepClone(data));
  }
}

/**
 * Built-in default duration of a status, before the GM's module settings are applied.
 * @returns A CONFIG.DND4E.durationType key, or "" for no duration
 */
export function builtinDefaultDuration(statusId: string): string {
  if (NO_DURATION_STATUSES.has(statusId) || STATE_STATUSES.has(statusId)) return "";
  return DEFAULT_DURATIONS[statusId] ?? DEFAULT_DURATION;
}

/**
 * Default duration of a status: the GM's setting if any, otherwise the built-in default.
 * Statuses in NO_DURATION_STATUSES never take a duration.
 * @returns A CONFIG.DND4E.durationType key, or "" for no duration
 */
export function defaultDuration(statusId: string, overrides: DurationOverrides = {}): string {
  if (NO_DURATION_STATUSES.has(statusId)) return "";
  const override = overrides[statusId];
  if (override === undefined) return builtinDefaultDuration(statusId);
  return override === "none" ? "" : override;
}

/**
 * Resolve the dnd4e duration type for a status applied from the Token HUD.
 * @param choice A DURATION_CHOICES id
 * @returns A CONFIG.DND4E.durationType key, or "" for no duration
 */
export function resolveDurationType(
  statusId: string,
  choice: string,
  overrides: DurationOverrides = {}
): string {
  if (NO_DURATION_STATUSES.has(statusId)) return "";
  if (choice === "default") return defaultDuration(statusId, overrides);
  if (choice === "none") return "";
  return choice;
}

/**
 * Build ActiveEffect creation data for a status applied from the Token HUD.
 * Duration data itself is filled in by ActiveEffect4e#_preCreate from system.durationType and, for
 * user-turn durations, origin.
 * @param durationChoice A DURATION_CHOICES id
 */
export async function buildHudEffectData(
  actor: Actor.Implementation,
  statusId: string,
  durationChoice: string,
  overlay: boolean,
  durationOverrides: DurationOverrides = {}
): Promise<object> {
  const ActiveEffectClass = getDocumentClass("ActiveEffect");
  const effect = await ActiveEffectClass.fromStatusEffect(statusId, { parent: actor });
  const durationType = resolveDurationType(statusId, durationChoice, durationOverrides);

  const updates: Record<string, unknown> = { "system.durationType": durationType };
  // A HUD toggle has no source creature: user-turn durations count from whoever's turn it is, or from the
  // target when no combat is running.
  if (USER_TURN_DURATIONS.has(durationType)) {
    const currentActor = game.combat?.started ? game.combat.combatant?.actor : null;
    updates.origin = currentActor?.uuid ?? actor.uuid;
  }
  if (overlay) updates["flags.core.overlay"] = true;
  effect.updateSource(updates);
  return effect.toObject();
}
