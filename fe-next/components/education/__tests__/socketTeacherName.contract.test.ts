/**
 * Socket-identity contract (regression: #1007 class, t_dc4e8fe6 slice 1).
 *
 * teacherName on `createClassroomGame` is UsernameSchema server-side: no `@`,
 * max 30 chars. A magic-link teacher with an empty display_name who sends
 * `display_name || email` raw gets their payload rejected and the room never
 * appears — the CREATE ROOM silent no-op PR #1007 fixed in the classic lobby.
 *
 * The express lobby (PLAY NOW) re-derives the name on its own line, so the
 * pattern came back there. This contract pins BOTH lobbies to the shared
 * `socketTeacherName` sanitizer — source patterns, because the failure is a
 * payload shape, not a render.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (rel: string) =>
  readFileSync(resolve(__dirname, '..', '..', '..', rel), 'utf8');

const LOBBIES = [
  'components/education/ClassroomGameLobby.tsx',
  'components/education/ClassroomGameLobbyExpress.tsx',
];

describe('socket teacherName contract (#1007 class)', () => {
  for (const rel of LOBBIES) {
    it(`${rel} routes teacherName through socketTeacherName`, () => {
      const source = read(rel);
      expect(source).toMatch(/socketTeacherName\(/);
    });

    it(`${rel} never builds a socket identity from display_name || email`, () => {
      const source = read(rel);
      // The raw pattern that 400s the payload: an email straight into a
      // username-scoped field. Lines that are display-only (profile pages)
      // don't live in these two files.
      expect(source).not.toMatch(/display_name\s*\|\|\s*user\??\.email/);
    });
  }
});
