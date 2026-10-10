import type { StatusChange, StatusDot } from "./types/dnd4e.js";

export interface NumericStatusData {
  changes?: StatusChange[];
  dots?: StatusDot[];
}

function change(key: string, value: string): StatusChange {
  return { key, type: "add", value, phase: "initial", priority: null };
}

/**
 * Default automation data for statuses that carry a numeric value.
 * Merged into the matching CONFIG.statusEffects entries as `system` data, so the dnd4e
 * system processes them like any power-applied effect (changes → actor modifiers,
 * dots → Actor4e#autoDoTsSocket at the start of the creature's turn).
 * Values are formulas resolved against the affected actor's roll data.
 */
export const NUMERIC_STATUS_DATA: Record<string, NumericStatusData> = {
  attack_up: { changes: [change("system.modifiers.attack.untyped", "2")] },
  attack_down: { changes: [change("system.modifiers.attack.untyped", "-2")] },
  defUp: { changes: [change("system.modifiers.defences.untyped", "2")] },
  defDown: { changes: [change("system.modifiers.defences.untyped", "-2")] },
  // Empty damage types are treated as untyped ("physical") ongoing damage by the system.
  ongoing_1: { dots: [{ amount: "5*@tier", types: [] }] },
  ongoing_2: { dots: [{ amount: "5*@tier", types: [] }] },
  ongoing_3: { dots: [{ amount: "5*@tier", types: [] }] },
  // The "healing" dot type is how the system models regeneration.
  regen: { dots: [{ amount: "5", types: ["healing"] }] },
};

/**
 * Statuses that never take a duration, whatever is selected in the HUD: they end through
 * game state or an action (standing up, healing, stopping a movement mode), not through time or saves.
 */
export const NO_DURATION_STATUSES: ReadonlySet<string> = new Set([
  "prone", "dead", "dying", "bloodied", "regen",
  "running", "charging", "squeezing", "flying", "burrowing", "mounted",
]);

/**
 * Statuses whose built-in default is no duration: states rather than conditions with an end.
 * An explicit HUD choice or the module settings can still give them one, since powers often grant
 * them for a limited time (marks, cover, unconscious (save ends)).
 */
export const STATE_STATUSES: ReadonlySet<string> = new Set([
  "unconscious", "helpless", "grabbed",
  "mark", "mark_2", "mark_3", "mark_4", "mark_5", "mark_6", "mark_7", "hunter_mark", "target",
  "curse", "oath",
  "cover", "coverSup", "concealed", "concealedFull", "hidden", "sneaking",
  "removed", "surprised", "torch", "ammo_count", "disarmed", "drunk",
]);

/** Built-in default durations other than "save ends" or none (CONFIG.DND4E.durationType keys). */
export const DEFAULT_DURATIONS: Readonly<Record<string, string>> = {
  attack_up: "endOfTargetTurn",
  attack_down: "endOfTargetTurn",
  defUp: "endOfTargetTurn",
  defDown: "endOfUserTurn",
  grantingCA: "endOfTargetTurn",
  immobilized: "endOfTargetTurn",
  insubstantial: "endOfUserTurn",
  invisible: "endOfUserTurn",
};

/** Duration used by the "Default" choice for statuses not listed above. */
export const DEFAULT_DURATION = "saveEnd";

export interface DurationChoice {
  id: string;
  icon: string;
  /** Localization key; module choices only, system durations use CONFIG.DND4E.durationType labels. */
  label?: string;
  /** Small secondary icon telling user-turn durations from target-turn ones. */
  badge?: string;
}

/**
 * Duration choices shown in the Token HUD status palette, in display order.
 * `default` and `none` are module choices; every other id is a key of CONFIG.DND4E.durationType
 * and is skipped if the system does not define it.
 */
export const DURATION_CHOICES: readonly DurationChoice[] = [
  { id: "default", icon: "fa-wand-magic-sparkles", label: "DSEA.DurationDefault" },
  { id: "none", icon: "fa-infinity", label: "DSEA.DurationNone" },
  { id: "saveEnd", icon: "fa-dice-d20" },
  { id: "endOfTargetTurn", icon: "fa-hourglass-end" },
  { id: "startOfTargetTurn", icon: "fa-hourglass-start" },
  { id: "endOfUserTurn", icon: "fa-user", badge: "fa-hourglass-end" },
  { id: "startOfUserTurn", icon: "fa-user", badge: "fa-hourglass-start" },
  { id: "endOfUserCurrent", icon: "fa-stopwatch" },
  { id: "endOfEncounter", icon: "fa-swords" },
  { id: "endOfDay", icon: "fa-moon" },
];

/** Durations measured against the turn of the creature that applied the effect. */
export const USER_TURN_DURATIONS: ReadonlySet<string> = new Set([
  "endOfUserTurn",
  "startOfUserTurn",
  "endOfUserCurrent",
]);
