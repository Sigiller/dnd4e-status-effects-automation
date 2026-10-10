export const MODULE_ID = "dnd4e-status-effects-automation";

/** Client setting storing the number of status icons per row in the Token HUD palette. */
export const COLUMNS_SETTING = "paletteColumns";

/**
 * World setting with the GM's per-status choices: `hidden` lists status ids hidden from the HUD palette,
 * `durations` maps status ids to a default duration ("none" or a CONFIG.DND4E.durationType key) that
 * replaces the built-in default.
 */
export const STATUS_OPTIONS_SETTING = "statusOptions";

/** Settings menu that opens the status options window. */
export const STATUS_OPTIONS_MENU = "statusOptionsMenu";

/** Allowed icons per row in the status palette; the default matches core's --effect-columns. */
export const PALETTE_COLUMNS = { min: 4, max: 10, default: 5 } as const;
