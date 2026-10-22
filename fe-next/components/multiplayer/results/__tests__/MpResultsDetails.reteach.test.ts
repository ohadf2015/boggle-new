/**
 * The teacher's phone card arrives via next/dynamic (stubbed to null in screen suites),
 * so its replay wiring is pinned at the source; useReplayMissedWords carries the behaviour.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

const source = readFileSync(resolve(__dirname, '../MpResultsDetails.tsx'), 'utf8');

describe('MpResultsDetails — the phone card replays through the server like the wall', () => {
  it('uses the shared replay hook with this room and its own Play again', () => {
    expect(source).toMatch(/useReplayMissedWords\(\{[^}]*gameCode[^}]*onRematch: [^}]*handleRematch/);
  });

  it('never stages the words in the browser and reloads', () => {
    expect(source).not.toContain('stageReteachLessonData');
    expect(source).not.toMatch(/handleReteachRound/);
  });

  it('hands the card the replay start, its status and the way back to the full list', () => {
    expect(source).toMatch(/<ClassroomResultsCard[\s\S]*?onReteach=\{isHost \? reteach\.start : undefined\}/);
    expect(source).toMatch(/<ClassroomResultsCard[\s\S]*?reteachStatus=\{reteach\.status\}/);
    expect(source).toMatch(/<ClassroomResultsCard[\s\S]*?onRestoreFull=\{reteach\.restoreFull\}/);
  });
});
