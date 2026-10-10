import "styled-components";
import type { StatusEffectsTheme } from "./theme.js";

declare module "styled-components" {
  export interface DefaultTheme extends StatusEffectsTheme {}
}
