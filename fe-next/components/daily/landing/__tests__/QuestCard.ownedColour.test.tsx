/**
 * QuestCard — every daily game owns a distinct colour.
 *
 * The hub is scanned, not read: colour is what lets a returning player find the
 * game they want without parsing three titles. The colour config used to branch
 * only on `orange`, so `yellow` and `cyan` rendered identical cyan chrome — two
 * of the three daily games were visually interchangeable.
 *
 * The art also sat under a neutral near-opaque scrim, which flattened every card
 * to the same dark slate. The scrim now carries the game's own hue.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { QuestCard, type QuestCardProps } from '../QuestCard';
import { LanguageProvider } from '@/contexts/LanguageContext';

vi.mock('@/hooks/useTiltEffect', () => ({
  useTiltEffect: () => ({
    ref: { current: null },
    style: {},
    handlers: {
      onMouseEnter: vi.fn(), onMouseLeave: vi.fn(), onMouseMove: vi.fn(),
      onTouchStart: vi.fn(), onTouchMove: vi.fn(), onTouchEnd: vi.fn(),
    },
  }),
}));

vi.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({
    enableComplexAnimations: false, prefersReducedMotion: true, isLowEnd: false,
  }),
}));

vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: React.ComponentProps<'div'>) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: React.ComponentProps<'span'>) => <span {...props}>{children}</span>,
    path: (props: React.SVGProps<SVGPathElement>) => <path {...props} />,
  },
}));

const baseProps: QuestCardProps = {
  challengeId: 'demo',
  icon: <svg />,
  title: 'Demo',
  tagline: 'A demo quest',
  color: 'cyan',
  status: 'new',
  onPlay: () => {},
  buttonText: 'Start',
  timeMode: 'timed',
  timeModeLabel: 'Timed',
};

const renderCard = (props: Partial<QuestCardProps>) =>
  render(
    <LanguageProvider initialLanguage="en">
      <QuestCard {...baseProps} {...props} />
    </LanguageProvider>,
  );

/** The accent strip is the card's colour signature. */
function accentClasses(challengeId: string): string {
  const card = screen.getByTestId(`quest-card-${challengeId}`);
  const strip = card.querySelector('[data-testid="quest-card-accent"]');
  return strip?.className ?? '';
}

describe('QuestCard — one owned colour per game', () => {
  it('gives orange, yellow and cyan three different accents', () => {
    const seen = new Set<string>();

    for (const color of ['orange', 'yellow', 'cyan'] as const) {
      const { unmount } = renderCard({ color, challengeId: color });
      seen.add(accentClasses(color));
      unmount();
    }

    // Three games, three signatures. Two matching entries collapse the set.
    expect(seen.size).toBe(3);
  });

  it('tints the art scrim with the game colour instead of neutral slate', () => {
    renderCard({ color: 'orange', challengeId: 'tinted', previewImageUrl: '/x.png' });

    const overlay = screen.getByTestId('quest-card-image-overlay');
    expect(overlay.className).toMatch(/neo-orange/);
  });

  /* Colour identity comes from the accent strip, the icon and the button. The
     TITLE must not also be the accent colour once the scrim carries that hue —
     orange-on-orange over busy artwork fails WCAG AA. Accessibility is not a
     thing we trade for a stronger colour story. */
  it('keeps the title readable on the art rather than tinting it too', () => {
    renderCard({ color: 'orange', challengeId: 'titled', previewImageUrl: '/x.png' });

    const heading = screen.getByRole('heading', { name: 'Demo' });
    expect(heading.className).not.toMatch(/text-neo-orange/);
    expect(heading.className).toMatch(/text-neo-white/);
  });

  it('still tints the title when there is no artwork behind it', () => {
    renderCard({ color: 'orange', challengeId: 'plain' });

    const heading = screen.getByRole('heading', { name: 'Demo' });
    expect(heading.className).toMatch(/text-neo-orange/);
  });
});

/* A blind reviewer, judging as a player 30 days into the habit, named this as the
   single biggest weakness: all three cards carried identical visual weight, so the
   games already finished today competed with the ones still waiting. `opacity-85`
   is a 15% drop — invisible in practice. A finished game should step back so what
   is LEFT today is what the eye lands on. That is also the cheapest daily-freshness
   signal available: the hub genuinely looks different as the day progresses. */
describe('QuestCard — finished games step back', () => {
  it('visibly recedes a game already played today', () => {
    renderCard({ color: 'cyan', challengeId: 'done', status: 'won', previewImageUrl: '/x.png' });

    const card = screen.getByTestId('quest-card-done');
    const surface = card.querySelector('[role="button"]');
    expect(surface?.className).toMatch(/grayscale/);
  });

  it('leaves an unplayed game at full strength', () => {
    renderCard({ color: 'cyan', challengeId: 'todo', status: 'new', previewImageUrl: '/x.png' });

    const card = screen.getByTestId('quest-card-todo');
    const surface = card.querySelector('[role="button"]');
    expect(surface?.className).not.toMatch(/grayscale/);
  });
});
