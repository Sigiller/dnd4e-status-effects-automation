import { MODULE_ID } from "../constants.js";
import { getStatusOptions } from "../status-options.js";
import { buildHudEffectData } from "../statuses.js";
import { statusEffects } from "../types/dnd4e.js";
import { mountPaletteControls, unmountPaletteControls } from "./mount.js";
import { paletteValues, runStatusClick, type FormulaEvaluator } from "./status-actions.js";

type TokenHUDClass = typeof foundry.applications.hud.TokenHUD;

function baseStatusName(statusId: string): string {
  const name = statusEffects()[statusId]?.name ?? statusId;
  return game.i18n?.localize(name) ?? name;
}

/** Evaluate a deterministic formula (e.g. "5*@tier" from older ongoing effects) with the actor's roll data. */
function formulaEvaluator(actor: Actor.Implementation): FormulaEvaluator {
  return (formula) => {
    try {
      const resolved = Roll.replaceFormulaData(formula, actor.getRollData());
      const total = new Roll(resolved).evaluateSync().total;
      return Number.isFinite(total) ? total : null;
    } catch {
      return null;
    }
  };
}

/**
 * Create a TokenHUD subclass which adds a duration picker to the "Assign Status Effects" palette and
 * applies statuses with dnd4e effect data. Extends whatever HUD class is configured so other
 * modules replacing CONFIG.Token.hudClass keep working.
 */
export function createStatusDurationTokenHUD(Base: TokenHUDClass): TokenHUDClass {
  class StatusDurationTokenHUD extends Base {
    static override DEFAULT_OPTIONS = {
      actions: {
        effect: { handler: StatusDurationTokenHUD.#onStatusClick, buttons: [0, 2] },
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

    /** Palette clicks run one at a time, so each reads the state the previous one left. */
    #clickQueue: Promise<void> = Promise.resolve();

    #renderPaletteControls(): void {
      const palette = this.element?.querySelector(".palette.status-effects");
      if (!(palette instanceof HTMLElement)) return;
      const actor = this.actor;
      mountPaletteControls(palette, {
        values: actor ? paletteValues(actor, getStatusOptions().values, formulaEvaluator(actor)) : {},
        selectedDuration: this.#duration,
        onSelectDuration: (durationId) => {
          this.#duration = durationId;
          this.#renderPaletteControls();
        },
      });
    }

    /**
     * Left-click adds a status or raises a valued one; right-click lowers a valued status (removing it at 0) or
     * removes any other; Shift+left-click adds the status as an overlay or toggles the overlay.
     */
    static async #onStatusClick(this: StatusDurationTokenHUD, event: PointerEvent, target: HTMLElement): Promise<void> {
      const actor = this.actor;
      if (!actor) {
        ui.notifications?.warn("HUD.WarningEffectNoActor", { localize: true });
        return;
      }
      const statusId = target.dataset.statusId;
      if (!statusId) return;
      const { button, shiftKey } = event;
      const duration = this.#duration;
      this.#clickQueue = this.#clickQueue.then(async () => {
        const options = getStatusOptions();
        const action = await runStatusClick(actor, statusId, {
          button,
          shift: shiftKey,
          overrides: options.values,
          baseName: baseStatusName(statusId),
          evaluate: formulaEvaluator(actor),
          create: async (overlay) => {
            const effectData = await buildHudEffectData(
              actor, statusId, duration, overlay, options.durations, options.values
            );
            return getDocumentClass("ActiveEffect").create(effectData as never, { parent: actor, keepId: true });
          },
        });
        // A value change doesn't re-render the HUD, so refresh the badge directly.
        if (action.type === "setValue") this.#renderPaletteControls();
      }).catch((error: unknown) => {
        console.error(`${MODULE_ID} | Status click failed`, error);
      });
      await this.#clickQueue;
    }
  }
  // fvtt-types declares TokenHUD's render-context generics on the constructor, which a concrete subclass can't satisfy.
  return StatusDurationTokenHUD as unknown as TokenHUDClass;
}
