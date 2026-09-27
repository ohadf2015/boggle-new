/**
 * Regression: WordWheelResults cross-promo CTA must reference translation keys
 * that exist in all locales (wordHunt.results.completeDailyTitle/Desc/stepBadge).
 * Previously these keys did not exist and the CTA leaked English fallback in he/ja/sv/es.
 *
 * Also locks the gating: the CTA must hide when hasPlayedWordHunt is true.
 *
 * UPDATE 2026-09-20: the hand-rolled "finish today's challenge" / "back to
 * daily" CTA this file gated on the `hasPlayedWordHunt`/`hasPlayedConnections`
 * PROPS was deleted and replaced by the shared <NextQuestCta>, which instead
 * reads play state from useDailyPlayedStatus (mocked mutably below, same
 * pattern as components/daily/results/__tests__/NextQuestCta.test.tsx). The
 * "rendering" describe block is rewritten to drive that hook. The translation
 * key-presence block above it is untouched — wordHunt.results.completeDailyTitle
 * etc. still exist in every locale file independent of which component reads
 * them.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
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

// Mutable so each test can drive which mode NextQuestCta should offer next,
// instead of the deleted hasPlayedWordHunt/hasPlayedConnections props.
const playedStatus = {
  today: { wordHunt: false, wordWheel: true, wordTower: true, connections: true },
  streak: { current: 1, longest: 1 },
  allCompletedDates: [] as string[],
  freezeCount: 0,
  loading: false,
  fromServer: true,
  freezeApplied: undefined as unknown,
  refresh: vi.fn(),
};

vi.mock('@/hooks/useDailyPlayedStatus', () => ({
  useDailyPlayedStatus: () => playedStatus,
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
      playedStatus.loading = false;
    });

    /*
     * ORIGINALLY: "shows the Word Hunt CTA when player has not played Word
     * Hunt today (Connections already done)" — found a link named
     * /finish today/i, driven by hasPlayedWordHunt=false.
     * NOW: that copy is gone; the equivalent is NextQuestCta offering
     * word-hunt next, which happens whenever word-hunt is the first unplayed
     * mode (it's first in priority order regardless of Connections).
     */
    it('offers the Word Hunt CTA when player has not played Word Hunt today', async () => {
      playedStatus.today = { wordHunt: false, wordWheel: true, wordTower: true, connections: true };
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
          hasPlayedConnections={true}
        />
      );
      const ctaLink = screen.getByTestId('next-quest-cta');
      expect(ctaLink).toHaveAttribute('data-next-mode', 'word-hunt');
      expect(ctaLink).toHaveAttribute('href', '/en/daily/word-hunt');
    });

    /*
     * ORIGINALLY: "hides the Word Hunt CTA when player has already played
     * Word Hunt today" — checked absence of a `/finish today/i` link and of
     * an `/\/daily\/word-hunt/i` link, driven by the hasPlayedWordHunt PROP.
     * That prop no longer drives the CTA at all, so under the OLD assertions
     * this test kept passing for the wrong reason: the deleted copy is
     * absent unconditionally now, regardless of any prop value (a silently
     * vacuous pass — rules/60 Class 4). Rewritten to drive the mocked hook
     * and positively assert the CTA now points somewhere else.
     */
    it('does not offer Word Hunt once it is already played today', async () => {
      playedStatus.today = { wordHunt: true, wordWheel: true, wordTower: false, connections: true };
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
      const ctaLink = screen.getByTestId('next-quest-cta');
      expect(ctaLink).not.toHaveAttribute('data-next-mode', 'word-hunt');
      expect(ctaLink.getAttribute('href')).not.toContain('/daily/word-hunt');
    });

    /*
     * ORIGINALLY: "shows back-to-daily link when both challenges are done" —
     * Word Hunt + Word Wheel were the only two daily modes at the time.
     * NOW: Word Tower is a third daily mode in the same priority list, so the
     * all-clear hub link only appears once ALL FOUR modes are played.
     */
    it('shows the all-clear hub link once every mode is done', async () => {
      playedStatus.today = { wordHunt: true, wordWheel: true, wordTower: true, connections: true };
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
          hasPlayedConnections={true}
        />
      );
      const link = screen.getByTestId('next-quest-all-clear');
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '/en/daily');
    });

    /*
     * ORIGINALLY: "renders the back-to-daily CTA with calm secondary styling
     * (no loud full-fill)" — asserted the OLD hand-rolled hub link's exact
     * Tailwind classes (bg-neo-navy-light, no shadow-hard-lg).
     * NOW: that link is NextQuestCta's all-clear state, styled with its own
     * (different, still deliberately calm/dark) classes — assert against what
     * it actually ships (bg-neo-navy/95), keeping the same "no loud cyan
     * full-fill, no -lg shadow bump" intent.
     */
    it('renders the all-clear hub link with calm secondary styling (no loud full-fill)', async () => {
      playedStatus.today = { wordHunt: true, wordWheel: true, wordTower: true, connections: true };
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
          hasPlayedConnections={true}
        />
      );
      const cls = screen.getByTestId('next-quest-all-clear').className;
      expect(cls).toContain('bg-neo-navy/95');
      expect(cls).not.toMatch(/bg-neo-cyan\b/);
      expect(cls).not.toContain('shadow-hard-lg');
    });
  });
});
