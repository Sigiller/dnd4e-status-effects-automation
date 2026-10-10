/**
 * What a palette click does to the token's actor, separated from the TokenHUD so it can be unit tested.
 */
import { statusEffects } from "../types/dnd4e.js";
import {
  VALUED_STATUSES,
  formatValue,
  isValueManaged,
  readEffectValue,
  valueEffectUpdate,
  valueSettings,
  type ValueOverrides,
  type ValuedEffectSource,
} from "../values.js";
import type { PaletteValue } from "./mount.js";
import { decideStatusClick, type StatusClickAction } from "./status-click.js";

/** Resolves a formula such as "5*@tier" against the affected actor; null when it can't be evaluated. */
export type FormulaEvaluator = (formula: string) => number | null;

/**
 * Every effect that represents a status on an actor, matched the way core's TokenHUD and toggleStatusEffect do:
 * the status's static _id, or each single-status effect with that status. Clicks act on the first.
 */
export function findStatusEffects(actor: Actor.Implementation, statusId: string): ActiveEffect.Implementation[] {
  const staticId = statusEffects()[statusId]?._id;
  if (staticId) {
    const effect = actor.effects.get(staticId);
    return effect ? [effect] : [];
  }
  return actor.effects.filter((effect) => effect.statuses.size === 1 && effect.statuses.has(statusId));
}

/** The value of a status effect the palette manages, or null for effects it must not rewrite (e.g. from powers). */
export function managedValue(
  effect: ActiveEffect.Implementation,
  statusId: string,
  overrides: ValueOverrides,
  evaluate?: FormulaEvaluator
): number | null {
  const settings = valueSettings(statusId, overrides);
  const source = effect as unknown as ValuedEffectSource;
  if (!settings || !isValueManaged(source, statusId)) return null;
  return readEffectValue(source, statusId, settings.start, evaluate);
}

/** Badge text and tooltip for each valued status the actor has, from the same effect a click changes. */
export function paletteValues(
  actor: Actor.Implementation,
  overrides: ValueOverrides,
  evaluate?: FormulaEvaluator
): Record<string, PaletteValue> {
  const values: Record<string, PaletteValue> = {};
  for (const statusId of Object.keys(VALUED_STATUSES)) {
    const [effect] = findStatusEffects(actor, statusId);
    const value = effect ? managedValue(effect, statusId, overrides, evaluate) : null;
    if (effect && value !== null) values[statusId] = { text: formatValue(statusId, value), label: effect.name };
  }
  return values;
}

export interface StatusClickContext {
  button: number;
  shift: boolean;
  overrides: ValueOverrides;
  /** The status's localized name without a value. */
  baseName: string;
  evaluate?: FormulaEvaluator;
  /** Create the status effect (with the selected duration and start value). */
  create: (overlay: boolean) => Promise<unknown>;
}

/** Apply a palette click to the actor. */
export async function runStatusClick(
  actor: Actor.Implementation,
  statusId: string,
  { button, shift, overrides, baseName, evaluate, create }: StatusClickContext
): Promise<StatusClickAction> {
  const effects = findStatusEffects(actor, statusId);
  const [effect] = effects;
  const settings = valueSettings(statusId, overrides);
  const value = effect ? managedValue(effect, statusId, overrides, evaluate) : null;
  // Effects the palette doesn't manage (e.g. from powers) behave like statuses without a value.
  const valued = settings && (!effect || value !== null) ? { value: value ?? 0, step: settings.step } : null;
  const action = decideStatusClick({ button, shift, active: effects.length > 0, valued });
  switch (action.type) {
    case "create":
      await create(action.overlay);
      break;
    case "toggleOverlay":
      await effect?.update({ "flags.core.overlay": !effect.getFlag("core", "overlay") } as never);
      break;
    case "setValue":
      // Only name, value flag and changes/dots change; duration and anchor stay as they are.
      await effect?.update(valueEffectUpdate(statusId, action.value, baseName) as never);
      break;
    case "delete": {
      const ids = effects.flatMap((match) => (match.id ? [match.id] : []));
      if (ids.length) await actor.deleteEmbeddedDocuments("ActiveEffect", ids);
      break;
    }
    case "none":
      break;
  }
  return action;
}
