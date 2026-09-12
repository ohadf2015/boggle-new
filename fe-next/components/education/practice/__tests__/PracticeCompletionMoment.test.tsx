import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PracticeCompletionMoment from '../PracticeCompletionMoment';

const playSound = vi.fn();
const fireVictoryConfetti = vi.fn();
const fireRankConfetti = vi.fn();

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params ? `${key}:${JSON.stringify(params)}` : key,
    dir: 'ltr',
    language: 'en',
  }),
}));

vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({ playSound }),
}));

vi.mock('@/utils/confettiUtils', () => ({
  fireVictoryConfetti: () => fireVictoryConfetti(),
  fireRankConfetti: (...args: unknown[]) => fireRankConfetti(...args),
}));

let skipAnimations = false;
vi.mock('@/components/motion/AdaptiveMotion', async () => {
  const React = await import('react');
  const passthrough = (tag: string) => {
    const Passthrough = ({ children, initial, animate, transition, variants, exit, ...rest }: any) =>
      React.createElement(tag, rest, children);
    Passthrough.displayName = `Passthrough(${tag})`;
    return Passthrough;
  };
  return {
    AdaptiveMotion: { div: passthrough('div'), span: passthrough('span'), p: passthrough('p') },
    useSkipAnimations: () => skipAnimations,
  };
});

vi.mock('@/components/ui/Mascot', () => ({
  Mascot: ({ variant }: { variant: string }) => <div data-testid="mascot" data-variant={variant} />,
}));

const baseProps = {
  correct: 9,
  total: 10,
  onAgain: vi.fn(),
  onBack: vi.fn(),
};

describe('PracticeCompletionMoment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    skipAnimations = false;
  });

  it('renders three filled stars for a gold round', () => {
    render(<PracticeCompletionMoment {...baseProps} />);
    expect(screen.getByTestId('practice-completion')).toBeInTheDocument();
    expect(screen.getByTestId('practice-completion-stars')).toHaveAttribute('data-stars', '3');
    expect(screen.getAllByTestId(/practice-completion-star-\d/)).toHaveLength(3);
  });

  it('renders one filled star for a weak round — finishing still counts', () => {
    render(<PracticeCompletionMoment {...baseProps} correct={1} total={10} />);
    expect(screen.getByTestId('practice-completion-stars')).toHaveAttribute('data-stars', '1');
  });

  it('plays the rank stinger exactly once on mount', () => {
    const { rerender } = render(<PracticeCompletionMoment {...baseProps} />);
    rerender(<PracticeCompletionMoment {...baseProps} />);
    expect(playSound).toHaveBeenCalledTimes(1);
    expect(playSound).toHaveBeenCalledWith('epicVictory', expect.objectContaining({ requiresGameActive: false }));
  });

  it('fires victory confetti for a gold round', () => {
    render(<PracticeCompletionMoment {...baseProps} />);
    expect(fireVictoryConfetti).toHaveBeenCalledTimes(1);
  });

  it('stays silent of confetti on a bronze round but still plays its sound', () => {
    render(<PracticeCompletionMoment {...baseProps} correct={1} total={10} />);
    expect(fireVictoryConfetti).not.toHaveBeenCalled();
    expect(fireRankConfetti).not.toHaveBeenCalled();
    expect(playSound).toHaveBeenCalledWith('questComplete', expect.anything());
  });

  it('skips confetti entirely when motion is reduced, but keeps the sound', () => {
    skipAnimations = true;
    render(<PracticeCompletionMoment {...baseProps} />);
    expect(fireVictoryConfetti).not.toHaveBeenCalled();
    expect(playSound).toHaveBeenCalledTimes(1);
  });

  it('shows the mascot reacting to the rank', () => {
    render(<PracticeCompletionMoment {...baseProps} correct={1} total={10} />);
    expect(screen.getByTestId('mascot')).toHaveAttribute('data-variant', 'encouraging');
  });

  it('shows the XP payout when XP was earned', () => {
    render(<PracticeCompletionMoment {...baseProps} xpEarned={40} />);
    expect(screen.getByTestId('practice-completion-xp')).toHaveTextContent('40');
  });

  it('hides the XP payout when nothing was earned', () => {
    render(<PracticeCompletionMoment {...baseProps} xpEarned={0} />);
    expect(screen.queryByTestId('practice-completion-xp')).not.toBeInTheDocument();
  });

  it('offers AGAIN always and NEXT only when a next round exists', () => {
    const { rerender } = render(<PracticeCompletionMoment {...baseProps} />);
    expect(screen.getByTestId('practice-completion-again')).toBeInTheDocument();
    expect(screen.queryByTestId('practice-completion-next')).not.toBeInTheDocument();

    const onNext = vi.fn();
    rerender(<PracticeCompletionMoment {...baseProps} onNext={onNext} nextLabel="Spelling" />);
    fireEvent.click(screen.getByTestId('practice-completion-next'));
    expect(onNext).toHaveBeenCalled();
  });

  it('calls back through AGAIN', () => {
    const onAgain = vi.fn();
    render(<PracticeCompletionMoment {...baseProps} onAgain={onAgain} />);
    fireEvent.click(screen.getByTestId('practice-completion-again'));
    expect(onAgain).toHaveBeenCalled();
  });

  /*
   * i18n: the XP endpoint returns a masteryMessage built from English template
   * literals in backend/modules/educationXpManager.ts ("You discovered 5 new
   * vocabulary words!"). It used to be printed verbatim on this card, so a
   * Hebrew, Japanese or Russian student read one English sentence in the middle
   * of the one screen meant to be the reward — and it only ever restated the
   * stat grid sitting directly beneath it. The card now ignores it entirely:
   * even a caller that still passes it must not put it on screen.
   */
  it('never prints the server-authored English mastery line', () => {
    const serverCopy = 'You discovered 5 new vocabulary words!';
    render(
      <PracticeCompletionMoment
        {...baseProps}
        {...({ masteryMessage: serverCopy } as Record<string, unknown>)}
      />
    );
    expect(screen.queryByText(serverCopy)).toBeNull();
  });

  it('renders extra per-mode stats when supplied', () => {
    render(
      <PracticeCompletionMoment
        {...baseProps}
        stats={[{ key: 'words', label: 'Words', value: '14' }]}
      />
    );
    expect(screen.getByTestId('practice-completion-stat-words')).toHaveTextContent('14');
  });
  /*
   * Contrast (design addendum): the tertiary "all games" action keeps the navy
   * fill of the card it sits on, so its BORDER is the only thing that can make
   * it read as a control. A black border on navy measures 1.2:1 — invisible to
   * an audit and nearly invisible to a student.
   */
  it('gives the tertiary action a border that survives the navy card', () => {
    render(<PracticeCompletionMoment {...baseProps} />);
    const back = screen.getByTestId('practice-completion-exit');
    expect(back.className).toContain('border-neo-cream');
    expect(back.className).not.toMatch(/border-black(?!\/)/);
  });
});

/*
 * Decision fatigue (design addendum + r2 critic). The card used to end on three
 * buttons: NEXT, then AGAIN and ALL GAMES as equal-width siblings on the row
 * below. Three next-steps of near-equal weight is not a payoff, it is a menu —
 * and the critic disqualified the round for it. There is now exactly ONE
 * dominant action; the single remaining choice is visibly smaller and narrower,
 * and leaving is a corner control, not a third button.
 */
describe('PracticeCompletionMoment — one dominant action', () => {
  it('marks exactly one button as the primary action, with or without a next round', () => {
    const { container, rerender } = render(<PracticeCompletionMoment {...baseProps} />);
    expect(container.querySelectorAll('[data-primary="true"]')).toHaveLength(1);

    rerender(<PracticeCompletionMoment {...baseProps} onNext={vi.fn()} nextLabel="Spelling" />);
    expect(container.querySelectorAll('[data-primary="true"]')).toHaveLength(1);
    expect(screen.getByTestId('practice-completion-next')).toHaveAttribute('data-primary', 'true');
  });

  it('keeps the action row to one primary plus at most one smaller choice', () => {
    const { container, rerender } = render(
      <PracticeCompletionMoment {...baseProps} onNext={vi.fn()} nextLabel="Spelling" />
    );
    const row = container.querySelector('[data-testid="practice-completion-actions"]');
    expect(row).not.toBeNull();
    expect(row!.querySelectorAll('button')).toHaveLength(2);

    // Nowhere to go next: the replay becomes the primary and nothing follows it.
    rerender(<PracticeCompletionMoment {...baseProps} />);
    const soloRow = container.querySelector('[data-testid="practice-completion-actions"]')!;
    expect(soloRow.querySelectorAll('button')).toHaveLength(1);
  });

  it('moves leaving out of the action stack and into a labelled corner control', () => {
    const onBack = vi.fn();
    const { container } = render(
      <PracticeCompletionMoment {...baseProps} onBack={onBack} onNext={vi.fn()} nextLabel="Spelling" />
    );
    const exit = screen.getByTestId('practice-completion-exit');
    expect(exit).toHaveAttribute('aria-label');
    // Bordered so it still reads as a control on the navy card.
    expect(exit.className).toContain('border-neo-cream');
    expect(container.querySelector('[data-testid="practice-completion-actions"]')!.contains(exit)).toBe(false);
    fireEvent.click(exit);
    expect(onBack).toHaveBeenCalled();
  });
});

/*
 * Overlays (pitfalls Class 1 + design addendum "no stacked prompts over the
 * primary action"): a level-up used to open a full-screen modal ON TOP of the
 * completion card the student had just earned, hiding the stars, the XP and the
 * one button. The level-up now folds INTO the card as a banner, and the card
 * tells the session it has been shown so the modal never opens behind it.
 */
describe('PracticeCompletionMoment — level up folds in', () => {
  it('renders the level-up as a banner on the card and acknowledges it once', async () => {
    const { PracticeCelebrationProvider } = await import('../PracticeCelebrationContext');
    const acknowledge = vi.fn();
    render(
      <PracticeCelebrationProvider levelUp={{ oldLevel: 2, newLevel: 3 }} onAcknowledge={acknowledge}>
        <PracticeCompletionMoment {...baseProps} />
      </PracticeCelebrationProvider>
    );
    expect(screen.getByTestId('practice-completion-levelup')).toHaveTextContent('3');
    expect(acknowledge).toHaveBeenCalledTimes(1);
  });

  it('shows no banner when the round did not level the student up', async () => {
    const { PracticeCelebrationProvider } = await import('../PracticeCelebrationContext');
    render(
      <PracticeCelebrationProvider levelUp={null} onAcknowledge={vi.fn()}>
        <PracticeCompletionMoment {...baseProps} />
      </PracticeCelebrationProvider>
    );
    expect(screen.queryByTestId('practice-completion-levelup')).toBeNull();
  });
});

/*
  Border colour by surface (design-cards measurement, 2026-09-11 17:55): a black
  border on navy is 1.23:1 against the navy the card lands on, so the card had
  no visible edge on the one screen that is supposed to feel like a prize. Cards
  on navy take a cream border and the lighter navy fill, the way the round-end
  reference card does.
*/
describe('PracticeCompletionMoment card edge', () => {
  it('reads as a card on a navy surface: cream border, lighter fill', () => {
    render(
      <PracticeCompletionMoment correct={5} total={6} onAgain={vi.fn()} onBack={vi.fn()} />
    );
    const card = screen.getByTestId('practice-completion');
    expect(card.className).toContain('border-neo-cream');
    expect(card.className).toContain('bg-neo-navy-light');
    expect(card.className).not.toContain('border-black');
  });
});
