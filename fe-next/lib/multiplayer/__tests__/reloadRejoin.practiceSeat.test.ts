import { describe, it, expect, afterEach } from 'vitest';
import { buildRejoinPayload } from '@/lib/multiplayer/reloadRejoin';

describe('buildRejoinPayload on a practice seat page', () => {
  afterEach(() => {
    delete (window as unknown as { __LC_PRACTICE_SEAT__?: boolean }).__LC_PRACTICE_SEAT__;
  });

  it('given the teacher practice page reconnects, then the rejoin asks for the practice seat, not the signed-in host seat', () => {
    (window as unknown as { __LC_PRACTICE_SEAT__?: boolean }).__LC_PRACTICE_SEAT__ = true;
    expect(buildRejoinPayload({ gameCode: 'AB12CD', username: 'Practice student' }, 'jwt')).toEqual({
      gameCode: 'AB12CD', username: 'Practice student', authToken: 'jwt', practiceSeat: true,
    });
  });

  it('given any other page, then the payload is unchanged', () => {
    expect(buildRejoinPayload({ gameCode: 'AB12CD', username: 'Dana' }, undefined)).toEqual({ gameCode: 'AB12CD', username: 'Dana' });
  });
});

describe('buildRejoinPayload on the classroom host board', () => {
  afterEach(() => {
    window.history.replaceState(null, '', '/');
  });

  it('given the host board reconnects, then the rejoin says it is the host seat so the server never seats it as a practice seat', () => {
    window.history.replaceState(null, '', '/he/education/live/host?room=AB12CD&practice=1');
    expect(buildRejoinPayload({ gameCode: 'AB12CD', username: 'Dana' }, 'jwt')).toEqual({
      gameCode: 'AB12CD', username: 'Dana', authToken: 'jwt', hostSeat: true,
    });
  });

  it('given the student page of the same room, then the rejoin carries no host claim', () => {
    window.history.replaceState(null, '', '/he/education/live?room=AB12CD');
    expect(buildRejoinPayload({ gameCode: 'AB12CD', username: 'Dana' }, undefined)).toEqual({ gameCode: 'AB12CD', username: 'Dana' });
  });
});
