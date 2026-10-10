import type { StatusOptionsSource } from "./status-options.js";
import type { Dnd4eDurationType, Dnd4eGlobal, Dnd4eStatusDefinition } from "./types/dnd4e.js";

declare global {
  interface CONFIG {
    DND4E: {
      durationType: Record<string, Dnd4eDurationType>;
      statusEffect: Record<string, Dnd4eStatusDefinition>;
    };
  }

  const dnd4e: Dnd4eGlobal;
}

declare module "fvtt-types/configuration" {
  export interface SettingConfig {
    "dnd4e-status-effects-automation.paletteColumns": number;
    "dnd4e-status-effects-automation.statusOptions": StatusOptionsSource;
    "dnd4e.saveReminders": boolean;
  }
}

export {};
