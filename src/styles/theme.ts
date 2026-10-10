/**
 * Module theme. HUD controls reuse core's HUD CSS variables (--control-*, --effect-*) so they match the
 * palette they sit in; these values cover what core has no variable for.
 */
export const statusEffectsTheme = {
  /** Background behind light-on-transparent status SVGs, so they read in light and dark sheets. */
  iconChip: "#23221d",
  rowStripe: "rgba(0, 0, 0, 0.05)",
  radiusControl: "3px",
  disabledOpacity: 0.45,
} as const;

export type StatusEffectsTheme = typeof statusEffectsTheme;
