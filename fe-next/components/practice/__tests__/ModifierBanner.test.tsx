/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ModifierBanner } from '../ModifierBanner';
import { PRACTICE_MODIFIERS } from '@/lib/practice/modifiers';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      const map: Record<string, string> = {
        'practice.modifier.vowelOnly': 'Vowel-only',
        'practice.modifier.vowelOnlyDesc': 'Vowel-only words',
        'practice.modifier.doubleLetter': 'Double-letter',
        'practice.modifier.doubleLetterDesc': 'Words with double letters',
        'practice.modifier.sWords': 'S-words',
        'practice.modifier.sWordsDesc': 'Words starting with S',
        'practice.modifier.todayLabel': "Today's twist",
        'practice.modifier.bonus': `${params?.x ?? '1'}× bonus`,
      };
      return map[key] ?? key;
    },
    dir: 'ltr',
  }),
}));

describe('ModifierBanner', () => {
  it('renders the modifier label, description, and multiplier badge', () => {
    const mod = PRACTICE_MODIFIERS.find((m) => m.id === 'vowel-only')!;
    render(<ModifierBanner modifier={mod} />);

    expect(screen.getByText(/Today's twist/i)).toBeTruthy();
    expect(screen.getByText('Vowel-only')).toBeTruthy();
    expect(screen.getByText(/Vowel-only words/)).toBeTruthy();
    expect(screen.getByText(/2\.5× bonus/)).toBeTruthy();
  });

  it('exposes the modifier id via data attribute for analytics', () => {
    const mod = PRACTICE_MODIFIERS.find((m) => m.id === 's-words')!;
    render(<ModifierBanner modifier={mod} />);

    const banner = screen.getByTestId('modifier-banner');
    expect(banner.getAttribute('data-modifier-id')).toBe('s-words');
  });

  it('renders any modifier (no hardcoded id branches)', () => {
    PRACTICE_MODIFIERS.forEach((mod) => {
      const { unmount } = render(<ModifierBanner modifier={mod} />);
      const banner = screen.getByTestId('modifier-banner');
      expect(banner.getAttribute('data-modifier-id')).toBe(mod.id);
      unmount();
    });
  });
});
