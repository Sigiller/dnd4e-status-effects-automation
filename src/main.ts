import { registerCombatAnchoring } from "./combat-anchoring.js";
import { MODULE_ID } from "./constants.js";
import { registerPaletteSettings } from "./hud/palette-columns.js";
import { createStatusDurationTokenHUD } from "./hud/StatusDurationTokenHUD.js";
import { registerSaveAutomation } from "./saves.js";
import { StatusSettingsApp } from "./settings/StatusSettingsApp.js";
import { registerStatusOptions } from "./status-options.js";
import { hydrateStatusEffects, registerMissingNumericStatuses } from "./statuses.js";

// Runs after the dnd4e system's init hook, which builds CONFIG.statusEffects synchronously.
Hooks.once("init", () => {
  if (game.system?.id !== "dnd4e") {
    console.warn(`${MODULE_ID} | Requires the dnd4e system, module disabled`);
    return;
  }
  registerPaletteSettings();
  registerStatusOptions(StatusSettingsApp);
  registerMissingNumericStatuses();
  hydrateStatusEffects();
  registerSaveAutomation();
  registerCombatAnchoring();
  CONFIG.Token.hudClass = createStatusDurationTokenHUD(CONFIG.Token.hudClass);
});
