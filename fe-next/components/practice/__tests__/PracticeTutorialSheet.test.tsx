import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({ playButtonClickSound: vi.fn() }),
}));

const filterMotionProps = (props: Record<string, unknown>) => {
  const dom: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(props)) {
    if (!['initial', 'animate', 'exit', 'transition', 'whileHover', 'whileTap', 'variants'].includes(k)) dom[k] = v;
  }
  return dom;
};

vi.mock('@/components/motion/AdaptiveMotion', () => ({
  AdaptiveMotion: {
    // eslint-disable-next-line react/display-name
    div: React.forwardRef(({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>, ref: React.Ref<HTMLDivElement>) => (
      <div ref={ref} {...filterMotionProps(props)}>{children}</div>
    )),
    // eslint-disable-next-line react/display-name
    li: React.forwardRef(({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>, ref: React.Ref<HTMLLIElement>) => (
      <li ref={ref} {...filterMotionProps(props)}>{children}</li>
    )),
    // eslint-disable-next-line react/display-name
    span: React.forwardRef(({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>, ref: React.Ref<HTMLSpanElement>) => (
      <span ref={ref} {...filterMotionProps(props)}>{children}</span>
    )),
  },
}));

import PracticeTutorialSheet from '../PracticeTutorialSheet';

const t = (key: string) => {
  const dict: Record<string, string> = {
    'gameModes.tutorial.title': 'How it works',
    'gameModes.tutorial.cta': 'Got it, try it',
    'gameModes.intro.skip': 'Skip intro',
    'gameModes.classic.name': 'Classic',
    'gameModes.classic.intro.greet': 'Take your time. Just words.',
    'gameModes.classic.tutorial.tip1': 'Drag adjacent letters',
    'gameModes.classic.tutorial.tip2': 'Longer = more points',
    'gameModes.classic.tutorial.tip3': 'No timer, explore',
    'gameModes.wheelRush.name': 'Wheel Rush',
    'gameModes.wheelRush.intro.greet': 'Spin gently. Words come.',
    'gameModes.wheelRush.tutorial.tip1': 'Center letter required',
    'gameModes.wheelRush.tutorial.tip2': 'Tap any order',
    'gameModes.wheelRush.tutorial.tip3': 'Try plurals',
  };
  return dict[key] ?? key;
};

describe('PracticeTutorialSheet', () => {
  it('renders title and mode name', () => {
    render(<PracticeTutorialSheet mode="classic" t={t} onContinue={() => {}} />);
    expect(screen.getByText('How it works')).toBeInTheDocument();
    expect(screen.getByText('Classic')).toBeInTheDocument();
  });

  it('renders all three tips for the mode', () => {
    render(<PracticeTutorialSheet mode="classic" t={t} onContinue={() => {}} />);
    expect(screen.getByText('Drag adjacent letters')).toBeInTheDocument();
    expect(screen.getByText('Longer = more points')).toBeInTheDocument();
    expect(screen.getByText('No timer, explore')).toBeInTheDocument();
  });

  it('renders an icon disc per tip (3 total) — visual over numeric', () => {
    const { container } = render(<PracticeTutorialSheet mode="classic" t={t} onContinue={() => {}} />);
    // lucide icons render as svg.lucide
    const icons = container.querySelectorAll('svg.lucide');
    // 3 tips + skip omitted icons; at least 3 lucide svgs present
    expect(icons.length).toBeGreaterThanOrEqual(3);
  });

  it('switches tips per mode', () => {
    render(<PracticeTutorialSheet mode="wheelRush" t={t} onContinue={() => {}} />);
    expect(screen.getByText('Center letter required')).toBeInTheDocument();
    expect(screen.queryByText('Drag adjacent letters')).not.toBeInTheDocument();
  });

  it('fires onContinue when CTA tapped', () => {
    const onContinue = vi.fn();
    render(<PracticeTutorialSheet mode="classic" t={t} onContinue={onContinue} />);
    fireEvent.click(screen.getByRole('button', { name: 'Got it, try it' }));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('renders the intro greeting line for charm (merged from former intro card)', () => {
    render(<PracticeTutorialSheet mode="classic" t={t} onContinue={() => {}} />);
    expect(screen.getByText('Take your time. Just words.')).toBeInTheDocument();
  });

  it('renders a skip link that fires onSkip (or onContinue when omitted)', () => {
    const onContinue = vi.fn();
    const onSkip = vi.fn();
    render(<PracticeTutorialSheet mode="classic" t={t} onContinue={onContinue} onSkip={onSkip} />);
    fireEvent.click(screen.getByRole('button', { name: 'Skip intro' }));
    expect(onSkip).toHaveBeenCalledTimes(1);
    expect(onContinue).not.toHaveBeenCalled();
  });

  it('exposes a stable practice-tutorial-sheet test id for outer-flow gating', () => {
    render(<PracticeTutorialSheet mode="classic" t={t} onContinue={() => {}} />);
    expect(screen.getByTestId('practice-tutorial-sheet')).toBeInTheDocument();
  });
});
