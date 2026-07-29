/**
 * Tests the pure mapper that feeds ResultsPage's MP Blast results view
 * (buildBlastMpResults). Rendering the full ResultsPage requires a large web of
 * contexts/hooks; the mapping — especially the local-only board-cleared badge —
 * is the behavior worth locking, so we test the real exported helper directly.
 */
import { describe, it, expect } from 'vitest';
import { buildBlastMpResults } from '@/components/blast/legacy/BlastMpResults';

describe('buildBlastMpResults (ResultsPage MP blast mapping)', () => {
  const scores = [
    { username: 'player1', score: 100, wordsFoundCount: 5 },
    { username: 'player2', score: 80, wordsFoundCount: 4 },
  ];

  it('maps scoreboard rows to BlastMpPlayerResult and flags the local player', () => {
    const out = buildBlastMpResults(scores, { boardClearedByLocal: false, localUsername: 'player1' });
    expect(out).toEqual([
      { username: 'player1', score: 100, wordsFoundCount: 5, isCurrentPlayer: true, boardCleared: false },
      { username: 'player2', score: 80, wordsFoundCount: 4, isCurrentPlayer: false, boardCleared: false },
    ]);
  });

  it('marks ONLY the local player boardCleared when the local board-clear flag is set', () => {
    const out = buildBlastMpResults(scores, { boardClearedByLocal: true, localUsername: 'player1' });
    expect(out.find(p => p.username === 'player1')?.boardCleared).toBe(true);
    expect(out.find(p => p.username === 'player2')?.boardCleared).toBe(false);
  });

  it('never marks boardCleared when the flag is false even for the local player', () => {
    const out = buildBlastMpResults(scores, { boardClearedByLocal: false, localUsername: 'player1' });
    expect(out.every(p => p.boardCleared === false)).toBe(true);
  });

  it('defaults missing wordsFoundCount to 0', () => {
    const out = buildBlastMpResults([{ username: 'p', score: 10 }], { boardClearedByLocal: false });
    expect(out[0].wordsFoundCount).toBe(0);
  });
});
