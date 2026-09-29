/**
 * "My Class" is one tap away (prefilled default) — a second tap must not
 * silently clone it. Comparison is case-insensitive and trimmed: a teacher's
 * "my class" and "My Class" are the same class in every way that matters.
 */
export function uniqueClassroomName(name: string, existingNames: string[]): string {
  const base = name.trim();
  const taken = new Set(existingNames.map((n) => n.trim().toLowerCase()));
  if (!taken.has(base.toLowerCase())) return base;
  for (let i = 2; ; i += 1) {
    const candidate = `${base} (${i})`;
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
}
