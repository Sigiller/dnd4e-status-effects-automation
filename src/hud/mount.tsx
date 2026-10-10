import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { ThemeProvider } from "styled-components";
import { statusEffectsTheme } from "../styles/theme.js";
import { applyPaletteColumns, getPaletteColumns } from "./palette-columns.js";
import { PaletteControls } from "./PaletteControls.js";

export interface PaletteValue {
  /** Badge text, e.g. "−3" or "10". */
  text: string;
  /** Tooltip for the status icon, e.g. "Attack Down −3". */
  label: string;
}

export interface PaletteMountProps {
  /** Status id → value of each valued status the token has. */
  values: Record<string, PaletteValue>;
  selectedDuration: string;
  onSelectDuration: (durationId: string) => void;
}

export const VALUE_HOST_CLASS = "dsea-value-host";
export const CONTROLS_HOST_CLASS = "dsea-palette-controls";
export const GRIP_HOST_CLASS = "dsea-palette-grip";

/**
 * Wrap a status icon in a positioned cell so a badge can sit on it (an <img> can't hold children). The wrapper is
 * the palette's grid item instead of the icon; clicks on the icon still reach core's data-action handler.
 */
function valueHost(icon: HTMLElement): HTMLElement {
  const parent = icon.parentElement;
  if (parent?.classList.contains(VALUE_HOST_CLASS)) return parent;
  const host = document.createElement("span");
  host.className = VALUE_HOST_CLASS;
  icon.replaceWith(host);
  host.append(icon);
  return host;
}

/** Badge targets for the valued statuses shown in the palette; also puts the value in each icon's tooltip. */
function valueBadges(palette: HTMLElement, values: Record<string, PaletteValue>): { statusId: string; host: HTMLElement; text: string }[] {
  const badges: { statusId: string; host: HTMLElement; text: string }[] = [];
  for (const [statusId, { text, label }] of Object.entries(values)) {
    const icon = palette.querySelector<HTMLElement>(`.effect-control[data-status-id="${CSS.escape(statusId)}"]`);
    if (!icon) continue;
    icon.dataset.tooltipText = label;
    badges.push({ statusId, host: valueHost(icon), text });
  }
  return badges;
}

let palette: HTMLElement | null = null;
let gripHost: HTMLElement | null = null;
let root: Root | null = null;

/** React hosts take no box of their own (PaletteHostStyles), so the controls inside are grid items of the palette. */
function createHost(className: string): HTMLElement {
  const host = document.createElement("div");
  host.className = className;
  return host;
}

/**
 * Render the duration picker and resize grip into core's status palette. The HUD replaces its markup on
 * every render, so a new palette element gets new hosts and a new React root.
 */
export function mountPaletteControls(element: HTMLElement, props: PaletteMountProps): void {
  if (palette !== element || !root || !gripHost) {
    unmountPaletteControls();
    palette = element;
    // Apply the stored width before React's first commit so the palette doesn't flash at core's default.
    applyPaletteColumns(element, getPaletteColumns());
    const top = createHost(CONTROLS_HOST_CLASS);
    gripHost = createHost(GRIP_HOST_CLASS);
    element.prepend(top);
    element.append(gripHost);
    root = createRoot(top);
  }
  const { values, ...controls } = props;
  const target = root;
  const host = gripHost;
  // Commit synchronously: the HUD has just replaced the palette, and a deferred React render would let the browser
  // paint a frame without the duration row and grip (a visible flash on every status toggle).
  flushSync(() => {
    target.render(
      <ThemeProvider theme={statusEffectsTheme}>
        <PaletteControls palette={element} gripHost={host} badges={valueBadges(element, values)} {...controls} />
      </ThemeProvider>
    );
  });
}

export function unmountPaletteControls(): void {
  root?.unmount();
  root = null;
  palette = null;
  gripHost = null;
}
