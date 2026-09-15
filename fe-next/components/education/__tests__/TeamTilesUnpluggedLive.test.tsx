import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TeamTilesUnpluggedLive } from '../TeamTilesUnpluggedLive';
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

function flipAndJudge(got: boolean) {
  const downs = screen
    .getAllByTestId(/team-tile-\d+/)
    .filter((el) => el.getAttribute('data-face') === 'down');
  fireEvent.click(downs[0]!);
  fireEvent.click(screen.getByTestId(got ? 'team-tiles-got-it' : 'team-tiles-not-yet'));
}

describe('TeamTilesUnpluggedLive', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(openMissedWordsPracticeSheet).mockReturnValue(true);
    vi.mocked(openUnpluggedReteachPrintablePack).mockReturnValue(true);
    vi.mocked(shareWithFallback).mockResolvedValue('copied');
  });

  it('renders a locked projector shell with a face-down miss-gap tileboard', () => {
    render(<TeamTilesUnpluggedLive payload={payload} />);
    const shell = screen.getByTestId('team-tiles-unplugged-live');
    expect(shell.className).toContain('fixed inset-0');
    expect(shell.className).toContain('overflow-hidden');
    expect(screen.getByTestId('team-tiles-board')).toBeInTheDocument();
    expect(screen.queryByText('neutron')).not.toBeInTheDocument();
    expect(screen.queryByText('quark')).not.toBeInTheDocument();
  });

  it('flips a tile to reveal the word, then teacher marks', () => {
    render(<TeamTilesUnpluggedLive payload={payload} />);
    expect(screen.getByTestId('team-tiles-team-0')).toBeInTheDocument();
    expect(screen.getByTestId('team-tiles-team-1')).toBeInTheDocument();
    flipAndJudge(true);
    expect(sfx.playWordRevealSound).toHaveBeenCalled();
    expect(sfx.playWordAcceptedSound).toHaveBeenCalled();
    expect(screen.getByTestId('team-tiles-unplugged-live')).toHaveAttribute('data-phase', 'board');
    expect(screen.getByTestId('unplugged-score')).toHaveTextContent('120');
    expect(
      screen.getAllByTestId(/^team-tile-\d+$/).some((el) => el.getAttribute('data-face') === 'cleared'),
    ).toBe(true);
  });

  it('lets the teacher pick 2–4 teams before the first flip', () => {
    render(<TeamTilesUnpluggedLive payload={payload} />);
    fireEvent.click(screen.getByTestId('team-tiles-count-3'));
    expect(screen.getByTestId('team-tiles-count-3')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('team-tiles-team-2')).toBeInTheDocument();
  });

  it('finishes with Unplugged end sticker + #1045 grade passback CTA', async () => {
    render(<TeamTilesUnpluggedLive payload={payload} />);
    flipAndJudge(true);
    flipAndJudge(true);
    expect(screen.getByTestId('unplugged-finish')).toBeInTheDocument();
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
    render(
      <TeamTilesUnpluggedLive
        payload={{ ...payload, missedWords: [] }}
      />,
    );
    expect(screen.getByText('education.results.allFound')).toBeInTheDocument();
    expect(screen.queryByTestId('team-tiles-board')).not.toBeInTheDocument();
  });
});
