import { MODULE_ID, STATUS_OPTIONS_MENU, STATUS_OPTIONS_SETTING } from "./constants.js";
import { VALUED_STATUSES, type ValueSettings } from "./values.js";

/** Stored form of the status options world setting. */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- fvtt-types only accepts index-signature-compatible types (a type alias, not an interface) for `type: Object` settings.
export type StatusOptionsSource = {
  hidden: string[];
  durations: Record<string, string>;
  values?: Record<string, Partial<ValueSettings>>;
};

export interface StatusOptions {
  /** Status ids hidden from the Token HUD palette. */
  hidden: Set<string>;
  /** Status id → "none" or a CONFIG.DND4E.durationType key. */
  durations: Record<string, string>;
  /** Valued status id → start value and/or step replacing the built-in ones. */
  values: Record<string, Partial<ValueSettings>>;
}

function positiveInteger(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : undefined;
}

/**
 * Clean stored status options: drop malformed entries, durations the system doesn't define, and start/step
 * values that aren't positive integers for a valued status.
 * @param raw The stored setting value
 * @param durationTypes Valid CONFIG.DND4E.durationType keys
 */
export function normalizeStatusOptions(raw: unknown, durationTypes: Iterable<string>): StatusOptions {
  const valid = new Set(durationTypes);
  valid.add("none");
  const source = (typeof raw === "object" && raw !== null ? raw : {}) as Partial<Record<keyof StatusOptionsSource, unknown>>;
  const hidden = new Set(
    Array.isArray(source.hidden) ? source.hidden.filter((id): id is string => typeof id === "string") : []
  );
  const durations: Record<string, string> = {};
  if (typeof source.durations === "object" && source.durations !== null) {
    for (const [id, duration] of Object.entries(source.durations)) {
      if (typeof duration === "string" && valid.has(duration)) durations[id] = duration;
    }
  }
  const values: Record<string, Partial<ValueSettings>> = {};
  if (typeof source.values === "object" && source.values !== null) {
    for (const [id, entry] of Object.entries(source.values as Record<string, unknown>)) {
      if (!VALUED_STATUSES[id] || typeof entry !== "object" || entry === null) continue;
      const { start, step } = entry as Record<string, unknown>;
      const cleaned: Partial<ValueSettings> = {};
      const validStart = positiveInteger(start);
      const validStep = positiveInteger(step);
      if (validStart !== undefined) cleaned.start = validStart;
      if (validStep !== undefined) cleaned.step = validStep;
      if (Object.keys(cleaned).length) values[id] = cleaned;
    }
  }
  return { hidden, durations, values };
}

/** The GM's per-status options for the current world. */
export function getStatusOptions(): StatusOptions {
  return normalizeStatusOptions(
    game.settings?.get(MODULE_ID, STATUS_OPTIONS_SETTING),
    Object.keys(CONFIG.DND4E.durationType)
  );
}

export async function setStatusOptions({ hidden, durations, values }: StatusOptions): Promise<void> {
  await game.settings?.set(MODULE_ID, STATUS_OPTIONS_SETTING, { hidden: [...hidden], durations, values });
}

const changeListeners = new Set<() => void>();

/**
 * Run a callback whenever the status options setting changes (on this or another client).
 * @returns A function removing the listener
 */
export function onStatusOptionsChange(listener: () => void): () => void {
  changeListeners.add(listener);
  return () => changeListeners.delete(listener);
}

/** Register the world setting and its configuration menu. */
export function registerStatusOptions(menuType: new () => foundry.applications.api.ApplicationV2.Any): void {
  game.settings?.register(MODULE_ID, STATUS_OPTIONS_SETTING, {
    scope: "world",
    config: false,
    type: Object,
    default: { hidden: [], durations: {} },
    onChange: () => {
      const hud = canvas?.tokens?.hud;
      if (hud?.rendered) void hud.render();
      for (const listener of changeListeners) listener();
    },
  });
  game.settings?.registerMenu(MODULE_ID, STATUS_OPTIONS_MENU, {
    name: "DSEA.Settings.StatusOptions.Name",
    label: "DSEA.Settings.StatusOptions.Label",
    hint: "DSEA.Settings.StatusOptions.Hint",
    icon: "fa-solid fa-list-check",
    type: menuType,
    restricted: true,
  });
}
