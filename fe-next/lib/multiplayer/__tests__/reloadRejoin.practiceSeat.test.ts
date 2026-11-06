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
