/**
 * blastInsightPicker — picks the single hero insight for results screen.
 */
import { pickBlastInsight } from '../blastInsightPicker';
import type { BlastResultsData } from '../../types';

function makeResults(overrides: Partial<BlastResultsData> = {}): BlastResultsData {
  return {
    finalScore: 100,
    tilesCleared: 30,
    totalTiles: 36,
    clearPercentage: 83,
    wordsFound: ['cat', 'dog'],
    bestWord: 'CAT',
    maxCombo: 1,
    stars: 1,
    wavesCompleted: 1,
    waveResults: [],
    ...overrides,
  };
}

describe('pickBlastInsight', () => {
  it('picks masterstroke for word length 8+', () => {
    const insight = pickBlastInsight(makeResults({
      wordsFound: ['extreme', 'ELEPHANTS'], bestWord: 'ELEPHANTS', clearPercentage: 95,
    }));
    expect(insight.id).toBe('masterstroke');
    expect(insight.vars.length).toBe(9);
    expect(insight.tone).toBe('lime');
  });

  it('picks bullseye when target word found (overrides combo etc)', () => {
    const insight = pickBlastInsight(makeResults({
      targetWord: 'CRYSTAL', targetWordFound: true,
      maxCombo: 5, clearPercentage: 95,
    }));
    expect(insight.id).toBe('bullseye');
    expect(insight.vars.word).toBe('CRYSTAL');
  });

  it('picks newRecord when finalScore > previousBest', () => {
    const insight = pickBlastInsight(makeResults({
      finalScore: 1500, previousBest: 1200, clearPercentage: 95,
    }));
    expect(insight.id).toBe('newRecord');
    expect(insight.vars.delta).toBe(300);
    expect(insight.tone).toBe('lime');
  });

  it('does NOT pick newRecord when previousBest absent', () => {
    const insight = pickBlastInsight(makeResults({
      finalScore: 1500, clearPercentage: 95, maxCombo: 5,
    }));
    expect(insight.id).not.toBe('newRecord');
  });

  it('picks flawless when 3-star + 100% clear', () => {
    const insight = pickBlastInsight(makeResults({
      stars: 3, clearPercentage: 100,
    }));
    expect(insight.id).toBe('flawless');
  });

  it('picks cascadeKing for combo ≥4', () => {
    const insight = pickBlastInsight(makeResults({
      maxCombo: 5, clearPercentage: 95,
    }));
    expect(insight.id).toBe('cascadeKing');
    expect(insight.vars.combo).toBe(5);
    expect(insight.tone).toBe('cyan');
  });

  it('picks longWordHunter for ≥3 long words (when no higher trumps)', () => {
    const insight = pickBlastInsight(makeResults({
      wordsFound: ['hello', 'planet', 'rocket', 'banana'], clearPercentage: 95,
    }));
    expect(insight.id).toBe('longWordHunter');
    expect(insight.vars.count).toBe(3);
  });

  it('picks wordsmith for ≥12 short words', () => {
    const wordsFound = Array(13).fill('cat');
    const insight = pickBlastInsight(makeResults({ wordsFound, clearPercentage: 95 }));
    expect(insight.id).toBe('wordsmith');
    expect(insight.vars.count).toBe(13);
  });

  it('picks comebackKid for marginal 90-92% clear', () => {
    const insight = pickBlastInsight(makeResults({
      clearPercentage: 91, wordsFound: ['cat'],
    }));
    expect(insight.id).toBe('comebackKid');
    expect(insight.vars.pct).toBe(91);
  });

  it('falls back to survivor for any other clear ≥90%', () => {
    const insight = pickBlastInsight(makeResults({
      clearPercentage: 96, wordsFound: ['cat', 'dog'],
    }));
    expect(insight.id).toBe('survivor');
  });

  it('falls back to survivor even on fail', () => {
    // Edge: clearPercentage < 90 — picker still returns something safely
    const insight = pickBlastInsight(makeResults({
      clearPercentage: 70, wordsFound: ['cat'],
    }));
    // No higher matches, comebackKid requires ≥90, so survivor fallback
    expect(insight.id).toBe('survivor');
  });

  it('returns translation KEY not localized string', () => {
    const insight = pickBlastInsight(makeResults({ clearPercentage: 95 }));
    expect(insight.key).toMatch(/^blast\.insight\./);
  });
});
