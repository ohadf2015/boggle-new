import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ProfileXpBar } from '../ProfileXpBar';

vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, dir: 'ltr' }) }));

const xp = (inLevel: number) => ({ currentLevel: 3, xpInCurrentLevel: inLevel, xpNeededForNextLevel: 200, progressPercent: inLevel / 2, isMaxLevel: false }) as never;

describe('ProfileXpBar', () => {
  it('is the shared spring bar: sweeps a shine when XP rises', () => {
    const { rerender } = render(<ProfileXpBar xp={xp(50)} level={3} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
    rerender(<ProfileXpBar xp={xp(90)} level={3} />);
    expect(document.querySelector('[data-part="shine"]')).toBeInTheDocument();
  });
});
