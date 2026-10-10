import type { Root } from "react-dom/client";
import { ThemeProvider } from "styled-components";
import { statusEffectsTheme } from "../styles/theme.js";
import { StatusSettingsWindowStyles } from "./StatusSettings.styles.js";
import { StatusSettingsRoot, type StatusSettingsProps } from "./StatusSettingsRoot.js";

/** Render the status settings form into a window's own React root. */
export function renderStatusSettings(root: Root, props: StatusSettingsProps): void {
  root.render(
    <ThemeProvider theme={statusEffectsTheme}>
      <StatusSettingsWindowStyles />
      <StatusSettingsRoot {...props} />
    </ThemeProvider>
  );
}
