/** What a click on a status icon in the Token HUD palette does. */
export type StatusClickAction =
  | { type: "create"; overlay: boolean }
  | { type: "toggleOverlay" }
  | { type: "setValue"; value: number }
  | { type: "delete" }
  | { type: "none" };

export interface StatusClick {
  /** Mouse button: 0 left, 2 right. */
  button: number;
  shift: boolean;
  /** Whether the token already has the status. */
  active: boolean;
  /** Current value and step for valued statuses, null for statuses without a value. */
  valued: { value: number; step: number } | null;
}

/**
 * Click model: left adds a status or raises a valued one by its step; right lowers a valued status by its step
 * (removing it at 0) or removes any other status; Shift+left adds the status as an overlay or toggles the overlay.
 */
export function decideStatusClick({ button, shift, active, valued }: StatusClick): StatusClickAction {
  if (button === 0 && shift) return active ? { type: "toggleOverlay" } : { type: "create", overlay: true };
  if (button === 0) {
    if (!active) return { type: "create", overlay: false };
    return valued ? { type: "setValue", value: valued.value + valued.step } : { type: "none" };
  }
  if (button === 2 && active) {
    if (!valued) return { type: "delete" };
    const value = valued.value - valued.step;
    return value > 0 ? { type: "setValue", value } : { type: "delete" };
  }
  return { type: "none" };
}
