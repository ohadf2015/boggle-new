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
 *
 * UPDATE 2026-09-20: the three hand-chained CTAs above (wordwheel-connections-cta
 * / wordwheel-hunt-cta / wordwheel-back-to-daily-cta), gated on the
 * hasPlayedConnections/hasPlayedWordHunt props, were deleted and replaced by ONE
 * shared <NextQuestCta>. It reads play state from useDailyPlayedStatus (the SAME
 * server-backed hook the daily hub reads) instead of props, and now knows about a
 * FOURTH mode, Word Tower, in priority order word-hunt -> word-wheel -> word-tower
 * -> connections. The "rendering + gating" describe block below is rewritten to
 * drive that hook (mocked mutably, same pattern as
 * components/daily/results/__tests__/NextQuestCta.test.tsx) instead of the old
 * props. The translation-key-presence block is untouched: those keys
 * (wordWheel.results.nextUpBadge/playConnectionsTitle/playConnectionsDesc) still
 * exist in every locale file and this suite's job there was only to assert that,
 * independent of which component consumes them.
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

// The single CTA now reads play state from this hook, not from props. Mutable
// object + factory returning it — matching the working pattern in
// components/daily/results/__tests__/NextQuestCta.test.tsx — so each test can
// put a different mode "next" without re-mocking the module per test.
const playedStatus = {
  today: { wordHunt: true, wordWheel: true, wordTower: true, connections: true },
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
      // pessimistically false, so the registered-player CTA renders.
      mockLocale = 'en';
      playedStatus.today = { wordHunt: true, wordWheel: true, wordTower: true, connections: true };
      playedStatus.loading = false;
    });

    /*
     * ORIGINALLY: asserted the hand-rolled Connections CTA pointed at
     * /connections/daily whenever the hasPlayedConnections PROP was false.
     * NOW: Connections is last in NextQuestCta's priority order
     * (word-hunt -> word-wheel -> word-tower -> connections), so it is only
     * offered once the other three modes are already played — drive the
     * mocked hook into exactly that state instead of a prop.
     */
    it('points the primary follow-up CTA at /connections/daily when Connections is the only mode left', () => {
      playedStatus.today = { wordHunt: true, wordWheel: true, wordTower: true, connections: false };
      renderResults();
      const cta = screen.getByTestId('next-quest-cta');
      expect(cta).toHaveAttribute('data-next-mode', 'connections');
      expect(cta).toHaveAttribute('href', '/en/connections/daily');
    });

    /*
     * ORIGINALLY: same assertion in Hebrew, via the `language` prop.
     * NOW: NextQuestCta builds its href off the LanguageContext `language`
     * value (WordWheelResults reads `const { language } = useLanguage()`,
     * shadowing its own `language` prop), so flip the mocked locale instead.
     */
    it('locale-prefixes the CTA href (he)', () => {
      mockLocale = 'he';
      playedStatus.today = { wordHunt: true, wordWheel: true, wordTower: true, connections: false };
      renderResults({ language: 'he' });
      expect(screen.getByTestId('next-quest-cta')).toHaveAttribute('href', '/he/connections/daily');
    });

    /*
     * ORIGINALLY: "suppresses the Word Hunt CTA while Connections is unplayed
     * (one primary CTA at a time)" — asserted two separate DOM testids were
     * mutually exclusive.
     * NOW: there is only ONE CTA slot (NextQuestCta renders a single link), so
     * "one primary CTA at a time" is a structural guarantee, not a gate to
     * test per-pair. Assert the single CTA is the Connections one, not Word
     * Hunt, and that no all-clear node coexists with it.
     */
    it('offers exactly one primary CTA — Connections — when Connections is the only mode left', () => {
      playedStatus.today = { wordHunt: true, wordWheel: true, wordTower: true, connections: false };
      renderResults();
      const cta = screen.getByTestId('next-quest-cta');
      expect(cta).toHaveAttribute('data-next-mode', 'connections');
      expect(screen.queryByTestId('next-quest-all-clear')).not.toBeInTheDocument();
    });

    /*
     * ORIGINALLY: "falls back to the Word Hunt CTA once Connections is done
     * but Word Hunt is not" (hasPlayedConnections=true, hasPlayedWordHunt=false).
     * NOW: word-hunt is FIRST in priority order, so an unplayed Word Hunt wins
     * regardless of Connections' state — drive the hook the same way.
     */
    it('falls back to the Word Hunt CTA once Connections is done but Word Hunt is not', () => {
      playedStatus.today = { wordHunt: false, wordWheel: true, wordTower: true, connections: true };
      renderResults();
      const cta = screen.getByTestId('next-quest-cta');
      expect(cta).toHaveAttribute('data-next-mode', 'word-hunt');
      expect(cta).toHaveAttribute('href', '/en/daily/word-hunt');
    });

    /*
     * ORIGINALLY: "shows Back to Daily Hub only when BOTH Connections and Word
     * Hunt are done" — those were the only two daily modes this screen knew
     * about at the time.
     * NOW: Word Tower is a third daily mode sharing the same priority list, so
     * the hub link (next-quest-all-clear) only appears once ALL FOUR modes are
     * played.
     */
    it('shows Back to Daily Hub only when every mode is done', () => {
      playedStatus.today = { wordHunt: true, wordWheel: true, wordTower: true, connections: true };
      renderResults();
      expect(screen.queryByTestId('next-quest-cta')).not.toBeInTheDocument();
      expect(screen.getByTestId('next-quest-all-clear')).toHaveAttribute('href', '/en/daily');
    });

    /*
     * ORIGINALLY: "does NOT show Back to Daily Hub when only Word Hunt is done
     * (Connections still open)" — guarded against a premature hub link.
     * NOW: with Word Tower also unplayed, the offered mode is word-tower (it
     * outranks connections), and the hub link must stay absent.
     */
    it('does NOT show Back to Daily Hub while any mode is still open', () => {
      playedStatus.today = { wordHunt: true, wordWheel: true, wordTower: false, connections: false };
      renderResults();
      expect(screen.queryByTestId('next-quest-all-clear')).not.toBeInTheDocument();
      const cta = screen.getByTestId('next-quest-cta');
      expect(cta).toHaveAttribute('data-next-mode', 'word-tower');
      expect(cta).toHaveAttribute('href', '/en/daily/word-tower');
    });
  });
});
