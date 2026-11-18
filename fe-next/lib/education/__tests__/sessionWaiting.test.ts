import { describe, expect, it } from 'vitest';
import { SESSION_WAITING_CODE, isSessionWaiting, sessionWaitingHref } from '../sessionWaiting';

describe('session waiting — an ended class code is not a retry', () => {
  it('names the server code that means wait, not game-not-found', () => {
    expect(SESSION_WAITING_CODE).toBe('CLASSROOM_SESSION_WAITING');
    expect(isSessionWaiting('CLASSROOM_SESSION_WAITING')).toBe(true);
    expect(isSessionWaiting('GAME_NOT_FOUND')).toBe(false);
  });

  it('sends the student to the class join, which enrolls them and waits for the next game', () => {
    expect(sessionWaitingHref(' abc123 ', 'he')).toBe('/he/join/ABC123');
  });

  it('sends the teacher to their dashboard, because the join page is for students', () => {
    expect(sessionWaitingHref('abc123', 'he', true)).toBe('/he/teacher');
    expect(sessionWaitingHref('abc123', '', true)).toBe('/en/teacher');
  });
});
