export function localize(key: string): string {
  return game.i18n?.localize(key) ?? key;
}

export function formatMessage(key: string, data: Record<string, string | number | boolean>): string {
  const normalized = Object.fromEntries(
    Object.entries(data).map(([entryKey, value]) => [entryKey, String(value)])
  );
  return game.i18n?.format(key, normalized) ?? key;
}
