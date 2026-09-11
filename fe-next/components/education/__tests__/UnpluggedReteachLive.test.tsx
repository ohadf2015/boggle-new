import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnpluggedReteachLive } from '../UnpluggedReteachLive';
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

/** Start the clock, reveal, and call the verdict for the current word. */
function playWord(got: boolean) {
  fireEvent.click(screen.getByTestId('unplugged-start'));
  fireEvent.click(screen.getByTestId('unplugged-reteach-reveal'));
  fireEvent.click(screen.getByTestId(got ? 'unplugged-got-it' : 'unplugged-not-yet'));
}

describe('UnpluggedReteachLive', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(openMissedWordsPracticeSheet).mockReturnValue(true);
    vi.mocked(openUnpluggedReteachPrintablePack).mockReturnValue(true);
    vi.mocked(shareWithFallback).mockResolvedValue('copied');
  });

  it('renders the projector shell with the first word hidden until reveal', () => {
    render(<UnpluggedReteachLive payload={payload} />);
    expect(screen.getByTestId('unplugged-reteach-live')).toBeInTheDocument();
    expect(screen.getByTestId('unplugged-reteach-word')).toHaveAttribute('data-revealed', 'false');
    expect(screen.queryByText('neutron')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('unplugged-start'));
    fireEvent.click(screen.getByTestId('unplugged-reteach-reveal'));
    expect(screen.getByTestId('unplugged-reteach-word')).toHaveAttribute('data-revealed', 'true');
    expect(screen.getByText('neutron')).toBeInTheDocument();
  });

  it('never scrolls the page body — the shell is a locked viewport box', () => {
    render(<UnpluggedReteachLive payload={payload} />);
    // `fixed inset-0` (not h-[100dvh]) — a block still in flow sits under the
    // global app footer and pushes the document past the viewport.
    expect(screen.getByTestId('unplugged-reteach-live').className).toContain('overflow-hidden');
    expect(screen.getByTestId('unplugged-reteach-live').className).toContain('fixed inset-0');
  });

  it('starts the reveal countdown on one tap and beeps only inside the last 5s', () => {
    render(<UnpluggedReteachLive payload={payload} />);
    expect(screen.getByTestId('unplugged-ring-seconds')).toHaveTextContent('30');
    fireEvent.click(screen.getByTestId('unplugged-start'));
    expect(sfx.playRoundStartSound).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('unplugged-ring-timer')).toHaveAttribute('data-running', 'true');
    expect(screen.getByTestId('unplugged-ring-timer')).toHaveAttribute('data-urgent', 'false');
    expect(sfx.playCountdownBeep).not.toHaveBeenCalled();
  });

  it('switches the countdown preset before the clock is armed', () => {
    render(<UnpluggedReteachLive payload={payload} />);
    fireEvent.click(screen.getByTestId('unplugged-preset-45'));
    expect(screen.getByTestId('unplugged-ring-seconds')).toHaveTextContent('45');
    expect(screen.getByTestId('unplugged-preset-45')).toHaveAttribute('aria-pressed', 'true');
  });

  it('climbs the class score and streak on "class got it" and advances the word', () => {
    render(<UnpluggedReteachLive payload={payload} />);
    playWord(true);
    // 100 base + 20 streak + 50 beat-the-clock
    expect(screen.getByTestId('unplugged-score')).toHaveTextContent('170');
    expect(screen.getByTestId('unplugged-streak')).toHaveAttribute('data-streak', '1');
    expect(screen.getByTestId('unplugged-reteach-word')).toHaveAttribute('data-revealed', 'false');
    expect(sfx.playWordAcceptedSound).toHaveBeenCalledTimes(1);
  });

  it('adds a capped show-of-hands bonus when the teacher counts hands', () => {
    render(<UnpluggedReteachLive payload={payload} />);
    fireEvent.click(screen.getByTestId('unplugged-start'));
    fireEvent.click(screen.getByTestId('unplugged-reteach-reveal'));
    fireEvent.click(screen.getByTestId('unplugged-hands-up'));
    fireEvent.click(screen.getByTestId('unplugged-hands-up'));
    expect(screen.getByTestId('unplugged-hands-count')).toHaveTextContent('2');
    fireEvent.click(screen.getByTestId('unplugged-got-it'));
    expect(screen.getByTestId('unplugged-score')).toHaveTextContent('180');
  });

  it('resets the streak on "not yet" without taking points away', () => {
    render(<UnpluggedReteachLive payload={payload} />);
    playWord(true);
    playWord(false);
    expect(screen.getByTestId('unplugged-streak')).toHaveAttribute('data-streak', '0');
    expect(screen.getByTestId('unplugged-score')).toHaveTextContent('170');
  });

  it('wins with confetti and an end sticker when the class clears the list', async () => {
    render(<UnpluggedReteachLive payload={payload} />);
    playWord(true);
    playWord(true);
    const sticker = await screen.findByTestId('unplugged-finish');
    expect(sticker).toHaveAttribute('data-perfect', 'true');
    expect(sticker).toHaveTextContent('unpluggedGamePerfectHeadline');
    expect(sticker).toHaveTextContent('2/2');
    expect(fireVictoryConfetti).toHaveBeenCalledTimes(1);
    expect(sfx.playEpicVictorySound).toHaveBeenCalledTimes(1);
  });

  it('shows a non-perfect win when a word was missed, then replays from zero', async () => {
    render(<UnpluggedReteachLive payload={payload} />);
    playWord(false);
    playWord(true);
    const sticker = await screen.findByTestId('unplugged-finish');
    expect(sticker).toHaveAttribute('data-perfect', 'false');
    expect(sfx.playCrownVictorySound).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTestId('unplugged-play-again'));
    expect(screen.queryByTestId('unplugged-finish')).not.toBeInTheDocument();
    expect(screen.getByTestId('unplugged-score')).toHaveTextContent('0');
    expect(screen.getByTestId('unplugged-start')).toBeInTheDocument();
  });

  it('releases the sound-effects game gate on unmount', () => {
    const { unmount } = render(<UnpluggedReteachLive payload={payload} />);
    expect(sfx.setGameActive).toHaveBeenCalledWith(true);
    unmount();
    expect(sfx.setGameActive).toHaveBeenLastCalledWith(false);
  });

  it('keeps the mascot on screen and swaps it for the win', async () => {
    render(<UnpluggedReteachLive payload={payload} />);
    expect(screen.getByTestId('unplugged-mascot')).toHaveAttribute('data-mood', 'encouraging');
    playWord(true);
    playWord(true);
    await screen.findByTestId('unplugged-finish');
    const moods = screen.getAllByTestId('unplugged-mascot').map((n) => n.getAttribute('data-mood'));
    expect(moods).toContain('celebration');
  });

  it('prints the #957 practice sheet with missed words only', () => {
    render(<UnpluggedReteachLive payload={payload} />);
    fireEvent.click(screen.getByTestId('print-missed-words-practice-sheet'));
    expect(openMissedWordsPracticeSheet).toHaveBeenCalledTimes(1);
    const arg = vi.mocked(openMissedWordsPracticeSheet).mock.calls[0][0];
    expect(arg.missedWords).toEqual(['neutron', 'quark']);
    expect(JSON.stringify(arg)).not.toContain('Maya');
  });

  it('prints the unplugged reteach pack with QR Live deep-link', () => {
    render(<UnpluggedReteachLive payload={payload} />);
    fireEvent.click(screen.getByTestId('print-unplugged-reteach-pack'));
    expect(openUnpluggedReteachPrintablePack).toHaveBeenCalledTimes(1);
    const arg = vi.mocked(openUnpluggedReteachPrintablePack).mock.calls[0][0];
    expect(arg.missedWords).toEqual(['neutron', 'quark']);
    expect(JSON.stringify(arg)).not.toContain('Maya');
  });

  it('shares a miss-gap practice card URL for take-home PDF after Unplugged', async () => {
    render(<UnpluggedReteachLive payload={payload} />);
    fireEvent.click(screen.getByTestId('share-miss-gap-practice'));
    await waitFor(() => expect(shareWithFallback).toHaveBeenCalled());
    const arg = vi.mocked(shareWithFallback).mock.calls[0][0] as { url?: string };
    expect(arg.url).toContain('https://www.lexiclash.live/en/education/miss-gap-practice');
    expect(arg.url).toContain('neutron');
    expect(arg.url).not.toContain('Maya');
  });

  it('keeps print / pack / share reachable BEFORE word one and on the end sticker', async () => {
    render(<UnpluggedReteachLive payload={payload} />);
    expect(screen.getByTestId('unplugged-tools')).toBeInTheDocument();
    playWord(true);
    playWord(true);
    await screen.findByTestId('unplugged-finish');
    expect(screen.getByTestId('print-missed-words-practice-sheet')).toBeInTheDocument();
    expect(screen.getByTestId('print-unplugged-reteach-pack')).toBeInTheDocument();
    expect(screen.getByTestId('share-miss-gap-practice')).toBeInTheDocument();
  });

  it('shows allFound empty state when there are no missed words', () => {
    render(
      <UnpluggedReteachLive
        payload={{ ...payload, missedWords: [] }}
        educationHref="/en/education"
      />,
    );
    expect(screen.getByText('education.results.allFound')).toBeInTheDocument();
    expect(screen.queryByTestId('unplugged-reteach-reveal')).not.toBeInTheDocument();
    expect(screen.queryByTestId('unplugged-start')).not.toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Contrast gate (DESIGN-ADDENDUM 2026-09-11): every tappable control must read
  // as a control. A `bg-neo-navy` fill on the `bg-neo-navy` shell — or on the
  // `bg-neo-navy-light` HUD — is tone-on-tone and scores edge<3 in the audit,
  // because the default `border-neo` border is BLACK (1.23:1 on navy).
  // These assert the visible-edge class, which is what the audit measures.
  // ---------------------------------------------------------------------------
  describe('control contrast', () => {
    /** The audit's edge rule: a control needs a fill OR a >=3:1 border. */
    const hasVisibleEdge = (el: HTMLElement) =>
      /border-neo-cream|border-neo-cyan|bg-neo-(lime|cyan|pink|cream|white|orange|yellow)/.test(
        el.className,
      );

    it('gives the unselected countdown preset a visible edge, not navy-on-navy', () => {
      render(<UnpluggedReteachLive payload={payload} />);
      // 30s is the default, so 20s and 45s are the unselected pair.
      const unselected = screen.getByTestId('unplugged-preset-20');
      expect(unselected).toHaveAttribute('aria-pressed', 'false');
      expect(unselected.className).not.toContain('bg-neo-navy ');
      expect(hasVisibleEdge(unselected)).toBe(true);
    });

    it('separates the selected preset from the unselected one by FILL, not text alone', () => {
      render(<UnpluggedReteachLive payload={payload} />);
      const selected = screen.getByTestId('unplugged-preset-30');
      const unselected = screen.getByTestId('unplugged-preset-20');
      expect(selected).toHaveAttribute('aria-pressed', 'true');
      expect(selected.className).toContain('bg-neo-cyan');
      expect(unselected.className).not.toContain('bg-neo-cyan');
    });

    it('gives NOT YET a visible edge so it does not vanish into the navy shell', () => {
      render(<UnpluggedReteachLive payload={payload} />);
      fireEvent.click(screen.getByTestId('unplugged-start'));
      fireEvent.click(screen.getByTestId('unplugged-reteach-reveal'));
      const notYet = screen.getByTestId('unplugged-not-yet');
      expect(notYet.className).not.toContain('bg-neo-navy ');
      expect(hasVisibleEdge(notYet)).toBe(true);
    });

    it('gives both show-of-hands steppers a visible edge inside the navy-light chip', () => {
      render(<UnpluggedReteachLive payload={payload} />);
      fireEvent.click(screen.getByTestId('unplugged-start'));
      fireEvent.click(screen.getByTestId('unplugged-reteach-reveal'));
      for (const id of ['unplugged-hands-down', 'unplugged-hands-up']) {
        expect(hasVisibleEdge(screen.getByTestId(id))).toBe(true);
      }
    });

    it('gives the HUD exit and mute controls a visible edge on the navy-light header', () => {
      render(<UnpluggedReteachLive payload={payload} />);
      for (const id of ['unplugged-exit', 'unplugged-mute']) {
        expect(hasVisibleEdge(screen.getByTestId(id))).toBe(true);
      }
    });

    it('keeps PLAY AGAIN a solid filled control on the end sticker', async () => {
      render(<UnpluggedReteachLive payload={payload} />);
      playWord(true);
      playWord(true);
      await waitFor(() => expect(screen.getByTestId('unplugged-finish')).toBeInTheDocument());
      expect(hasVisibleEdge(screen.getByTestId('unplugged-play-again'))).toBe(true);
    });
  });
});
