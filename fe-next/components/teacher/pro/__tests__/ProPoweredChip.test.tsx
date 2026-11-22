import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ProPoweredChip } from '../ProPoweredChip';

vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: 'en' }) }));
const pro = vi.hoisted(() => ({ current: { hasPro: false, loading: false, accessTrialExpires: null as string | null } }));
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => pro.current }));

const future = new Date(Date.now() + 5 * 86_400_000).toISOString();
const past = new Date(Date.now() - 86_400_000).toISOString();

describe('ProPoweredChip', () => {
  it.each([
    ['a paying or card-trial teacher', { hasPro: true, loading: false, accessTrialExpires: null }, true],
    ['a live access-trial teacher', { hasPro: false, loading: false, accessTrialExpires: future }, true],
    ['a free teacher', { hasPro: false, loading: false, accessTrialExpires: null }, false],
    ['an ended access trial', { hasPro: false, loading: false, accessTrialExpires: past }, false],
    ['an unresolved entitlement', { hasPro: true, loading: true, accessTrialExpires: null }, false],
  ])('Given %s, Then the chip shows: %s', (_label, state, shows) => {
    pro.current = state;
    render(<ProPoweredChip />);
    const chip = screen.queryByTestId('pro-powered-chip');
    if (shows) {
      expect(chip).toHaveTextContent('eduShell.nav.pro');
      expect(chip).toHaveAttribute('title', 'teacher.proPowered.hint');
    } else {
      expect(chip).toBeNull();
    }
  });
});
