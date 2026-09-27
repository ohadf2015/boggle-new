/**
 * DrillBriefing tests.
 *
 * The briefing replaces the terse icon+description ready screen. A casual
 * player should instantly get: who's coaching them (persona + mascot), what
 * they do (mission), why it helps (benefit), how to play (3 steps), and a
 * warm themed CTA. Everything is i18n-keyed.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/components/motion/AdaptiveMotion', () => {
  const passthrough = (tag: string) =>
    function MockMotion({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) {
      return React.createElement(tag, props as Record<string, unknown>, children);
    };
  return {
    AdaptiveMotion: { div: passthrough('div'), button: passthrough('button'), h2: passthrough('h2'), span: passthrough('span'), p: passthrough('p') },
  };
});

vi.mock('@/components/ui/Mascot', () => ({
  Mascot: ({ variant }: { variant: string }) => <div data-testid="mascot" data-variant={variant} />,
  MASCOT_IMAGES: {},
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en', dir: 'ltr' }),
}));

import DrillBriefing from '../DrillBriefing';

describe('DrillBriefing', () => {
  const setup = (over: Partial<React.ComponentProps<typeof DrillBriefing>> = {}) => {
    const onStart = vi.fn();
    render(
      <DrillBriefing
        drillId="memory-hunt"
        level={2}
        goalText="Find 3 words from memory"
        onStart={onStart}
        {...over}
      />
    );
    return { onStart };
  };

  it('shows the drill persona, name and mission (the essentials)', () => {
    setup();
    expect(screen.getByText('brain.drills.memory-hunt.persona')).toBeInTheDocument();
    expect(screen.getByText('brain.drills.memory-hunt.name')).toBeInTheDocument();
    expect(screen.getByText('brain.drills.memory-hunt.mission')).toBeInTheDocument();
  });

  it('stays scannable — drops the verbose exposition (benefit, how-to, coach tip)', () => {
    // 2026-06-13: the briefing was a wall of text that pushed the Start button
    // below the fold. We keep mascot + mission + goal + a prominent CTA and cut
    // the rest so a casual player can start in seconds.
    setup();
    expect(screen.queryByText('brain.drills.memory-hunt.benefit')).not.toBeInTheDocument();
    expect(screen.queryByText('brain.drills.memory-hunt.coachTip')).not.toBeInTheDocument();
    expect(screen.queryByText('brain.drills.memory-hunt.step1')).not.toBeInTheDocument();
    expect(screen.queryByText('brain.drills.memory-hunt.step2')).not.toBeInTheDocument();
    expect(screen.queryByText('brain.drills.memory-hunt.step3')).not.toBeInTheDocument();
  });

  it('renders the themed mascot for the drill (existing on-brand variant)', () => {
    setup();
    // memory-hunt → 'scholar' per drillThemes
    expect(screen.getByTestId('mascot')).toHaveAttribute('data-variant', 'scholar');
  });

  it('shows the concrete goal text passed in', () => {
    setup();
    expect(screen.getByText('Find 3 words from memory')).toBeInTheDocument();
  });

  it('fires onStart when the CTA is pressed', () => {
    const { onStart } = setup();
    fireEvent.click(screen.getByText('brain.briefing.letsTrain'));
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('does not surface any "game over"-style framing', () => {
    setup();
    expect(screen.queryByText(/game over/i)).not.toBeInTheDocument();
  });
});
