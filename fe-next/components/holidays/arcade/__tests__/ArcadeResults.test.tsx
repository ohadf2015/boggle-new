import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: 'he' }) }));
vi.mock('next/dynamic', () => ({ default: () => () => null }));

import ArcadeResults from '../ArcadeResults';

const props = { game: 'oil' as const, headline: 'h', onAgain: vi.fn(), onHub: vi.fn() };

describe('ArcadeResults', () => {
  it('Given a guest, then there is exactly one sign-in prompt', () => {
    render(<ArcadeResults {...props} end={{ score: 50, plays: [] }} settle={{ state: 'guest' }} />);
    expect(screen.queryByText('holiday.arcade.guestCoins')).toBeNull();
    expect(screen.getAllByText(/signIn/)).toHaveLength(1);
  });

  it('Given one word in Hebrew, then the singular form is used', () => {
    render(<ArcadeResults {...props} end={{ score: 50, plays: [{ w: 'אור' }] }} settle={{ state: 'done', score: 50, coins: 1 }} />);
    expect(screen.getByText('holiday.arcade.wordsFound_one')).toBeInTheDocument();
    expect(screen.getByText('holiday.arcade.coins_one')).toBeInTheDocument();
  });
});
