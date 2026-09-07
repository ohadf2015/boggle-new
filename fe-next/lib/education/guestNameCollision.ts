/**
 * Duplicate DISPLAY names inside one classroom.
 *
 * This module used to guard the `profiles.username` unique index, which was the
 * wrong thing to guard. That index is global across every school on the
 * platform, so the check refused the first "Priya" in a brand-new class because
 * a student somewhere else had already used the name. `deriveGuestUsername` now
 * appends a random suffix, so internal usernames never collide and the Supabase
 * 500 is gone at its source.
 *
 * What remains is a genuinely local question: two students called Priya in the
 * SAME class can't tell their own rows apart on the roster, the live standings
 * or a report. That is worth one tap to resolve — and it is scoped to the
 * classroom, because a name being used in another school is none of this
 * student's business.
 *
 * Names are compared case- and whitespace-insensitively, since "priya" and
 * "Priya" are the same person to everyone in the room.
 */

export interface GuestNameSuggestion {
  /** True when the typed name is free in this classroom. */
  available: boolean;
  /** The name to join with — the typed one, or the next free variant. */
  name: string;
}

/** How far to count before falling back to something unguessable. */
const MAX_SUFFIX = 50;

/** What everyone in the room would consider "the same name". */
function normalize(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Check `name` against the display names already in this classroom.
 *
 * `takenNames` are DISPLAY names from the classroom roster — not usernames, and
 * not global. An empty set means an empty or brand-new class, where every name
 * is free.
 */
export function suggestAvailableGuestName(
  name: string,
  takenNames: Set<string>
): GuestNameSuggestion {
  const trimmed = name.trim();
  const taken = new Set(Array.from(takenNames, normalize));

  if (!trimmed || !taken.has(normalize(trimmed))) {
    return { available: true, name: trimmed };
  }

  // "Priya 2", "Priya 3"… — each candidate re-checked, so we never hand back a
  // name that is also taken.
  for (let n = 2; n <= MAX_SUFFIX; n++) {
    const candidate = `${trimmed} ${n}`;
    if (!taken.has(normalize(candidate))) {
      return { available: false, name: candidate };
    }
  }

  // Fifty Priyas in one class. Still answer with something usable rather than
  // looping or returning a name we know is taken.
  let fallback = `${trimmed} ${Math.floor(Math.random() * 9000) + 1000}`;
  while (taken.has(normalize(fallback))) {
    fallback = `${trimmed} ${Math.floor(Math.random() * 9000) + 1000}`;
  }
  return { available: false, name: fallback };
}
