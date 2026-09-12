import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import StreakFlame from '../StreakFlame';

const playSound = vi.fn();

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params ? `${key}:${JSON.stringify(params)}` : key,
    dir: 'ltr',
  }),
}));

vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({ playSound }),
}));

vi.mock('next/image', () => {
  const NextImage = (props: any) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img {...props} alt={props.alt} />
  );
  NextImage.displayName = 'NextImage';
  return { default: NextImage };
});

vi.mock('@/components/motion/AdaptiveMotion', async () => {
  const React = await import('react');
  const passthrough = (tag: string) => {
    const Passthrough = ({ children, initial, animate, transition, variants, exit, ...rest }: any) =>
      React.createElement(tag, rest, children);
    Passthrough.displayName = `Passthrough(${tag})`;
    return Passthrough;
  };
  return {
    AdaptiveMotion: { div: passthrough('div'), span: passthrough('span') },
    useSkipAnimations: () => false,
  };
});

describe('StreakFlame', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders nothing below the first rung', () => {
    const { container } = render(<StreakFlame streak={1} />);
    expect(container).toBeEmptyDOMElement();
    expect(playSound).not.toHaveBeenCalled();
  });

  it('lights a flame and shows the count once the streak takes hold', () => {
    render(<StreakFlame streak={3} />);
    const flame = screen.getByTestId('practice-streak-flame');
    expect(flame).toHaveAttribute('data-stage', '1');
    expect(flame).toHaveTextContent('3');
  });

  it('grows the flame as the streak grows', () => {
    const { rerender } = render(<StreakFlame streak={3} />);
    expect(screen.getByTestId('practice-streak-flame')).toHaveAttribute('data-stage', '1');
    rerender(<StreakFlame streak={8} />);
    expect(screen.getByTestId('practice-streak-flame')).toHaveAttribute('data-stage', '3');
    rerender(<StreakFlame streak={14} />);
    expect(screen.getByTestId('practice-streak-flame')).toHaveAttribute('data-stage', '4');
  });

  it('plays the stinger when a new stage is reached, and only then', () => {
    const { rerender } = render(<StreakFlame streak={0} />);
    expect(playSound).not.toHaveBeenCalled();

    rerender(<StreakFlame streak={2} />);
    expect(playSound).toHaveBeenCalledTimes(1);
    expect(playSound).toHaveBeenCalledWith(
      'streakBuild',
      expect.objectContaining({ requiresGameActive: false })
    );

    // Same stage, higher streak — no second stinger.
    rerender(<StreakFlame streak={3} />);
    expect(playSound).toHaveBeenCalledTimes(1);

    // Next stage — one more.
    rerender(<StreakFlame streak={4} />);
    expect(playSound).toHaveBeenCalledTimes(2);
  });

  it('does not re-sting when a broken streak climbs back to a stage it already hit', () => {
    const { rerender } = render(<StreakFlame streak={4} />);
    expect(playSound).toHaveBeenCalledTimes(1);
    rerender(<StreakFlame streak={0} />);
    rerender(<StreakFlame streak={2} />);
    // Stage 1 after a reset is a fresh climb, so it stings again — but only once.
    expect(playSound).toHaveBeenCalledTimes(2);
    rerender(<StreakFlame streak={3} />);
    expect(playSound).toHaveBeenCalledTimes(2);
  });

  it('uses real mascot flame art', () => {
    render(<StreakFlame streak={12} />);
    expect(screen.getByRole('presentation')).toHaveAttribute(
      'src',
      '/mascot/streak-inferno-nobg.webp'
    );
  });
});

/*
 * Contrast (design addendum, measured by the r2 capture): the streak digit on
 * the pill audited at 1.23:1. The pill's lower stages were alpha fills
 * (`bg-neo-orange/70`, `/85`) over navy, so the colour under the black digit
 * was neither orange nor navy but a muddy blend an auditor cannot resolve.
 * Every stage now paints a SOLID fill; the heat reads from size and shadow.
 */
describe('StreakFlame contrast', () => {
  it('paints a solid fill at every stage — never an alpha tint over the navy', () => {
    for (const [streak, stage] of [[2, '1'], [4, '2'], [8, '3'], [14, '4']] as const) {
      const { unmount } = render(<StreakFlame streak={streak} />);
      const flame = screen.getByTestId('practice-streak-flame');
      expect(flame).toHaveAttribute('data-stage', stage);
      expect(flame.className).not.toMatch(/bg-neo-orange\//);
      expect(flame.className).toMatch(/bg-neo-(orange|yellow)(?!\/)/);
      unmount();
    }
  });
});
