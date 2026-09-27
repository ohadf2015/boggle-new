import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClassicUnpluggedLive } from '../ClassicUnpluggedLive';
import { openMissedWordsPracticeSheet } from '@/lib/education/missedWordsPracticeSheet';
import { openUnpluggedReteachPrintablePack } from '@/lib/education/unpluggedReteachPrintablePack';
import { shareWithFallback } from '@/utils/shareWithFallback';
import { fireVictoryConfetti } from '@/utils/confettiUtils';
import type { ClassGapSharePayload } from '@/lib/education/classGapShare';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    t: (key: string, params?: Record<string, string | number>) =>
      params ? `${key}:${JSON.stringify(params)}` : key,
  }),
}));

const sfx = {
  setGameActive: vi.fn(),
  playCountdownBeep: vi.fn(),
  playRoundStartSound: vi.fn(),
  playTimesUpSound: vi.fn(),
  playWordRevealSound: vi.fn(),
  playWordAcceptedSound: vi.fn(),
  playStreakMilestoneSound: vi.fn(),
  playStreakFireSound: vi.fn(),
  playComboBreakSound: vi.fn(),
  playButtonClickSound: vi.fn(),
  playCrownVictorySound: vi.fn(),
  playEpicVictorySound: vi.fn(),
};

vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => sfx,
}));

vi.mock('@/hooks/useMasterMute', () => ({
  useMasterMute: () => ({ allMuted: false, toggle: vi.fn(), label: 'Mute', title: 'Sound on' }),
}));

vi.mock('@/utils/confettiUtils', () => ({
  fireVictoryConfetti: vi.fn(),
  fireStreakConfetti: vi.fn(),
}));

vi.mock('@/lib/education/missedWordsPracticeSheet', () => ({
  openMissedWordsPracticeSheet: vi.fn().mockReturnValue(true),
}));

vi.mock('@/lib/education/unpluggedReteachPrintablePack', () => ({
  openUnpluggedReteachPrintablePack: vi.fn().mockReturnValue(true),
}));

vi.mock('@/utils/shareWithFallback', () => ({
  shareWithFallback: vi.fn().mockResolvedValue('copied'),
}));

const payload: ClassGapSharePayload = {
  locale: 'en',
  lesson: 'Physics 101',
  teacher: 'Ms. Cohen',
  found: 1,
  total: 3,
  missedWords: ['neutron', 'quark'],
};

function revealAndSubmit(got: boolean) {
  fireEvent.click(screen.getByTestId('classic-unplugged-reveal'));
  fireEvent.click(
    screen.getByTestId(got ? 'classic-unplugged-submit-got-it' : 'classic-unplugged-submit-not-yet'),
  );
}

describe('ClassicUnpluggedLive', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(openMissedWordsPracticeSheet).mockReturnValue(true);
    vi.mocked(openUnpluggedReteachPrintablePack).mockReturnValue(true);
    vi.mocked(shareWithFallback).mockResolvedValue('copied');
  });

  it('renders the projector shell with mode picker and masked word', () => {
    render(<ClassicUnpluggedLive payload={payload} />);
    expect(screen.getByTestId('classic-unplugged-live')).toBeInTheDocument();
    expect(screen.getByTestId('classic-unplugged-mode-picker')).toBeInTheDocument();
    expect(screen.getByTestId('classic-unplugged-word-mask')).toHaveAttribute('data-letters', '7');
    expect(screen.getByTestId('classic-unplugged-reveal')).toBeInTheDocument();
  });

  it('lets the teacher switch to teams then reveal and submit', () => {
    render(<ClassicUnpluggedLive payload={payload} />);
    fireEvent.click(screen.getByTestId('classic-unplugged-count-2'));
    expect(screen.getByTestId('classic-unplugged-team-0')).toBeInTheDocument();
    expect(screen.getByTestId('classic-unplugged-team-1')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('classic-unplugged-reveal'));
    expect(screen.getByTestId('classic-unplugged-word-text')).toHaveTextContent('neutron');
    fireEvent.click(screen.getByTestId('classic-unplugged-submit-got-it'));
    expect(sfx.playWordAcceptedSound).toHaveBeenCalled();
  });

  it('finishes the run with grade passback on lexiclash.live path', async () => {
    render(<ClassicUnpluggedLive payload={payload} />);
    revealAndSubmit(true);
    revealAndSubmit(true);
    expect(screen.getByTestId('classic-unplugged-live')).toHaveAttribute('data-phase', 'finished');
    const cta = screen.getByTestId('unplugged-grade-passback-open');
    const href = cta.getAttribute('href') || '';
    expect(href).toContain('/education/unplugged-grade-passback');
    expect(href).toContain('cleared=');
    expect(href).not.toContain('lexiclash.com');
    await waitFor(() => {
      expect(fireVictoryConfetti).toHaveBeenCalled();
    });
  });

  it('shows allFound when there are no missed words', () => {
    render(<ClassicUnpluggedLive payload={{ ...payload, missedWords: [] }} />);
    expect(screen.getByText('education.results.allFound')).toBeInTheDocument();
    expect(screen.queryByTestId('classic-unplugged-reveal')).not.toBeInTheDocument();
  });
});
