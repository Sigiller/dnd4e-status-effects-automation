import { createRoot, type Root } from "react-dom/client";
import { ThemeProvider } from "styled-components";
import { statusEffectsTheme } from "../styles/theme.js";
import { applyPaletteColumns, getPaletteColumns } from "./palette-columns.js";
import { PaletteControls } from "./PaletteControls.js";

export interface PaletteMountProps {
  selectedDuration: string;
  onSelectDuration: (durationId: string) => void;
}

let palette: HTMLElement | null = null;
let gripHost: HTMLElement | null = null;
let root: Root | null = null;

/** React hosts take no box of their own, so the controls inside are grid items of core's palette. */
function createHost(className: string): HTMLElement {
  const host = document.createElement("div");
  host.className = className;
  host.style.display = "contents";
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
    const top = createHost("dsea-palette-controls");
    gripHost = createHost("dsea-palette-grip");
    element.prepend(top);
    element.append(gripHost);
    root = createRoot(top);
  }
  root.render(
    <ThemeProvider theme={statusEffectsTheme}>
      <PaletteControls palette={element} gripHost={gripHost} {...props} />
    </ThemeProvider>
  );
}

export function unmountPaletteControls(): void {
  root?.unmount();
  root = null;
  palette = null;
  gripHost = null;
}
