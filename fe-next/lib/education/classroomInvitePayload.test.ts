import { describe, it, expect } from 'vitest';
import { classroomInvitePayload } from './classroomInvitePayload';

/**
 * COPY CODE handed students a code with no destination.
 *
 * INCIDENT (2026-08-30): the teacher dashboard's COPY CODE button put the bare
 * six characters on the clipboard. A teacher pastes that into WhatsApp or
 * Google Classroom and the student receives "C7ESL5" and nothing else — the
 * page that accepts it is /[locale]/join/[code], which the student has no way
 * to guess. Across 35 teachers and 4 classrooms the module has one membership.
 *
 * The paste has to carry the code AND where to put it.
 */
describe('classroomInvitePayload', () => {
  it('carries both the code and the address that accepts it', () => {
    const out = classroomInvitePayload('https://www.lexiclash.live', 'en', 'C7ESL5');
    expect(out).toContain('C7ESL5');
    expect(out).toContain('https://www.lexiclash.live/en/join/C7ESL5');
  });

  it('keeps the classroom locale in the link', () => {
    expect(classroomInvitePayload('https://www.lexiclash.live', 'he', 'ABC123')).toContain(
      '/he/join/ABC123'
    );
  });

  it('still yields the code when there is no origin to build a link from', () => {
    expect(classroomInvitePayload('', 'en', 'C7ESL5')).toBe('C7ESL5');
  });
});
