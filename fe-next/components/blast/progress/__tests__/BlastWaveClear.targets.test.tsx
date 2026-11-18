import './testT';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import gsap from 'gsap';

vi.mock('@/contexts/SoundEffectsContext', () => ({ useSoundEffects: () => ({ playAchievementSound: vi.fn(), playCountdownBeep: vi.fn() }) }));

import { BlastWaveClear } from '../BlastWaveClear';

const base = {
  wave: 3,
  waveScore: 240,
  words: 9,
  clearPct: 96,
  runScoreBefore: 400,
  runCoinsBefore: 30,
  runDiamondsBefore: 1,
  waveDiamonds: 0,
  recordWave: 0,
  onContinue: vi.fn(),
  autoContinueMs: 60000,
};

function recordTimelineTargets() {
  const targets: string[] = [];
  const timeline: Record<string, unknown> = {};
  for (const method of ['to', 'from', 'fromTo', 'set']) {
    timeline[method] = (target: unknown) => {
      if (typeof target === 'string') targets.push(target);
      return timeline;
    };
  }
  timeline.add = () => timeline;
  vi.spyOn(gsap, 'timeline').mockReturnValue(timeline as unknown as ReturnType<typeof gsap.timeline>);
  return targets;
}

const missingFrom = (targets: string[]) => targets.filter((selector) => !document.querySelector(selector));

describe('BlastWaveClear animation targets', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('animates only elements on screen for a one-star wave with no gems and no best word', async () => {
    const targets = recordTimelineTargets();
    render(<BlastWaveClear {...base} reward={{ coins: 50, stars: 1 }} />);
    await waitFor(() => expect(targets.length).toBeGreaterThan(0));
    expect(missingFrom(targets)).toEqual([]);
  });

  it('still animates the confetti, found gems and best word when the wave has them', async () => {
    const targets = recordTimelineTargets();
    render(<BlastWaveClear {...base} reward={{ coins: 50, stars: 3 }} waveGems={{ emerald: 2 }} bestWord="jumping" />);
    await waitFor(() => expect(targets.length).toBeGreaterThan(0));
    expect(missingFrom(targets)).toEqual([]);
    expect(targets).toEqual(expect.arrayContaining(['[data-clear="confetti"]', '[data-gem-found="true"]', '[data-reveal="tile"]']));
  });
});
