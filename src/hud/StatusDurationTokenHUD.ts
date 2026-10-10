import { getStatusOptions } from "../status-options.js";
import { buildHudEffectData } from "../statuses.js";
import { mountPaletteControls, unmountPaletteControls } from "./mount.js";

type TokenHUDClass = typeof foundry.applications.hud.TokenHUD;

/**
 * Create a TokenHUD subclass which adds a duration picker to the "Assign Status Effects" palette and
 * applies statuses with dnd4e effect data. Extends whatever HUD class is configured so other
 * modules replacing CONFIG.Token.hudClass keep working.
 */
export function createStatusDurationTokenHUD(Base: TokenHUDClass): TokenHUDClass {
  class StatusDurationTokenHUD extends Base {
    static override DEFAULT_OPTIONS = {
      actions: {
        effect: { handler: StatusDurationTokenHUD.#onToggleEffect, buttons: [0, 2] },
      },
    };

    /** Selected DURATION_CHOICES id, reset whenever the HUD binds to another token. */
    #duration = "default";

    override async bind(object: Parameters<InstanceType<TokenHUDClass>["bind"]>[0]): Promise<void> {
      if (object !== this.object) this.#duration = "default";
      return super.bind(object);
    }

    /**
     * Drop statuses the GM hid in the module settings, unless the token already has them,
     * so an active hidden status can still be removed.
     */
    protected override _getStatusEffectChoices(): ReturnType<InstanceType<TokenHUDClass>["_getStatusEffectChoices"]> {
      const choices = super._getStatusEffectChoices();
      const { hidden } = getStatusOptions();
      for (const [id, choice] of Object.entries(choices)) {
        if (hidden.has(id) && !choice.isActive) Reflect.deleteProperty(choices, id);
      }
      return choices;
    }

    protected override async _onRender(...args: Parameters<InstanceType<TokenHUDClass>["_onRender"]>): Promise<void> {
      await super._onRender(...args);
      this.#renderPaletteControls();
    }

    protected override async _onClose(...args: Parameters<InstanceType<TokenHUDClass>["_onClose"]>): Promise<void> {
      unmountPaletteControls();
      await super._onClose(...args);
    }

    #renderPaletteControls(): void {
      const palette = this.element?.querySelector(".palette.status-effects");
      if (!(palette instanceof HTMLElement)) return;
      mountPaletteControls(palette, {
        selectedDuration: this.#duration,
        onSelectDuration: (durationId) => {
          this.#duration = durationId;
          this.#renderPaletteControls();
        },
      });
    }

    /** Toggle a status like core does, but create new effects with the selected dnd4e duration. */
    static async #onToggleEffect(this: StatusDurationTokenHUD, event: PointerEvent, target: HTMLElement): Promise<void> {
      const actor = this.actor;
      if (!actor) {
        ui.notifications?.warn("HUD.WarningEffectNoActor", { localize: true });
        return;
      }
      const statusId = target.dataset.statusId;
      if (!statusId) return;
      if (target.classList.contains("active")) {
        await actor.toggleStatusEffect(statusId, { active: false });
        return;
      }
      const { durations } = getStatusOptions();
      const effectData = await buildHudEffectData(actor, statusId, this.#duration, event.button === 2, durations);
      await getDocumentClass("ActiveEffect").create(effectData as never, { parent: actor, keepId: true });
    }
  }
  // fvtt-types declares TokenHUD's render-context generics on the constructor, which a concrete subclass can't satisfy.
  return StatusDurationTokenHUD as unknown as TokenHUDClass;
}
