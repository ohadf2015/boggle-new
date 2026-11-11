import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

/** startGame lands before the in-game views mount, so the room socket hook is the race list's only round writer. */
const hook = readFileSync(resolve(__dirname, '../useMultiplayerSocket.ts'), 'utf8');

describe('Lesson Word Race reaches the client on every start path', () => {
  it('Given any startGame (start, retry, reconnect, late join, recovery), When it lands, Then the claim list is replaced from it', () => {
    const i = hook.indexOf("listen('startGame'");
    expect(i).toBeGreaterThan(-1);
    expect(hook.slice(i, i + 4000)).toMatch(/ingestLessonClaimsRound\(data\)/);
  });

  it('Given a live claim, When the room hears it, Then the store ingests it before any in-game view mounts', () => {
    expect(hook).toMatch(/listen\(LESSON_WORD_CLAIMED_EVENT,\s*ingestLessonClaim\)/);
  });
});
