/** ActiveEffect change entry as stored by dnd4e 0.9 / Foundry v14 (`system.changes`). */
export interface StatusChange {
  key: string;
  type: string;
  value: string;
  phase: string;
  priority: number | null;
}

/** Ongoing damage / regeneration entry (`system.dots`); the "healing" type means regeneration. */
export interface StatusDot {
  amount: string;
  types: string[];
}

/** The part of dnd4e's ActiveEffect system data this module reads or writes. */
export interface Dnd4eEffectSystem {
  durationType: string;
  saveDC?: number | null;
  changes: StatusChange[];
  dots: StatusDot[];
}

/** A CONFIG.statusEffects entry, including the automation data this module adds. */
export interface Dnd4eStatusEffect {
  id: string;
  _id?: string;
  name: string;
  img: string;
  description?: string;
  hud?: boolean | { actorTypes?: string[] };
  system?: Partial<Pick<Dnd4eEffectSystem, "changes" | "dots">>;
}

export interface Dnd4eStatusDefinition {
  name: string;
  img: string;
  description?: string;
}

export interface Dnd4eDurationType {
  label: string;
  duration: Record<string, unknown>;
}

/** Options accepted by Actor4e#rollSave. */
export interface Dnd4eSaveOptions {
  effectSave?: boolean;
  effectId?: string;
  dc?: number;
  [key: string]: unknown;
}

/**
 * The dnd4e Actor document methods wrapped by this module. Declared as `this`-typed function properties
 * because the wrappers take them off the prototype and call them with the actor as `this`.
 */
export interface Dnd4eActorMethods {
  rollSave: (
    this: Dnd4eActor,
    event: Event | null,
    form: HTMLFormElement | null,
    options: Dnd4eSaveOptions
  ) => Promise<unknown>;
  promptEoTSavesSocket: (this: Dnd4eActor) => Promise<unknown>;
}

export type Dnd4eActor = Actor.Implementation & Dnd4eActorMethods;

export interface Dnd4eGlobal {
  applications: {
    apps: {
      CustomStatusConfig?: { LEGACY_STATUSES?: Record<string, Dnd4eStatusDefinition> };
    };
  };
}

const PC_TYPE = "Player Character";

/** Single documented cast point for dnd4e ActiveEffect system data. */
export function getEffectSystem(effect: ActiveEffect.Implementation): Dnd4eEffectSystem {
  return effect.system as unknown as Dnd4eEffectSystem;
}

export function isPlayerCharacterType(actorType: string): boolean {
  return actorType === PC_TYPE;
}

/** CONFIG.statusEffects typed as the dnd4e entries it holds (an array proxy also keyed by status id). */
export function statusEffects(): Dnd4eStatusEffect[] & Record<string, Dnd4eStatusEffect | undefined> {
  return CONFIG.statusEffects as unknown as Dnd4eStatusEffect[] & Record<string, Dnd4eStatusEffect | undefined>;
}
