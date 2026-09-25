/**
 * v2: the overlay no longer presents a fake 0-100 domain score / overall tier,
 * eases difficulty visibly, and shows the Brain Check verdict for check runs.
 */
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/utils/ThemeContext', () => ({ useTheme: () => ({ theme: 'dark' }) }));
vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({ playLevelUpModalSound: vi.fn(), playAchievementSound: vi.fn() }),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

import DrillProgressionOverlay from '../DrillProgressionOverlay';
import { analyzeBrainChecks } from '@/shared/utils/brainCheck';

const DAY = 86_400_000;
const pts = (vals: number[]) => vals.map((value, i) => ({ value, at: new Date(Date.UTC(2026, 8, 1) + i * 2 * DAY).toISOString() }));
const base = { isOpen: true, onClose: vi.fn(), targetDomain: 'processingSpeed' as const };

describe('DrillProgressionOverlay v2', () => {
  it('Given a training run, Then no fake /100 domain score or tier is shown', () => {
    vi.useFakeTimers();
    render(<DrillProgressionOverlay {...base} xpAwarded={40} />);
    act(() => { vi.advanceTimersByTime(2500); });
    expect(screen.queryByText('/100')).not.toBeInTheDocument();
    expect(screen.queryByText('brain.overallScore')).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  it('Given the staircase eased difficulty, Then it says so without shaming', () => {
    render(<DrillProgressionOverlay {...base} levelUp={{ newLevel: 2, previousLevel: 3 }} />);
    expect(screen.getByText('brain.drills.levelEased')).toBeInTheDocument();
  });

  it('Given a recorded check with too few runs, Then it shows how many checks remain', () => {
    render(<DrillProgressionOverlay {...base} brainCheck={{ status: 'recorded', analysis: analyzeBrainChecks(pts([5, 6])) }} />);
    expect(screen.getByTestId('brain-check-result')).toBeInTheDocument();
    expect(screen.getByText('brain.check.needMoreRuns')).toBeInTheDocument();
  });

  it('Given a reliable improvement, Then the improved verdict is shown', () => {
    render(<DrillProgressionOverlay {...base} brainCheck={{ status: 'recorded', analysis: analyzeBrainChecks(pts([8, 10, 11, 12, 13, 15, 16])) }} />);
    expect(screen.getByText('brain.check.verdict.improved')).toBeInTheDocument();
  });

  it('Given a check inside the cooldown, Then it explains it counted as practice', () => {
    render(<DrillProgressionOverlay {...base} brainCheck={{ status: 'rejected', analysis: null }} />);
    expect(screen.getByText('brain.check.rejected')).toBeInTheDocument();
  });

  it('Given a check result, Then the overlay does not auto-close', () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    render(<DrillProgressionOverlay {...base} onClose={onClose} brainCheck={{ status: 'rejected', analysis: null }} />);
    act(() => { vi.advanceTimersByTime(10_000); });
    expect(onClose).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
