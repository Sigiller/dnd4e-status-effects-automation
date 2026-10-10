import { localize } from "../i18n.js";
import { getStatusOptions, onStatusOptionsChange, setStatusOptions } from "../status-options.js";
import { statusEffects } from "../types/dnd4e.js";
import { createRoot, type Root } from "react-dom/client";
import { renderStatusSettings } from "./mount.js";
import { NONE, buildStatusRows, rowsToStatusOptions } from "./status-rows.js";
import type { DurationOption } from "./StatusSettingsRoot.js";

const { ApplicationV2 } = foundry.applications.api;

const ROOT_CLASS = "dsea-status-settings-root";

function durationOptions(): DurationOption[] {
  const options: DurationOption[] = [{ value: NONE, label: localize("DSEA.DurationNone") }];
  for (const [id, config] of Object.entries(CONFIG.DND4E.durationType)) {
    if (id !== "custom") options.push({ value: id, label: localize(config.label) });
  }
  return options;
}

/** GM settings window: per status, whether it shows in the Token HUD palette and its default duration. */
export class StatusSettingsApp extends ApplicationV2 {
  static override DEFAULT_OPTIONS = {
    id: "dsea-status-settings",
    classes: ["dsea-status-settings"],
    tag: "div",
    window: {
      title: "DSEA.Settings.StatusOptions.Name",
      icon: "fa-solid fa-list-check",
      contentClasses: ["standard-form"],
      resizable: true,
    },
    position: { width: 700, height: 680 },
  };

  protected override async _renderHTML(_context: object, _options: unknown): Promise<HTMLElement> {
    const root = document.createElement("div");
    root.className = ROOT_CLASS;
    return root;
  }

  protected override async _replaceHTML(result: HTMLElement, content: HTMLElement, _options: unknown): Promise<void> {
    if (content.querySelector(`:scope > .${ROOT_CLASS}`)) return;
    content.replaceChildren(result);
  }

  /** This window's own React root; a second window (same id) must not share or unmount it. */
  #reactRoot: Root | null = null;

  /** Removes the listener re-rendering the form when the setting changes elsewhere. */
  #stopListening: (() => void) | null = null;

  protected override async _onRender(context: object, options: unknown): Promise<void> {
    // @ts-expect-error ApplicationV2._onRender accepts DeepPartial render options at runtime.
    await super._onRender(context, options);
    const host = this.element?.querySelector(`.${ROOT_CLASS}`);
    if (!(host instanceof HTMLElement)) return;
    this.#reactRoot ??= createRoot(host);
    this.#stopListening ??= onStatusOptionsChange(() => this.#renderForm());
    this.#renderForm();
  }

  #renderForm(): void {
    if (!this.#reactRoot) return;
    renderStatusSettings(this.#reactRoot, {
      initialRows: buildStatusRows(statusEffects(), getStatusOptions(), localize, (a, b) =>
        a.localeCompare(b, game.i18n?.lang)
      ),
      durationOptions: durationOptions(),
      onSave: async (rows) => {
        await setStatusOptions(rowsToStatusOptions(rows));
        await this.close();
      },
    });
  }

  protected override async _onClose(options: unknown): Promise<void> {
    this.#stopListening?.();
    this.#stopListening = null;
    this.#reactRoot?.unmount();
    this.#reactRoot = null;
    // @ts-expect-error ApplicationV2._onClose accepts DeepPartial render options at runtime.
    await super._onClose(options);
  }
}
