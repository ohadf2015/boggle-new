import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WheelRushCelebration } from '../WheelRushCelebration';

const t = (k: string) => k;

describe('WheelRushCelebration', () => {
  it('renders nothing when there is no celebration', () => {
    const { container } = render(<WheelRushCelebration celebration={null} t={t} prefersReduced={false} />);
    expect(container.querySelector('[data-testid="wheel-celebration"]')).toBeNull();
  });

  it("shows the all-letters banner with the word for an 'all' celebration", () => {
    render(
      <WheelRushCelebration
        celebration={{ tier: 'all', word: 'CANTERS', key: 1 }}
        t={t}
        prefersReduced={false}
      />,
    );
    const banner = screen.getByTestId('wheel-celebration');
    expect(banner.textContent).toContain('wordWheel.allLettersUsed');
    expect(banner.textContent).toContain('CANTERS');
  });

  it("shows the almost-all banner for an 'almost' celebration", () => {
    render(
      <WheelRushCelebration
        celebration={{ tier: 'almost', word: 'CANTER', key: 2 }}
        t={t}
        prefersReduced={false}
      />,
    );
    expect(screen.getByTestId('wheel-celebration').textContent).toContain('wordWheel.almostAllLetters');
  });

  it('names the missing letter on an almost-all banner, and only there', () => {
    const tp = (k: string, p?: Record<string, string | number>) => (p ? `${k}:${p.letter}` : k);
    const { rerender } = render(
      <WheelRushCelebration celebration={{ tier: 'almost', word: 'CANTER', key: 3, missingLetter: 'S' }} t={tp} prefersReduced={false} />,
    );
    expect(screen.getByTestId('wheel-celebration').textContent).toContain('wordWheel.missingLetter:S');
    rerender(<WheelRushCelebration celebration={{ tier: 'almost', word: 'CANTER', key: 4 }} t={tp} prefersReduced={false} />);
    expect(screen.getByTestId('wheel-celebration').textContent).not.toContain('wordWheel.missingLetter');
    rerender(<WheelRushCelebration celebration={{ tier: 'all', word: 'CANTERS', key: 5, missingLetter: 'S' }} t={tp} prefersReduced={false} />);
    expect(screen.getByTestId('wheel-celebration').textContent).not.toContain('wordWheel.missingLetter');
  });

  it('shows the base streak badge below the on-fire threshold', () => {
    render(
      <WheelRushCelebration
        celebration={{ tier: 'all', word: 'CANTERS', key: 3, streak: 3 }}
        t={t}
        prefersReduced={false}
      />,
    );
    const banner = screen.getByTestId('wheel-celebration');
    expect(banner.textContent).toContain('wordWheel.streakBadge');
    expect(banner.textContent).not.toContain('wordWheel.onFireBadge');
  });

  it('escalates to the on-fire badge at a streak of 4+', () => {
    render(
      <WheelRushCelebration
        celebration={{ tier: 'all', word: 'CANTERS', key: 4, streak: 4 }}
        t={t}
        prefersReduced={false}
      />,
    );
    const banner = screen.getByTestId('wheel-celebration');
    expect(banner.textContent).toContain('wordWheel.onFireBadge');
    expect(banner.textContent).not.toContain('wordWheel.streakBadge');
  });

  it("shows the distinct golden-word reveal for a 'golden' celebration", () => {
    render(<WheelRushCelebration celebration={{ tier: 'golden', word: 'RETAINS', key: 3 }} t={t} prefersReduced={false} />);
    const banner = screen.getByTestId('wheel-celebration');
    expect(banner.getAttribute('data-tier')).toBe('golden');
    expect(banner.textContent).toContain('wordWheel.golden.reveal');
    expect(banner.textContent).not.toContain('wordWheel.allLettersUsed');
  });
});
