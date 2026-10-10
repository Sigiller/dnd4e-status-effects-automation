import { createRoot, type Root } from "react-dom/client";
import { ThemeProvider } from "styled-components";
import { statusEffectsTheme } from "../styles/theme.js";
import { StatusSettingsWindowStyles } from "./StatusSettings.styles.js";
import { StatusSettingsRoot, type StatusSettingsProps } from "./StatusSettingsRoot.js";

let host: HTMLElement | null = null;
let root: Root | null = null;

export function mountStatusSettings(element: HTMLElement, props: StatusSettingsProps): void {
  if (host !== element || !root) {
    unmountStatusSettings();
    host = element;
    root = createRoot(element);
  }
  root.render(
    <ThemeProvider theme={statusEffectsTheme}>
      <StatusSettingsWindowStyles />
      <StatusSettingsRoot {...props} />
    </ThemeProvider>
  );
}

export function unmountStatusSettings(): void {
  root?.unmount();
  root = null;
  host = null;
}
