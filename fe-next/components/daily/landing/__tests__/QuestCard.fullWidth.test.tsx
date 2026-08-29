/**
 * The daily hub stacks its quest cards in a `flex flex-col items-center`
 * column. `items-center` makes every child shrink to its intrinsic content
 * width unless it opts out, and only the *played* hero rows carried `w-full`.
 * The result on production (390px viewport, /he/daily): Word Wheel measured
 * 219px, Word Tower 349px and the played Word Hunt hero 360px — three cards
 * in a chain, three different widths.
 *
 * The inner card already has `w-full`, but it only fills the wrapper, and the
 * wrapper was the element being shrunk. The width has to be asserted on the
 * outer wrapper (the `data-testid="quest-card-*"` node).
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { QuestCard, QuestCardProps } from '../QuestCard';
import { LanguageProvider } from '@/contexts/LanguageContext';

vi.mock('@/hooks/useTiltEffect', () => ({
  useTiltEffect: () => ({
    ref: { current: null },
    style: {},
    handlers: {
      onMouseEnter: vi.fn(),
      onMouseLeave: vi.fn(),
      onMouseMove: vi.fn(),
      onTouchStart: vi.fn(),
      onTouchMove: vi.fn(),
      onTouchEnd: vi.fn(),
    },
  }),
}));

vi.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({
    enableComplexAnimations: false,
    prefersReducedMotion: true,
    isLowEnd: false,
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
  challengeId: 'wordTower',
  icon: <span>icon</span>,
  title: 'Word Tower',
  tagline: 'Stack words as high as you can',
  color: 'cyan',
  status: 'new',
  onPlay: vi.fn(),
  buttonText: 'START QUEST',
  timeMode: 'relaxed',
  timeModeLabel: 'Relaxed Quest',
};

const renderCard = (props: Partial<QuestCardProps> = {}) =>
  render(
    <LanguageProvider initialLanguage="en">
      <QuestCard {...baseProps} {...props} />
    </LanguageProvider>,
  );

describe('QuestCard — width parity in the quest chain', () => {
  it('stretches the outer wrapper to the column width', () => {
    renderCard();
    expect(screen.getByTestId('quest-card-wordTower').className).toContain('w-full');
  });

  it('does the same with a mascot background (the daily hub configuration)', () => {
    renderCard({ previewImageUrl: '/daily/word-tower-mascot.jpg' });
    expect(screen.getByTestId('quest-card-wordTower').className).toContain('w-full');
  });

  it('does not depend on how long the tagline is', () => {
    renderCard({ challengeId: 'wordWheel', tagline: 'Spin.' });
    expect(screen.getByTestId('quest-card-wordWheel').className).toContain('w-full');
  });
});
