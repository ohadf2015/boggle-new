/**
 * Word Wheel daily result -> Connections daily follow-up CTA
 * (Ohad product directive 2026-09-13, slice 2 of the Word-Tower-hide card).
 *
 * The primary follow-up CTA on the wheel results screen must point at
 * /connections/daily (it used to promote Word Hunt as "STEP 2 OF 2", and
 * before the hub redesign Word Tower). Gating:
 *   connections unplayed            -> Connections CTA (primary)
 *   connections done, hunt unplayed -> Word Hunt CTA
 *   both done                       -> Back to Daily Hub
 * All copy via t() with keys present in all 6 locales (en/he/sv/ja/es/ru).
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import WordWheelResults from '../WordWheelResults';
import type { WordWheelGameResult } from '../WordWheelGame';
import { en } from '@/translations/en';
import { he } from '@/translations/he';
import { sv } from '@/translations/sv';
import { ja } from '@/translations/ja';
import { es } from '@/translations/es';
import { ru } from '@/translations/ru';

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

vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({ playSound: vi.fn() }),
}));

vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => ({ submitLeaderboardScore: vi.fn() }),
}));

// Mutable so a test can flip the rendered locale (the Link href uses the
// CONTEXT language, not the language prop — same as the hunt CTA).
let mockLocale = 'en';
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, fb?: string) => fb || k,
    language: mockLocale,
    dir: mockLocale === 'he' ? 'rtl' : 'ltr',
  }),
}));

vi.mock('@/hooks/usePracticeFlag', () => ({
  usePracticeFlag: () => false,
}));

const baseResult: WordWheelGameResult = {
  score: 42,
  wordsFound: ['ABC'],
  timeSeconds: 60,
} as WordWheelGameResult;

function renderResults(props: Partial<React.ComponentProps<typeof WordWheelResults>> = {}) {
  return render(
    <WordWheelResults
      result={baseResult}
      puzzleNumber={1}
      puzzleDate="2026-04-21"
      language="en"
      hasPlayedWordHunt={false}
      {...props}
    />
  );
}

describe('WordWheelResults — Connections daily follow-up CTA', () => {
  describe('translation key presence in all 6 locales', () => {
    it.each([
      ['en', en],
      ['he', he],
      ['sv', sv],
      ['ja', ja],
      ['es', es],
      ['ru', ru],
    ])('locale %s has wordWheel.results.nextUpBadge/playConnectionsTitle/playConnectionsDesc', (_loc, dict) => {
      const r = (dict as { wordWheel?: { results?: Record<string, unknown> } }).wordWheel?.results;
      expect(typeof r?.nextUpBadge).toBe('string');
      expect(typeof r?.playConnectionsTitle).toBe('string');
      expect(typeof r?.playConnectionsDesc).toBe('string');
    });
  });

  describe('rendering + gating', () => {
    beforeEach(() => {
      // Default (unauthenticated, unresolved) auth context => useIsGuest is
      // pessimistically false, so the registered-player CTAs render.
      mockLocale = 'en';
    });

    it('points the primary follow-up CTA at /connections/daily while Connections is unplayed', () => {
      renderResults({ hasPlayedConnections: false });
      const link = screen.getByTestId('wordwheel-connections-link');
      expect(link).toHaveAttribute('href', '/en/connections/daily');
    });

    it('locale-prefixes the CTA href (he)', () => {
      mockLocale = 'he';
      renderResults({ hasPlayedConnections: false, language: 'he' });
      expect(screen.getByTestId('wordwheel-connections-link')).toHaveAttribute('href', '/he/connections/daily');
    });

    it('suppresses the Word Hunt CTA while Connections is unplayed (one primary CTA at a time)', () => {
      renderResults({ hasPlayedConnections: false, hasPlayedWordHunt: false });
      expect(screen.queryByTestId('wordwheel-hunt-cta')).not.toBeInTheDocument();
      expect(screen.getByTestId('wordwheel-connections-cta')).toBeInTheDocument();
    });

    it('falls back to the Word Hunt CTA once Connections is done but Word Hunt is not', () => {
      renderResults({ hasPlayedConnections: true, hasPlayedWordHunt: false });
      expect(screen.queryByTestId('wordwheel-connections-cta')).not.toBeInTheDocument();
      const huntCta = screen.getByTestId('wordwheel-hunt-cta');
      expect(huntCta.querySelector('a')).toHaveAttribute('href', '/en/daily/word-hunt');
    });

    it('shows Back to Daily Hub only when BOTH Connections and Word Hunt are done', () => {
      renderResults({ hasPlayedConnections: true, hasPlayedWordHunt: true });
      expect(screen.queryByTestId('wordwheel-connections-cta')).not.toBeInTheDocument();
      expect(screen.queryByTestId('wordwheel-hunt-cta')).not.toBeInTheDocument();
      expect(screen.getByTestId('back-to-daily-link')).toHaveAttribute('href', '/en/daily');
    });

    it('does NOT show Back to Daily Hub when only Word Hunt is done (Connections still open)', () => {
      renderResults({ hasPlayedConnections: false, hasPlayedWordHunt: true });
      expect(screen.queryByTestId('back-to-daily-link')).not.toBeInTheDocument();
      expect(screen.getByTestId('wordwheel-connections-link')).toHaveAttribute('href', '/en/connections/daily');
    });
  });
});
