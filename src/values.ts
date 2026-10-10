/**
 * Statuses that carry a number: attack/defence modifiers and ongoing damage / regeneration dots.
 * The value lives in a module flag; the dnd4e data the system automates (system.changes or system.dots)
 * and the effect name are derived from it.
 */
import { MODULE_ID } from "./constants.js";
import type { StatusChange, StatusDot } from "./types/dnd4e.js";

export interface ValueSettings {
  /** Value a newly added status starts with. */
  start: number;
  /** Amount a left/right click raises or lowers the value by. */
  step: number;
}

type ValueKind = { kind: "modifier"; key: string; sign: 1 | -1 } | { kind: "dot"; types: string[] };

export type ValuedStatus = ValueKind & ValueSettings;

const ATTACK = "system.modifiers.attack.untyped";
const DEFENCES = "system.modifiers.defences.untyped";

/** Valued statuses with their built-in start value and step. */
export const VALUED_STATUSES: Readonly<Record<string, ValuedStatus>> = {
  attack_up: { kind: "modifier", key: ATTACK, sign: 1, start: 1, step: 1 },
  attack_down: { kind: "modifier", key: ATTACK, sign: -1, start: 1, step: 1 },
  defUp: { kind: "modifier", key: DEFENCES, sign: 1, start: 1, step: 1 },
  defDown: { kind: "modifier", key: DEFENCES, sign: -1, start: 1, step: 1 },
  // Empty damage types are treated as untyped ("physical") ongoing damage by the system.
  ongoing_1: { kind: "dot", types: [], start: 5, step: 5 },
  ongoing_2: { kind: "dot", types: [], start: 5, step: 5 },
  ongoing_3: { kind: "dot", types: [], start: 5, step: 5 },
  // The "healing" dot type is how the system models regeneration.
  regen: { kind: "dot", types: ["healing"], start: 5, step: 1 },
};

/** Status id → configured start value and/or step, from the module settings. */
export type ValueOverrides = Readonly<Record<string, Partial<ValueSettings>>>;

/** Effective start value and step of a valued status, or null for statuses without a value. */
export function valueSettings(statusId: string, overrides: ValueOverrides = {}): ValueSettings | null {
  const status = VALUED_STATUSES[statusId];
  if (!status) return null;
  const override = overrides[statusId] ?? {};
  return { start: override.start ?? status.start, step: override.step ?? status.step };
}

/** The dnd4e system data for a valued status at a given value. */
export function valueSystemData(statusId: string, value: number): { changes?: StatusChange[]; dots?: StatusDot[] } {
  const status = VALUED_STATUSES[statusId];
  if (!status) return {};
  if (status.kind === "modifier") {
    return {
      changes: [{ key: status.key, type: "add", value: String(status.sign * value), phase: "initial", priority: null }],
    };
  }
  return { dots: [{ amount: String(value), types: [...status.types] }] };
}

/** Value as shown in the palette badge and the effect name: signed for modifiers ("−3", "+2"), plain for dots. */
export function formatValue(statusId: string, value: number): string {
  const status = VALUED_STATUSES[statusId];
  if (status?.kind !== "modifier") return String(value);
  return `${status.sign > 0 ? "+" : "−"}${value}`;
}

/**
 * Effect update (or creation data) for a valued status at a given value: name with the value, the module flag,
 * and the derived changes or dots.
 * @param baseName The status's localized name without a value
 */
export function valueEffectUpdate(statusId: string, value: number, baseName: string): Record<string, unknown> {
  const { changes, dots } = valueSystemData(statusId, value);
  const update: Record<string, unknown> = {
    name: `${baseName} ${formatValue(statusId, value)}`,
    [`flags.${MODULE_ID}.value`]: value,
  };
  if (changes) update["system.changes"] = changes;
  if (dots) update["system.dots"] = dots;
  return update;
}

export interface ValuedEffectSource {
  flags?: Record<string, Record<string, unknown> | undefined>;
  system?: { changes?: { key: string; value: unknown }[]; dots?: { amount: unknown; types?: Iterable<string> }[] };
}

/**
 * Whether the palette may manage an effect's value: it carries the module's value flag, or its data has exactly the
 * shape the module would write (a single change on the status's key, or a single dot of the status's types), as for
 * macro toggles. Effects from powers with other changes are left alone.
 */
export function isValueManaged(effect: ValuedEffectSource, statusId: string): boolean {
  const status = VALUED_STATUSES[statusId];
  if (!status) return false;
  if (effect.flags?.[MODULE_ID]?.value !== undefined) return true;
  const changes = effect.system?.changes ?? [];
  const dots = effect.system?.dots ?? [];
  if (status.kind === "modifier") return dots.length === 0 && changes.length === 1 && changes[0]?.key === status.key;
  const types = [...(dots[0]?.types ?? [])].sort();
  return changes.length === 0 && dots.length === 1 && JSON.stringify(types) === JSON.stringify([...status.types].sort());
}

/**
 * Current value of a valued status effect: the module flag, or (for effects created by macros or before values
 * existed) the number in its change or dot, or the start value.
 * @param evaluate Resolves a non-numeric amount such as "5*@tier" against the affected actor; null if it can't
 */
export function readEffectValue(
  effect: ValuedEffectSource,
  statusId: string,
  fallback: number,
  evaluate?: (formula: string) => number | null
): number {
  const flagged = Number(effect.flags?.[MODULE_ID]?.value);
  if (Number.isFinite(flagged) && flagged > 0) return flagged;
  const status = VALUED_STATUSES[statusId];
  let raw: unknown;
  if (status?.kind === "modifier") raw = effect.system?.changes?.find((change) => change.key === status.key)?.value;
  else if (status?.kind === "dot") raw = effect.system?.dots?.[0]?.amount;
  let parsed = Math.abs(Number(raw));
  if (!Number.isFinite(parsed) && typeof raw === "string" && evaluate) parsed = Math.abs(evaluate(raw) ?? Number.NaN);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
