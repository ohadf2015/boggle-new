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
    const back = screen.getByTestId('practice-completion-back');
    expect(back.className).toContain('border-neo-cream');
    expect(back.className).not.toMatch(/border-black(?!\/)/);
  });
});
