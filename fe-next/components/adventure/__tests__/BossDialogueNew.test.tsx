/**
 * BossDialogue New Interface Tests (C2 Task)
 *
 * Tests for the new BossDialogue named export with typewriter effect,
 * inline positioning, and 48px avatar.
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { BossDialogue } from '../BossDialogue';

jest.mock('framer-motion', () => ({
  motion: { div: ({ children, ...p }: any) => <div {...p}>{children}</div> },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
jest.mock('next/image', () => {
  const MockImage = ({ src, alt, ...props }: { src: string; alt: string }) =>
    React.createElement('img', { src, alt, ...props });
  MockImage.displayName = 'MockImage';
  return { __esModule: true, default: MockImage };
});

describe('BossDialogue (new interface)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders null when no dialogue', () => {
    const { container } = render(
      <BossDialogue dialogue={null} bossAvatarUrl="/boss.png" bossName="Dragon" />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders boss avatar', () => {
    render(
      <BossDialogue dialogue="Hello!" bossAvatarUrl="/boss.png" bossName="Dragon" />
    );
    const avatar = screen.getByRole('img');
    expect(avatar).toHaveAttribute('src', '/boss.png');
  });

  it('renders dialogue text progressively (typewriter)', () => {
    render(
      <BossDialogue dialogue="Hi!" bossAvatarUrl="/boss.png" bossName="Dragon" />
    );
    // Advance one typewriter tick (45ms)
    act(() => { jest.advanceTimersByTime(45); });
    expect(screen.getByTestId('dialogue-text').textContent).toHaveLength(1);
  });

  it('shows full text after enough time passes', () => {
    render(
      <BossDialogue dialogue="Hi!" bossAvatarUrl="/boss.png" bossName="Dragon" />
    );
    // 3 chars × 45ms each = 135ms; advance past that
    act(() => { jest.advanceTimersByTime(45); }); // H
    act(() => { jest.advanceTimersByTime(45); }); // i
    act(() => { jest.advanceTimersByTime(45); }); // !
    expect(screen.getByTestId('dialogue-text').textContent).toBe('Hi!');
  });
});
