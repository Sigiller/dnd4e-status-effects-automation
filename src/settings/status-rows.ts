import { NO_DURATION_STATUSES } from "../config.js";
import type { StatusOptions } from "../status-options.js";
import { builtinDefaultDuration } from "../statuses.js";
import type { Dnd4eStatusEffect } from "../types/dnd4e.js";
import { valueSettings, type ValueSettings } from "../values.js";

/** Select value for "no duration" (the stored and resolved form is ""). */
export const NONE = "none";

export interface StatusRow {
  id: string;
  name: string;
  img: string;
  visible: boolean;
  /** Statuses that never take a duration; their default can't be changed. */
  locked: boolean;
  /** "none" or a CONFIG.DND4E.durationType key. */
  duration: string;
  /** Start value and step, for statuses that carry a value. */
  value: ValueSettings | null;
}

/** Built-in default of a status as a select value. */
export function builtinChoice(statusId: string): string {
  return builtinDefaultDuration(statusId) || NONE;
}

/**
 * One row per HUD status (deduplicated, `hud: false` skipped), sorted by name.
 * @param localizeName Turns a status name (often a localization key) into display text
 */
export function buildStatusRows(
  statuses: Iterable<Dnd4eStatusEffect>,
  { hidden, durations, values }: StatusOptions,
  localizeName: (name: string) => string,
  compare: (a: string, b: string) => number = (a, b) => a.localeCompare(b)
): StatusRow[] {
  const rows = new Map<string, StatusRow>();
  for (const status of statuses) {
    if (rows.has(status.id) || status.hud === false) continue;
    const locked = NO_DURATION_STATUSES.has(status.id);
    rows.set(status.id, {
      id: status.id,
      name: localizeName(status.name || status.id),
      img: status.img,
      visible: !hidden.has(status.id),
      locked,
      duration: locked ? NONE : (durations[status.id] ?? builtinChoice(status.id)),
      value: valueSettings(status.id, values),
    });
  }
  return [...rows.values()].sort((a, b) => compare(a.name, b.name));
}

/** Rows with every status back at its built-in default and visible. */
export function resetStatusRows(rows: readonly StatusRow[]): StatusRow[] {
  return rows.map((row) => ({
    ...row,
    visible: true,
    duration: row.locked ? NONE : builtinChoice(row.id),
    value: valueSettings(row.id),
  }));
}

/** Options to store: hidden statuses, and the durations and values that differ from the built-in defaults. */
export function rowsToStatusOptions(rows: readonly StatusRow[]): StatusOptions {
  const hidden = new Set<string>();
  const durations: Record<string, string> = {};
  const values: Record<string, Partial<ValueSettings>> = {};
  for (const row of rows) {
    if (!row.visible) hidden.add(row.id);
    if (!row.locked && row.duration !== builtinChoice(row.id)) durations[row.id] = row.duration;
    const builtin = valueSettings(row.id);
    if (row.value && builtin) {
      const changed: Partial<ValueSettings> = {};
      if (row.value.start !== builtin.start) changed.start = row.value.start;
      if (row.value.step !== builtin.step) changed.step = row.value.step;
      if (Object.keys(changed).length) values[row.id] = changed;
    }
  }
  return { hidden, durations, values };
}
