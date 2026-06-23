/**
 * Regression: WordWheelResults cross-promo CTA must reference translation keys
 * that exist in all locales (wordHunt.results.completeDailyTitle/Desc/stepBadge).
 * Previously these keys did not exist and the CTA leaked English fallback in he/ja/sv/es.
 *
 * Also locks the gating: the CTA must hide when hasPlayedWordHunt is true.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import WordWheelResults from '../WordWheelResults';
import type { WordWheelGameResult } from '../WordWheelGame';
import { en } from '@/translations/en';
import { he } from '@/translations/he';
import { ja } from '@/translations/ja';
import { sv } from '@/translations/sv';
import { es } from '@/translations/es';

vi.mock('framer-motion', () => ({
  m: new Proxy(
    {},
    {
      get: () => ({ children, ...props }: React.ComponentProps<'div'>) => (
        <div {...props}>{children}</div>
      ),
    }
  ),
  animate: () => ({ stop: () => {} }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../TabbedDailyLeaderboard', () => ({
  __esModule: true,
  default: () => <div data-testid="leaderboard-stub" />,
}));

const baseResult: WordWheelGameResult = {
  score: 42,
  wordsFound: ['ABC'],
  timeSeconds: 60,
} as WordWheelGameResult;

describe('WordWheelResults — cross-promo CTA translation + gating', () => {
  describe('translation key presence per locale', () => {
    it.each([
      ['en', en],
      ['he', he],
      ['ja', ja],
      ['sv', sv],
      ['es', es],
    ])('locale %s has wordHunt.results.completeDailyTitle/Desc/stepBadge', (_loc, dict) => {
       
      const r = (dict as any).wordHunt?.results;
      expect(r?.completeDailyTitle).toBeTruthy();
      expect(r?.completeDailyDesc).toBeTruthy();
      expect(r?.stepBadge).toBeTruthy();
    });
  });

  describe('rendering', () => {
    beforeEach(() => {
      vi.resetModules();
    });

    it('shows the Word Hunt CTA when player has not played Word Hunt today', async () => {
      vi.doMock('@/contexts/LanguageContext', () => ({
        useLanguage: () => ({
          t: (k: string, fb?: string) => fb || k,
          language: 'en',
          dir: 'ltr',
        }),
      }));
      const { default: Component } = await import('../WordWheelResults');
      render(
        <Component
          result={baseResult}
          puzzleNumber={1}
          puzzleDate="2026-04-21"
          language="en"
          hasPlayedWordHunt={false}
        />
      );
      const ctaLink = screen.getByRole('link', { name: /finish today/i });
      expect(ctaLink).toHaveAttribute('href', '/en/daily/word-hunt');
    });

    it('hides the Word Hunt CTA when player has already played Word Hunt today', async () => {
      vi.doMock('@/contexts/LanguageContext', () => ({
        useLanguage: () => ({
          t: (k: string, fb?: string) => fb || k,
          language: 'en',
          dir: 'ltr',
        }),
      }));
      const { default: Component } = await import('../WordWheelResults');
      render(
        <Component
          result={baseResult}
          puzzleNumber={1}
          puzzleDate="2026-04-21"
          language="en"
          hasPlayedWordHunt={true}
        />
      );
      expect(screen.queryByRole('link', { name: /finish today/i })).toBeNull();
      expect(screen.queryByRole('link', { name: /\/daily\/word-hunt/i })).toBeNull();
    });

    it('shows back-to-daily link when both challenges are done', async () => {
      vi.doMock('@/contexts/LanguageContext', () => ({
        useLanguage: () => ({
          t: (k: string, fb?: string) => fb || k,
          language: 'en',
          dir: 'ltr',
        }),
      }));
      const { default: Component } = await import('../WordWheelResults');
      render(
        <Component
          result={baseResult}
          puzzleNumber={1}
          puzzleDate="2026-04-21"
          language="en"
          hasPlayedWordHunt={true}
        />
      );
      const link = screen.getByTestId('back-to-daily-link');
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '/en/daily');
    });

    it('renders the back-to-daily CTA with calm secondary styling (no loud full-fill)', async () => {
      vi.doMock('@/contexts/LanguageContext', () => ({
        useLanguage: () => ({
          t: (k: string, fb?: string) => fb || k,
          language: 'en',
          dir: 'ltr',
        }),
      }));
      const { default: Component } = await import('../WordWheelResults');
      render(
        <Component
          result={baseResult}
          puzzleNumber={1}
          puzzleDate="2026-04-21"
          language="en"
          hasPlayedWordHunt={true}
        />
      );
      const cls = screen.getByTestId('back-to-daily-link').className;
      expect(cls).toContain('bg-neo-navy-light');
      expect(cls).not.toMatch(/bg-neo-cyan\b/);
      expect(cls).not.toContain('shadow-hard-lg');
    });
  });
});
