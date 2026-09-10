/**
 * Guests who hit /education/classroom-game from NoAccountCta must not be
 * dumped into TeacherGate → /education/access (signup) or back to the hub.
 *
 * Source-scanned: the page is a client tree whose imports pull auth + lobby,
 * and the question is structural — is there an unauthenticated branch that
 * skips TeacherGate.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SRC = readFileSync(
  join(__dirname, '..', 'PageClient.tsx'),
  'utf8',
);

describe('classroom-game guest entry', () => {
  it('renders a guest demo when the visitor is not signed in', () => {
    expect(SRC).toMatch(/ClassroomGuestDemo/);
  });

  it('does not send anonymous visitors to /education/access', () => {
    expect(SRC).not.toMatch(/education\/access/);
  });

  it('does not bounce anonymous visitors to consumer quick-play', () => {
    expect(SRC).not.toMatch(/multiplayer\?quickPlay=true/);
  });

  it('still wraps the teacher lobby in TeacherGate', () => {
    expect(SRC).toMatch(/<TeacherGate>/);
  });
});
