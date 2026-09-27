/**
 * A guest's internal username must be globally unique. Their NAME is not.
 *
 * The 409 I shipped yesterday was right about the constraint and wrong about
 * the product. `profiles.username` is globally unique across every school on
 * the platform, and `deriveGuestUsername` mapped a display name straight onto
 * it — so the very first Priya in a brand-new classroom was refused because
 * some other school's Priya had joined the day before. Telling a 12-year-old
 * her own first name is taken is indefensible.
 *
 * The two things were conflated. `username` is an internal, unique handle that
 * nothing student-facing renders (the roster, banner, standings and reports all
 * resolve `display_name` first — verified in `ClassroomStudentList` via
 * `resolveDisplayName([display_name, username])`). The typed name belongs in
 * `display_name`, where duplicates are harmless.
 *
 * So the slug carries a random suffix and stops colliding at all. That removes
 * the Supabase 500 at its source: the `handle_new_user` trigger can no longer
 * violate the unique index, whatever anyone types.
 */
import { describe, it, expect } from 'vitest';
import { deriveGuestUsername } from '../guestStudent';

describe('deriveGuestUsername — globally unique', () => {
  it('never returns the same username twice for the same name', () => {
    // GIVEN thirty students all called Priya, across any number of schools
    const seen = new Set<string>();
    for (let i = 0; i < 30; i++) seen.add(deriveGuestUsername('Priya'));

    // THEN every one of them gets their own handle
    expect(seen.size).toBe(30);
  });

  it('keeps the name readable at the front', () => {
    // The handle is internal, but it still turns up in logs and support
    // tickets; an opaque blob makes every one of those harder to read.
    expect(deriveGuestUsername('Priya')).toMatch(/^priya-[a-z0-9]+$/);
    expect(deriveGuestUsername('Maya Kohn')).toMatch(/^maya_kohn-[a-z0-9]+$/);
  });

  it('does not collide even for names that slugify identically', () => {
    // GIVEN the exact case the critic hit: different capitalisation, same slug
    const a = deriveGuestUsername('Priya');
    const b = deriveGuestUsername('priya');

    // THEN they are still distinct
    expect(a).not.toBe(b);
  });

  it('stays within the column and charset the DB expects', () => {
    // GIVEN a very long name
    const out = deriveGuestUsername('A'.repeat(200));

    // THEN it is bounded and safe: the old cap was 20, and a handle that
    // overflows or carries punctuation is a write that fails at 3am
    expect(out.length).toBeLessThanOrEqual(32);
    expect(out).toMatch(/^[a-z0-9_-]+$/);
  });

  it('still returns empty for a name that slugifies to nothing', () => {
    // GIVEN punctuation or a script the slugifier strips
    // THEN we return '' so `signInAsGuestStudent` omits `username` entirely and
    // the trigger falls back to its own unique `Player_<id>` default. Inventing
    // a handle here would be a second source of truth for the same decision.
    expect(deriveGuestUsername('!!! ??? ')).toBe('');
    expect(deriveGuestUsername('   ')).toBe('');
  });

  it('is not affected by the suffix when the name is already long', () => {
    // GIVEN a name at the old 20-char cap, the suffix must still be present —
    // truncating it away would quietly reintroduce collisions
    const out = deriveGuestUsername('Bartholomew Fitzgerald');
    expect(out).toMatch(/-[a-z0-9]+$/);
  });
});
