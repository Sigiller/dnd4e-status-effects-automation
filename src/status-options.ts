import { MODULE_ID, STATUS_OPTIONS_MENU, STATUS_OPTIONS_SETTING } from "./constants.js";

/** Stored form of the status options world setting. */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- fvtt-types only accepts index-signature-compatible types (a type alias, not an interface) for `type: Object` settings.
export type StatusOptionsSource = {
  hidden: string[];
  durations: Record<string, string>;
};

export interface StatusOptions {
  /** Status ids hidden from the Token HUD palette. */
  hidden: Set<string>;
  /** Status id → "none" or a CONFIG.DND4E.durationType key. */
  durations: Record<string, string>;
}

/**
 * Clean stored status options: drop malformed entries and durations the system doesn't define.
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
  return { hidden, durations };
}

/** The GM's per-status options for the current world. */
export function getStatusOptions(): StatusOptions {
  return normalizeStatusOptions(
    game.settings?.get(MODULE_ID, STATUS_OPTIONS_SETTING),
    Object.keys(CONFIG.DND4E.durationType)
  );
}

export async function setStatusOptions({ hidden, durations }: StatusOptions): Promise<void> {
  await game.settings?.set(MODULE_ID, STATUS_OPTIONS_SETTING, { hidden: [...hidden], durations });
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
