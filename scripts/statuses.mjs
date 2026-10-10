import { DEFAULT_DURATION, MODULE_ID, NUMERIC_STATUS_DATA, STATE_STATUSES, USER_TURN_DURATIONS } from "./config.mjs";

/**
 * Register numeric statuses the system only ships as optional "legacy" custom statuses, unless the GM
 * already restored them. Uses the system's own definitions so ids, icons and labels stay identical.
 * Must run after the system's init hook has built CONFIG.statusEffects.
 */
export function registerMissingNumericStatuses() {
	const legacy = dnd4e.applications.apps.CustomStatusConfig?.LEGACY_STATUSES ?? {};
	for (const id of Object.keys(NUMERIC_STATUS_DATA)) {
		if (CONFIG.statusEffects[id]) continue;
		const definition = legacy[id];
		if (!definition) {
			console.warn(`${MODULE_ID} | No dnd4e definition for status "${id}", skipping registration`);
			continue;
		}
		const { name, img, description } = definition;
		CONFIG.statusEffects.push({ id, name, img, description });
		CONFIG.DND4E.statusEffect[id] = { name, img, description };
	}
}

/**
 * Attach default automation data to the numeric statuses, so every effect created from them
 * (Token HUD, macros, other modules) carries the system data the dnd4e system automates.
 */
export function hydrateStatusEffects() {
	for (const [id, data] of Object.entries(NUMERIC_STATUS_DATA)) {
		const status = CONFIG.statusEffects[id];
		if (!status) continue;
		status.system = foundry.utils.mergeObject(status.system ?? {}, foundry.utils.deepClone(data));
	}
}

/**
 * Resolve the dnd4e duration type for a status applied from the Token HUD.
 * @param {string} statusId
 * @param {string} choice    A DURATION_CHOICES id
 * @returns {string}         A CONFIG.DND4E.durationType key, or "" for no duration
 */
export function resolveDurationType(statusId, choice) {
	if (choice === "default") return STATE_STATUSES.has(statusId) ? "" : DEFAULT_DURATION;
	if (choice === "none") return "";
	return choice;
}

/**
 * Build ActiveEffect creation data for a status applied from the Token HUD.
 * Duration data itself is filled in by ActiveEffect4e#_preCreate from system.durationType and, for
 * user-turn durations, origin.
 * @param {Actor} actor
 * @param {string} statusId
 * @param {string} durationChoice   A DURATION_CHOICES id
 * @param {boolean} overlay
 * @returns {Promise<object>}
 */
export async function buildHudEffectData(actor, statusId, durationChoice, overlay) {
	const ActiveEffect = getDocumentClass("ActiveEffect");
	const effect = await ActiveEffect.fromStatusEffect(statusId, { parent: actor });
	const durationType = resolveDurationType(statusId, durationChoice);

	const updates = { "system.durationType": durationType };
	// A HUD toggle has no source creature: user-turn durations count from whoever's turn it is.
	if (USER_TURN_DURATIONS.has(durationType)) {
		updates.origin = game.combat?.combatant?.actor?.uuid ?? actor.uuid;
	}
	if (overlay) updates["flags.core.overlay"] = true;
	effect.updateSource(updates);
	return effect.toObject();
}
