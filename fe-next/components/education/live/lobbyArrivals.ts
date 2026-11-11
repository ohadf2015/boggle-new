export function newArrivals(prev: readonly string[] | null, next: readonly string[]): string[] {
  if (!prev) return [];
  const before = new Set(prev);
  return next.filter((name) => !before.has(name));
}
