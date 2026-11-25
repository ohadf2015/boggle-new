// Express and the Next bundle each get their own instance of any module, so the
// one-copy-per-process registry lives on globalThis under a registered symbol.
const KEY = Symbol.for('lexiclash.sharedWordSets');

function registry(): Map<string, Set<string>> {
  const g = globalThis as { [KEY]?: Map<string, Set<string>> };
  return (g[KEY] ??= new Map());
}

export function peekSharedWordSet(language: string): Set<string> | undefined {
  const set = registry().get(language);
  return set && set.size > 0 ? set : undefined;
}

export function publishSharedWordSet(language: string, set: Set<string>): Set<string> {
  if (set.size > 0) registry().set(language, set);
  return set;
}

export function clearSharedWordSets(): void {
  registry().clear();
}
