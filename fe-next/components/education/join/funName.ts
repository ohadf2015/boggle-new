/** A random entry from a `|`-separated list, never the one already in the field. */
export function pickFunName(list: string, current: string, random: () => number = Math.random): string {
  const names = list.split('|').map((n) => n.trim()).filter(Boolean);
  const pool = names.filter((n) => n !== current.trim());
  if (pool.length === 0) return names[0] ?? current;
  return pool[Math.floor(random() * pool.length)] ?? pool[0];
}
