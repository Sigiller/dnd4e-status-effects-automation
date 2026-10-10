import { DURATION_CHOICES } from "./config.mjs";
import { buildHudEffectData } from "./statuses.mjs";

/**
 * Create a TokenHUD subclass which adds a duration picker to the "Assign Status Effects" palette and
 * applies statuses with dnd4e effect data. Extends whatever HUD class is configured so other
 * modules replacing CONFIG.Token.hudClass keep working.
 * @param {typeof foundry.applications.hud.TokenHUD} Base
 */
export function createStatusDurationTokenHUD(Base) {
	return class StatusDurationTokenHUD extends Base {
		static DEFAULT_OPTIONS = {
			actions: {
				effect: { handler: StatusDurationTokenHUD.#onToggleEffect, buttons: [0, 2] },
				statusDuration: StatusDurationTokenHUD.#onSelectDuration
			}
		};

		/** Selected DURATION_CHOICES id, reset whenever the HUD binds to another token. */
		#duration = "default";

		/** @inheritDoc */
		async bind(object) {
			if (object !== this.object) this.#duration = "default";
			return super.bind(object);
		}

		/** @inheritDoc */
		async _onRender(context, options) {
			await super._onRender(context, options);
			const palette = this.element.querySelector(".palette.status-effects");
			if (palette) palette.prepend(this.#createDurationRow());
		}

		/**
		 * Build the row of duration buttons shown above the status icons.
		 * @returns {HTMLDivElement}
		 */
		#createDurationRow() {
			const row = document.createElement("div");
			row.className = "dsea-durations";
			for (const choice of DURATION_CHOICES) {
				const label = choice.label ?? CONFIG.DND4E.durationType[choice.id]?.label;
				if (!label) continue;
				const text = _loc(label);
				const button = document.createElement("button");
				button.type = "button";
				button.className = "dsea-duration";
				button.classList.toggle("active", choice.id === this.#duration);
				button.dataset.action = "statusDuration";
				button.dataset.duration = choice.id;
				button.dataset.tooltipText = text;
				button.setAttribute("aria-label", text);
				button.setAttribute("aria-pressed", String(choice.id === this.#duration));
				button.append(icon(choice.icon));
				if (choice.badge) button.append(icon(choice.badge, "dsea-badge"));
				row.append(button);
			}
			return row;
		}

		/**
		 * Select the duration used for the next applied status.
		 * @this {StatusDurationTokenHUD}
		 * @param {PointerEvent} event
		 * @param {HTMLButtonElement} target
		 */
		static #onSelectDuration(event, target) {
			this.#duration = target.dataset.duration;
			for (const button of target.parentElement.querySelectorAll(".dsea-duration")) {
				const active = button === target;
				button.classList.toggle("active", active);
				button.setAttribute("aria-pressed", String(active));
			}
		}

		/**
		 * Toggle a status like core does, but create new effects with the selected dnd4e duration.
		 * @this {StatusDurationTokenHUD}
		 * @param {PointerEvent} event
		 * @param {HTMLImageElement} target
		 */
		static async #onToggleEffect(event, target) {
			const actor = this.actor;
			if (!actor) {
				ui.notifications.warn("HUD.WarningEffectNoActor", { localize: true });
				return;
			}
			const statusId = target.dataset.statusId;
			if (target.classList.contains("active")) {
				await actor.toggleStatusEffect(statusId, { active: false });
				return;
			}
			const effectData = await buildHudEffectData(actor, statusId, this.#duration, event.button === 2);
			await getDocumentClass("ActiveEffect").create(effectData, { parent: actor, keepId: true });
		}
	};
}

function icon(name, extraClass) {
	const i = document.createElement("i");
	i.className = ["fa-solid", name, extraClass].filterJoin(" ");
	i.inert = true;
	return i;
}
