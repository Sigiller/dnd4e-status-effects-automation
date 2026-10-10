export const MODULE_ID = "dnd4e-status-effects-automation";

/**
 * Default automation data for statuses that carry a numeric value.
 * Merged into the matching CONFIG.statusEffects entries as `system` data, so the dnd4e
 * system processes them like any power-applied effect (changes → actor modifiers,
 * dots → Actor4e#autoDoTsSocket at the start of the creature's turn).
 * Values are formulas resolved against the affected actor's roll data.
 */
export const NUMERIC_STATUS_DATA = {
	attack_up: { changes: [change("system.modifiers.attack.untyped", "2")] },
	attack_down: { changes: [change("system.modifiers.attack.untyped", "-2")] },
	defUp: { changes: [change("system.modifiers.defences.untyped", "2")] },
	defDown: { changes: [change("system.modifiers.defences.untyped", "-2")] },
	// Empty damage types are treated as untyped ("physical") ongoing damage by the system.
	ongoing_1: { dots: [{ amount: "5*@tier", types: [] }] },
	ongoing_2: { dots: [{ amount: "5*@tier", types: [] }] },
	ongoing_3: { dots: [{ amount: "5*@tier", types: [] }] },
	// The "healing" dot type is how the system models regeneration.
	regen: { dots: [{ amount: "5", types: ["healing"] }] }
};

function change(key, value) {
	return { key, type: "add", value, phase: "initial", priority: null };
}

/**
 * Statuses that describe a state rather than a condition with an end, so the "Default" duration
 * applies no duration to them. Every other status defaults to "save ends".
 */
export const STATE_STATUSES = new Set([
	"bloodied", "dead", "dying", "unconscious", "prone",
	"mark", "mark_2", "mark_3", "mark_4", "mark_5", "mark_6", "mark_7", "hunter_mark", "target",
	"cover", "coverSup", "concealed", "concealedFull", "hidden", "invisible",
	"flying", "burrowing", "mounted", "running", "charging", "squeezing", "sneaking",
	"removed", "surprised", "torch", "ammo_count"
]);

/** Duration used by the "Default" choice for statuses not listed in STATE_STATUSES. */
export const DEFAULT_DURATION = "saveEnd";

/**
 * Duration choices shown in the Token HUD status palette, in display order.
 * `default` and `none` are module choices; every other id is a key of CONFIG.DND4E.durationType
 * and is skipped if the system does not define it.
 * `badge` is an optional small secondary icon used to tell user-turn durations from target-turn ones.
 */
export const DURATION_CHOICES = [
	{ id: "default", icon: "fa-wand-magic-sparkles", label: "DSEA.DurationDefault" },
	{ id: "none", icon: "fa-infinity", label: "DSEA.DurationNone" },
	{ id: "saveEnd", icon: "fa-dice-d20" },
	{ id: "endOfTargetTurn", icon: "fa-hourglass-end" },
	{ id: "startOfTargetTurn", icon: "fa-hourglass-start" },
	{ id: "endOfUserTurn", icon: "fa-user", badge: "fa-hourglass-end" },
	{ id: "startOfUserTurn", icon: "fa-user", badge: "fa-hourglass-start" },
	{ id: "endOfUserCurrent", icon: "fa-stopwatch" },
	{ id: "endOfEncounter", icon: "fa-swords" },
	{ id: "endOfDay", icon: "fa-moon" }
];

/** Durations measured against the turn of the creature that applied the effect. */
export const USER_TURN_DURATIONS = new Set(["endOfUserTurn", "startOfUserTurn", "endOfUserCurrent"]);
