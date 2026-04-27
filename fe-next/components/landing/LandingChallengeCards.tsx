'use client';

import { useState } from 'react';
import { Swords, BookOpen, Map, Bomb, Zap, Link2, Brain } from 'lucide-react';
import ModeCard from './ModeCard';
import DailyChallengeBanner from '@/components/daily/DailyChallengeBanner';
import { shouldShowGuidance } from '@/utils/contextualGuidanceStorage';
import { hasCompletedOnboarding } from '@/utils/onboardingStorage';
import { isNewPlayer } from '@/utils/multiplayerProgressStorage';
import { trackModeSelected, trackLandingCtaClick } from '@/utils/growthTracking';
import { useIsPracticeVeteran } from '@/hooks/useIsPracticeVeteran';
import type { LandingGameMode } from '@/lib/landing/fetchGameModeStats';

interface DailyChallengePreloadedStats {
  hasPlayed: boolean;
  hasSolved: boolean | null;
  currentStreak: number;
  puzzleNumber: number;
  loading: boolean;
}

interface LandingChallengeCardsProps {
  language: string;
  /** @deprecated Blast is now public — kept for caller compat, ignored */
  isAdmin?: boolean;
  /** @deprecated Blast is now public — kept for caller compat, ignored */
  hasBlastAccess?: boolean;
  activePlayers: number;
  openRooms: number;
  totalPlayers: number;
  playerAllTimeBest: { score: number } | null;
  t: (key: string) => string;
  dailyChallengeStats: DailyChallengePreloadedStats;
  /** Pre-computed card order from server — static per ISR/deploy */
  cardOrder?: LandingGameMode[];
}

/**
 * Landing card identifiers — `'quickPlay'` is a landing-only synthetic mode
 * that routes into `/multiplayer?quickPlay=true` (auto-creates a bot room and
 * starts a random game). It is not part of `LandingGameMode` (server stats).
 * `'connections'` and `'brainGym'` are landing-only synthetic modes routing
 * to `/connections` and `/brain` respectively.
 */
type LandingCardKey = LandingGameMode | 'quickPlay' | 'connections' | 'brainGym';

/** Default card order when no server data available */
const DEFAULT_ORDER: LandingCardKey[] = ['daily', 'quickPlay', 'arena', 'practice', 'blast', 'adventure', 'connections', 'brainGym'];

/**
 * Featured landing modes — surfaces every shippable mode so players can
 * discover Connections, Adventure, and Brain Gym without hunting through
 * sidebar nav. Newcomer/veteran branches still bias which solo card leads.
 */
const FEATURED_MODES = new Set<LandingCardKey>([
  'daily', 'arena', 'blast', 'practice', 'quickPlay',
  'adventure', 'connections', 'brainGym',
]);

/** CSS stagger delay for each card index */
const cardDelay = (index: number) => `${index * 0.07}s`;

export function LandingChallengeCards({
  language,
  activePlayers,
  openRooms,
  totalPlayers,
  playerAllTimeBest,
  t,
  dailyChallengeStats,
  cardOrder: cardOrderProp,
}: LandingChallengeCardsProps) {
  // Synchronous init from localStorage — avoids post-mount card reorder CLS
  const [isFirstTimer] = useState(() => {
    if (typeof window === 'undefined') return false;
    return shouldShowGuidance('firstPlayTutorialCompleted') && !hasCompletedOnboarding();
  });
  const [isNewbie] = useState(() => {
    if (typeof window === 'undefined') return false;
    return isNewPlayer();
  });
  // Veterans skip the practice card entirely. Newcomers keep it as their
  // soft-onramp into the game (single-player word grids without pressure).
  const isVeteran = useIsPracticeVeteran();

  // Layered ordering, applied to a `LandingCardKey[]` working set:
  //   1. Start from the server-provided order (or `DEFAULT_ORDER`).
  //   2. Inject the synthetic `'quickPlay'` card just after `'daily'` so the
  //      primary CTA sits in the top row on mobile.
  //   3. Strip `'practice'` for veterans.
  //   4. Surface `'practice'` first for brand-new players (< 3 games).
  //   5. Guarantee `'daily'` lands in the top 2 — it must never be buried.
  const baseOrder: LandingCardKey[] = cardOrderProp ?? DEFAULT_ORDER;
  // Server stats only ship LandingGameMode keys; ensure the synthetic discovery
  // cards (`connections`, `brainGym`) are appended when missing so they land
  // in the SP section even on the popularity-ranked path.
  const rawOrder: LandingCardKey[] = (() => {
    const next = [...baseOrder];
    if (!next.includes('connections')) next.push('connections');
    if (!next.includes('brainGym')) next.push('brainGym');
    return next;
  })();
  // Guarantee blast always appears before adventure (regardless of popularity ranking)
  const serverOrder: LandingCardKey[] = (() => {
    const order = [...rawOrder];
    const blastIdx = order.indexOf('blast');
    const adventureIdx = order.indexOf('adventure');
    if (blastIdx > 0 && adventureIdx >= 0 && blastIdx > adventureIdx) {
      order.splice(blastIdx, 1);
      order.splice(adventureIdx, 0, 'blast');
    }
    return order;
  })();
  const withQuickPlay: LandingCardKey[] = serverOrder.includes('quickPlay')
    ? serverOrder
    : (() => {
        const next = [...serverOrder];
        const dailyIdx = next.indexOf('daily');
        next.splice(dailyIdx >= 0 ? dailyIdx + 1 : 0, 0, 'quickPlay');
        return next;
      })();
  // Mutual exclusivity: newcomers see practice (not quickPlay), veterans see quickPlay (not practice)
  const progressFiltered: LandingCardKey[] = isVeteran
    ? withQuickPlay.filter((m) => m !== 'practice')
    : withQuickPlay.filter((m) => m !== 'quickPlay');
  const orderedBeforeFeatured: LandingCardKey[] = isNewbie && !isVeteran
    ? (['practice', 'daily', ...progressFiltered.filter((m) => m !== 'practice' && m !== 'daily')] as LandingCardKey[])
    : progressFiltered[0] === 'daily'
    ? progressFiltered
    : (['daily', ...progressFiltered.filter((m) => m !== 'daily')] as LandingCardKey[]);
  // Final step: cull to the featured allowlist so landing shows a small,
  // high-intent set instead of every available mode.
  const cardOrder: LandingCardKey[] = orderedBeforeFeatured.filter((m) => FEATURED_MODES.has(m));

  // Non-veterans (still in practice state) see non-essential modes as LOCKED — softer
  // than hiding, preserves discoverability while keeping landing calm + focused on
  // practice + daily. Practice & daily always stay unlocked.
  const lockNonEssential = !isVeteran;
  const lockedMessage = t('landing.practiceFirstToUnlock');
  const isModeLocked = (mode: LandingCardKey): boolean =>
    lockNonEssential && mode !== 'practice' && mode !== 'daily';

  /** Renders a card by mode key with staggered CSS animation */
  const renderCard = (mode: LandingCardKey, index: number) => {
    const style = { animationDelay: cardDelay(index) } as React.CSSProperties;
    const locked = isModeLocked(mode);

    switch (mode) {
      case 'quickPlay':
        return (
          <div key="quickPlay" className="w-full h-full animate-[fadeInUp_0.4s_ease-out_both]" style={style}>
            <ModeCard
              title={t('landing.quickPlay')}
              description={t('landing.quickPlayDesc')}
              href={`/${language}/multiplayer?quickPlay=true`}
              icon={<Zap className="w-6 h-6" />}
              modeImage="/modes/quick-play.png"
              variant="cyan"
              highlighted={isVeteran}
              highlightLabel={isVeteran ? t('onboarding.welcome.startHere') : undefined}
              duration={t('landing.duration').replace('{time}', '1-3')}
              difficulty={2}
              difficultyLabel={t('landing.difficultyMedium')}
              locked={locked}
              lockedMessage={locked ? lockedMessage : undefined}
              onClick={() => { trackModeSelected('quickPlay', 'home'); trackLandingCtaClick('mode_card', { mode: 'quickPlay', variant: 'cyan' }); }}
            />
          </div>
        );

      case 'arena':
        return (
          <div key="arena" className="w-full h-full animate-[fadeInUp_0.4s_ease-out_both]" style={style}>
            <ModeCard
              title={t('landing.arena')}
              description={t('landing.arenaDesc')}
              href={`/${language}/multiplayer`}
              icon={<Swords className="w-6 h-6" />}
              modeImage="/modes/arena.png"
              variant="pink"
              liveBadge={{ openRooms, totalPlayers, roomsLabel: t('landing.openRooms'), playersLabel: t('landing.playersLive') }}
              playerCount={{ count: activePlayers, label: t('landing.playingNow') }}
              highlighted={isFirstTimer && !isNewbie}
              highlightLabel={isFirstTimer && !isNewbie ? t('onboarding.welcome.startHere') : undefined}
              duration={t('landing.duration').replace('{time}', '1-3')}
              difficulty={2}
              difficultyLabel={t('landing.difficultyMedium')}
              locked={locked}
              lockedMessage={locked ? lockedMessage : undefined}
              onClick={() => { trackModeSelected('arena', 'home'); trackLandingCtaClick('mode_card', { mode: 'arena', variant: 'pink' }); }}
            />
          </div>
        );

      case 'practice':
        return (
          <div key="practice" className="w-full h-full animate-[fadeInUp_0.4s_ease-out_both]" style={style}>
            <ModeCard
              title={t('landing.practice')}
              description={t('landing.practiceDesc')}
              href={`/${language}/singleplayer?autoStart=practice`}
              icon={<BookOpen className="w-6 h-6" />}
              modeImage="/modes/practice.png"
              variant="cyan"
              personalBest={playerAllTimeBest ? { score: playerAllTimeBest.score, label: t('landing.personalBest') } : undefined}
              highlighted={isNewbie}
              highlightLabel={isNewbie ? t('onboarding.welcome.startHere') : undefined}
              duration={t('landing.duration').replace('{time}', '1-3')}
              difficulty={1}
              difficultyLabel={t('landing.difficultyEasy')}
              onClick={() => { trackModeSelected('practice', 'home'); trackLandingCtaClick('mode_card', { mode: 'practice', variant: 'cyan' }); }}
            />
          </div>
        );

      case 'daily':
        return (
          <div key="daily" className="w-full h-full flex flex-col animate-[fadeInUp_0.4s_ease-out_both]" style={style}>
            <DailyChallengeBanner preloadedStats={dailyChallengeStats} />
          </div>
        );

      case 'blast':
        return (
          <div key="blast" className="w-full h-full animate-[fadeInUp_0.4s_ease-out_both]" style={style}>
            <ModeCard
              title={t('landing.blastMode')}
              description={t('landing.blastModeDesc')}
              href={`/${language}/blast`}
              icon={<Bomb className="w-6 h-6" />}
              modeImage="/modes/blast.png"
              variant="orange"
              badge="NEW"
              duration={t('landing.duration').replace('{time}', '2-5')}
              difficulty={3}
              difficultyLabel={t('landing.difficultyHard')}
              locked={locked}
              lockedMessage={locked ? lockedMessage : undefined}
              onClick={() => { trackModeSelected('blast', 'home'); trackLandingCtaClick('mode_card', { mode: 'blast', variant: 'orange' }); }}
            />
          </div>
        );

      case 'adventure':
        return (
          <div key="adventure" className="w-full h-full animate-[fadeInUp_0.4s_ease-out_both]" style={style}>
            <ModeCard
              title={t('landing.adventureMode')}
              description={t('landing.adventureModeDesc')}
              href={`/${language}/adventure`}
              icon={<Map className="w-6 h-6" />}
              modeImage="/modes/adventure.png"
              variant="lime"
              duration={t('landing.duration').replace('{time}', '2-5')}
              difficulty={2}
              difficultyLabel={t('landing.difficultyMedium')}
              locked={locked}
              lockedMessage={locked ? lockedMessage : undefined}
              onClick={() => { trackModeSelected('adventure', 'home'); trackLandingCtaClick('mode_card', { mode: 'adventure', variant: 'lime' }); }}
            />
          </div>
        );

      case 'connections':
        return (
          <div key="connections" className="w-full h-full animate-[fadeInUp_0.4s_ease-out_both]" style={style}>
            <ModeCard
              title={t('landing.wordChainMode')}
              description={t('landing.wordChainModeDesc')}
              href={`/${language}/connections`}
              icon={<Link2 className="w-6 h-6" />}
              modeImage="/modes/connections.png"
              variant="purple"
              badge="NEW"
              duration={t('landing.duration').replace('{time}', '2-5')}
              difficulty={2}
              difficultyLabel={t('landing.difficultyMedium')}
              locked={locked}
              lockedMessage={locked ? lockedMessage : undefined}
              onClick={() => { trackModeSelected('connections', 'home'); trackLandingCtaClick('mode_card', { mode: 'connections', variant: 'purple' }); }}
            />
          </div>
        );

      case 'brainGym':
        return (
          <div key="brainGym" className="w-full h-full animate-[fadeInUp_0.4s_ease-out_both]" style={style}>
            <ModeCard
              title={t('landing.brainTraining')}
              description={t('landing.brainTrainingDesc')}
              href={`/${language}/brain`}
              icon={<Brain className="w-6 h-6" />}
              modeImage="/modes/practice.png"
              variant="purple"
              duration={t('landing.duration').replace('{time}', '1-3')}
              difficulty={2}
              difficultyLabel={t('landing.difficultyMedium')}
              locked={locked}
              lockedMessage={locked ? lockedMessage : undefined}
              onClick={() => { trackModeSelected('brainGym', 'home'); trackLandingCtaClick('mode_card', { mode: 'brainGym', variant: 'purple' }); }}
            />
          </div>
        );

      default:
        return null;
    }
  };

  const MP_MODES = new Set<LandingCardKey>(['arena', 'quickPlay']);
  const SP_MODES = new Set<LandingCardKey>(['practice', 'blast', 'adventure', 'connections', 'brainGym']);

  const heroCards = cardOrder.filter((m) => m === 'daily');
  const mpCards = cardOrder.filter((m) => MP_MODES.has(m));
  const spCards = cardOrder.filter((m) => SP_MODES.has(m));

  let runningIndex = 0;
  const nextIndex = () => runningIndex++;

  return (
    <div className="w-full max-w-5xl mx-auto xl:max-w-6xl space-y-5 md:space-y-6">
      {heroCards.length > 0 && (
        <div className="grid grid-cols-1 max-w-3xl mx-auto">
          {heroCards.map((mode) => renderCard(mode, nextIndex()))}
        </div>
      )}

      {mpCards.length > 0 && (
        <section
          data-testid="landing-section-mp"
          aria-label={t('landing.sectionMultiplayerTitle')}
        >
          <header className="mb-3 md:mb-4 flex items-baseline gap-2 px-1">
            <span className="font-neo-display font-bold text-sm sm:text-base uppercase tracking-wide text-neo-pink">
              {t('landing.sectionMultiplayerTitle')}
            </span>
            <span className="font-neo-body text-xs sm:text-sm text-neo-white/60">
              {t('landing.sectionMultiplayerSubtitle')}
            </span>
          </header>
          <div className={`grid grid-cols-1 gap-3 sm:gap-4 md:gap-5 items-stretch ${mpCards.length >= 2 ? 'sm:grid-cols-2' : 'max-w-md mx-auto'}`}>
            {mpCards.map((mode) => renderCard(mode, nextIndex()))}
          </div>
        </section>
      )}

      {spCards.length > 0 && (
        <section
          data-testid="landing-section-sp"
          aria-label={t('landing.sectionSoloTitle')}
        >
          <header className="mb-3 md:mb-4 flex items-baseline gap-2 px-1">
            <span className="font-neo-display font-bold text-sm sm:text-base uppercase tracking-wide text-neo-cyan">
              {t('landing.sectionSoloTitle')}
            </span>
            <span className="font-neo-body text-xs sm:text-sm text-neo-white/60">
              {t('landing.sectionSoloSubtitle')}
            </span>
          </header>
          <div className={`grid grid-cols-1 gap-3 sm:gap-4 md:gap-5 items-stretch ${
            spCards.length === 1 ? 'max-w-md mx-auto' :
            spCards.length === 2 ? 'sm:grid-cols-2 max-w-3xl mx-auto' :
            spCards.length >= 4 ? 'sm:grid-cols-2 xl:grid-cols-4' :
            'sm:grid-cols-2 md:grid-cols-3'
          }`}>
            {spCards.map((mode) => renderCard(mode, nextIndex()))}
          </div>
        </section>
      )}
    </div>
  );
}
