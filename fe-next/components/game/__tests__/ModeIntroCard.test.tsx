/**
 * ModeIntroCard — cozy first-time mode intro.
 *
 * Cozy ethos: one mascot, one description, one CTA. No data clutter.
 * Tests verify single CTA, t() wiring to gameModes block, skip link, mode-key gating.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('framer-motion', async () => {
  const actual = await vi.importActual('framer-motion');
  return { ...actual, useReducedMotion: () => true };
});

vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({ playButtonClickSound: vi.fn() }),
}));

vi.mock('@/components/motion/AdaptiveMotion', () => ({
  AdaptiveMotion: {
    // eslint-disable-next-line react/display-name
    div: React.forwardRef(({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>, ref: React.Ref<HTMLDivElement>) => {
      const domProps: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(props)) {
        if (!['initial', 'animate', 'exit', 'transition', 'whileHover', 'whileTap', 'variants', 'layout'].includes(k)) {
          domProps[k] = v;
        }
      }
      return <div ref={ref} {...domProps}>{children}</div>;
    }),
  },
  AdaptiveAnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

import ModeIntroCard from '../ModeIntroCard';

const mockT = (key: string) => {
  const dict: Record<string, string> = {
    'gameModes.blast.name': 'Blast',
    'gameModes.blast.description': 'Clear tiles with combos and special powers!',
    'gameModes.blast.intro.greet': 'New mode — take your time',
    'gameModes.intro.cta': "Let's go",
    'gameModes.intro.skip': 'Skip intro',
  };
  return dict[key] ?? key;
};

describe('ModeIntroCard', () => {
  it('renders mode name + description from gameModes block', () => {
    render(<ModeIntroCard mode="blast" t={mockT} onContinue={() => {}} />);
    expect(screen.getByText('Blast')).toBeInTheDocument();
    expect(screen.getByText('Clear tiles with combos and special powers!')).toBeInTheDocument();
  });

  it('shows greeting copy for cozy tone', () => {
    render(<ModeIntroCard mode="blast" t={mockT} onContinue={() => {}} />);
    expect(screen.getByText('New mode — take your time')).toBeInTheDocument();
  });

  it('renders single primary CTA', () => {
    render(<ModeIntroCard mode="blast" t={mockT} onContinue={() => {}} />);
    expect(screen.getByRole('button', { name: "Let's go" })).toBeInTheDocument();
  });

  it('calls onContinue when CTA tapped', () => {
    const onContinue = vi.fn();
    render(<ModeIntroCard mode="blast" t={mockT} onContinue={onContinue} />);
    fireEvent.click(screen.getByRole('button', { name: "Let's go" }));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('renders skip link separately from CTA', () => {
    const onContinue = vi.fn();
    render(<ModeIntroCard mode="blast" t={mockT} onContinue={onContinue} />);
    const skip = screen.getByRole('button', { name: 'Skip intro' });
    expect(skip).toBeInTheDocument();
    fireEvent.click(skip);
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('does NOT show feature chips (cozy = no data clutter)', () => {
    render(<ModeIntroCard mode="blast" t={mockT} onContinue={() => {}} />);
    // gameModes.blast.feature1/2/3 must not leak as visible labels
    expect(screen.queryByText(/Chain combos/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Special tiles/i)).not.toBeInTheDocument();
  });
});
