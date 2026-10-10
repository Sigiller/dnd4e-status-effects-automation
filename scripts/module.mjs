import { MODULE_ID } from "./config.mjs";
import { hydrateStatusEffects, registerMissingNumericStatuses } from "./statuses.mjs";
import { createStatusDurationTokenHUD } from "./token-hud.mjs";

// Runs after the dnd4e system's init hook, which builds CONFIG.statusEffects synchronously.
Hooks.once("init", () => {
	if (game.system.id !== "dnd4e") {
		console.warn(`${MODULE_ID} | Requires the dnd4e system, module disabled`);
		return;
	}
	registerMissingNumericStatuses();
	hydrateStatusEffects();
	CONFIG.Token.hudClass = createStatusDurationTokenHUD(CONFIG.Token.hudClass);
});
