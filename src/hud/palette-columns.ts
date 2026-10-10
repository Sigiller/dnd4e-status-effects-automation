import { COLUMNS_SETTING, MODULE_ID, PALETTE_COLUMNS } from "../constants.js";

/** Clamp a column count to the allowed palette range. */
export function clampColumns(columns: number | undefined): number {
  if (columns === undefined || !Number.isFinite(columns)) return PALETTE_COLUMNS.default;
  return Math.min(PALETTE_COLUMNS.max, Math.max(PALETTE_COLUMNS.min, Math.round(columns)));
}

/**
 * Column count after dragging the resize grip horizontally, snapped to whole columns.
 * @param startColumns Columns when the drag started
 * @param deltaX Horizontal pointer movement in pixels
 * @param columnWidth Width of one column including the gap, in pixels
 */
export function columnsFromDrag(startColumns: number, deltaX: number, columnWidth: number): number {
  return clampColumns(startColumns + Math.round(deltaX / columnWidth));
}

export function registerPaletteSettings(): void {
  game.settings?.register(MODULE_ID, COLUMNS_SETTING, {
    scope: "client",
    config: false,
    type: Number,
    default: PALETTE_COLUMNS.default,
  });
}

export function getPaletteColumns(): number {
  return clampColumns(game.settings?.get(MODULE_ID, COLUMNS_SETTING));
}

export async function setPaletteColumns(columns: number): Promise<void> {
  await game.settings?.set(MODULE_ID, COLUMNS_SETTING, clampColumns(columns));
}

/** Apply a column count to the core status palette (core sizes its grid with --effect-columns). */
export function applyPaletteColumns(palette: HTMLElement, columns: number): void {
  palette.style.setProperty("--effect-columns", String(columns));
}
