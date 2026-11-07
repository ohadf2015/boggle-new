import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { en } from '@/translations/en';
import { he } from '@/translations/he';
import { sv } from '@/translations/sv';
import { ja } from '@/translations/ja';
import { es } from '@/translations/es';
import { ru } from '@/translations/ru';
import { HomeHowItWorks } from '../HomeHowItWorks';

const t = (k: string) => k;
const TERMS = ['joinCode', 'board', 'round', 'wordList'];

describe('HomeHowItWorks', () => {
  it('Given a teacher with no class, Then the four words they meet everywhere are each explained in one line', () => {
    render(<HomeHowItWorks t={t} />);
    const section = screen.getByTestId('home-how-it-works');
    for (const id of TERMS) {
      // Once in the phone fold and once in the wide panel; only one shows at a time.
      expect(within(section).getAllByTestId(`home-how-${id}`)).toHaveLength(2);
      expect(within(section).getAllByText(`eduShell.onboarding.howItWorks.${id}.body`)[0]).toBeInTheDocument();
    }
  });

  it('On a phone, Then the explanations are folded so the first step stays on top', () => {
    render(<HomeHowItWorks t={t} />);
    const fold = screen.getByTestId('home-how-it-works').querySelector('details');
    expect(fold).not.toBeNull();
    expect(fold).not.toHaveAttribute('open');
    expect(fold?.className).toContain('sm:hidden');
  });

  it('Every locale explains every word', () => {
    for (const [loc, bundle] of Object.entries({ en, he, sv, ja, es, ru })) {
      const how = (bundle as unknown as { eduShell: { onboarding: { howItWorks: Record<string, { title: string; body: string } | string> } } }).eduShell.onboarding.howItWorks;
      expect(typeof how.title, loc).toBe('string');
      for (const id of TERMS) {
        const term = how[id] as { title: string; body: string };
        expect(term.title.length, `${loc}.${id}`).toBeGreaterThan(0);
        expect(term.body.length, `${loc}.${id}`).toBeGreaterThan(10);
      }
    }
  });
});
