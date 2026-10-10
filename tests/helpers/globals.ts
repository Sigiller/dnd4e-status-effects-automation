/** Install or remove Foundry globals for code under test. */
const globals = globalThis as unknown as Record<string, unknown>;

export function setGlobal(name: string, value: unknown): void {
  globals[name] = value;
}

export function clearGlobals(...names: string[]): void {
  for (const name of names) Reflect.deleteProperty(globals, name);
}
