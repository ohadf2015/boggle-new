'use client';

import { useState } from 'react';
import { Swords, BookOpen, Map, Bomb, Link2, Brain, Sparkles, ChevronDown, Layers, Gem, Building2 } from 'lucide-react';
import ModeCard from './ModeCard';
import DailyChallengeBanner from '@/components/daily/DailyChallengeBanner';
import { shouldShowGuidance } from '@/utils/contextualGuidanceStorage';
import { hasCompletedOnboarding } from '@/utils/onboardingStorage';
import { getGamesCompleted, isNewPlayer } from '@/utils/multiplayerProgressStorage';
import { trackModeSelected, trackLandingCtaClick } from '@/utils/growthTracking';
import { useIsPracticeVeteran } from '@/hooks/useIsPracticeVeteran';
import { useUserStats } from '@/hooks/useUserStats';
import { THRESHOLDS } from '@/utils/featureGates';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import { useAuth } from '@/contexts/AuthContext';
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
type LandingCardKey = LandingGameMode | 'connections' | 'brainGym' | 'wordCraft' | 'wordCraftGems' | 'wordTower' | 'blastClassic';

/** Default card order when no server data available */
const DEFAULT_ORDER: LandingCardKey[] = ['daily', 'arena', 'practice', 'blast', 'connections', 'brainGym'];

/**
 * Featured landing modes — surfaces every shippable mode so players can
 * discover Connections, Adventure, and Brain Gym without hunting through
 * sidebar nav. Newcomer/veteran branches still bias which solo card leads.
 */
const FEATURED_MODES = new Set<LandingCardKey>([
  'daily', 'arena', 'blast', 'practice',
  'connections', 'brainGym', 'wordCraft', 'wordCraftGems', 'wordTower', 'blastClassic',
]);

/** CSS stagger delay for each card index */
const cardDelay = (index: number) => `${index * 0.07}s`;

/** Modes with no content for Japanese locale — hidden from hub */
const JA_HIDDEN_MODES = new Set<LandingCardKey>(['connections', 'wordCraft', 'wordCraftGems']);

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
  // Practice also disappears as soon as the player has finished any game —
  // a recorded personal best is a durable "I've played" signal that survives
  // localStorage clears for signed-in users.
  // Word Tower, Blast Classic (V1), and Word Craft are admin-only dev previews —
  // gated on `isAdmin` alone (same pattern), no extra experiment lock.
  const { isAdmin } = useAuth();
  const isVeteranRaw = useIsPracticeVeteran();
  const { isOnCrazyGamesPlatform } = useCrazyGames();
  const hasPlayedAnyGame = !!playerAllTimeBest && playerAllTimeBest.score > 0;
  const isVeteran = isVeteranRaw || isOnCrazyGamesPlatform || hasPlayedAnyGame;
  // One "Start Here" pill at a time. Practice wins for non-veterans (it's the
  // pressure-free onramp); MP cards only get the pill once the player has
  // graduated past practice. Prevents the dual-highlight bug where both
  // Multiplayer + Practice lit up for brand-new players.
  const practiceWinsHighlight = !isVeteran;

  // Mode-roster newcomer gate — independent of onboarding-completed and MP-joined
  // flags (both flip too eagerly in production: onboarding completes before the
  // first real game, and isNewPlayer requires an MP join). Drives the
  // "More Game Modes" collapse so a brand-new player doesn't see eight options
  // on first paint.
  const { userStats } = useUserStats();
  const isNewcomerByGames =
    !isOnCrazyGamesPlatform &&
    !!userStats &&
    userStats.totalGamesPlayed < THRESHOLDS.modeRoster;
  // Once a player has finished even one multiplayer round they're past the
  // choice-paralysis window — surface every mode unconditionally instead of
  // hiding half behind a "More Game Modes" expander.
  const [hasPlayedMp] = useState(() => {
    if (typeof window === 'undefined') return false;
    return getGamesCompleted() > 0;
  });
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
    if (isAdmin && !next.includes('wordCraft')) next.push('wordCraft');
    if (isAdmin && !next.includes('wordCraftGems')) next.push('wordCraftGems');
    if (isAdmin && !next.includes('wordTower')) next.push('wordTower');
    // Blast Classic (legacy V1 engine) — admin-only card so both V1 + V2 (the
    // public 'blast' card) are reachable. /blast?v2=off opts into the V1 engine.
    if (isAdmin && !next.includes('blastClassic')) next.push('blastClassic');
    if (language === 'ja') return next.filter((m) => !JA_HIDDEN_MODES.has(m));
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
  // Veterans have completed practice — remove it so it doesn't compete for
  // the featured-row slot or the SP grid (they don't need the onramp).
  const practiceFiltered: LandingCardKey[] = isVeteran
    ? serverOrder.filter((m) => m !== 'practice')
    : serverOrder;
  const orderedBeforeFeatured: LandingCardKey[] = isNewbie && !isVeteran
    ? (['practice', 'daily', ...practiceFiltered.filter((m) => m !== 'practice' && m !== 'daily')] as LandingCardKey[])
    : practiceFiltered[0] === 'daily'
    ? practiceFiltered
    : (['daily', ...practiceFiltered.filter((m) => m !== 'daily')] as LandingCardKey[]);
  // Final step: cull to the featured allowlist so landing shows a small,
  // high-intent set instead of every available mode.
  const cardOrder: LandingCardKey[] = orderedBeforeFeatured.filter((m) => FEATURED_MODES.has(m));

  /** Renders a card by mode key with staggered CSS animation */
  const renderCard = (mode: LandingCardKey, index: number) => {
    const style = { animationDelay: cardDelay(index) } as React.CSSProperties;

    switch (mode) {
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
              highlighted={isFirstTimer && !isNewbie && !practiceWinsHighlight}
              highlightLabel={isFirstTimer && !isNewbie && !practiceWinsHighlight ? t('onboarding.welcome.startHere') : undefined}
              onClick={() => { trackModeSelected('arena', 'home'); trackLandingCtaClick('mode_card', { mode: 'arena', variant: 'pink' }); }}
            />
          </div>
        );

      case 'practice': {
        // Pre-graduation players (`!isVeteran`) get an always-on highlight regardless
        // of `isNewbie`. The newbie heuristic (<3 games + onboarding flag) is too
        // narrow — anyone still on practice deserves the spotlight on landing.
        const showPracticeHighlight = isNewbie || !isVeteran;
        return (
          <div key="practice" className="w-full h-full animate-[fadeInUp_0.4s_ease-out_both]" style={style}>
            <ModeCard
              title={t('landing.practice')}
              description={t('landing.practiceDesc')}
              href={`/${language}/practice`}
              icon={<BookOpen className="w-6 h-6" />}
              modeImage="/modes/practice.png"
              variant="cyan"
              personalBest={playerAllTimeBest ? { score: playerAllTimeBest.score, label: t('landing.personalBest') } : undefined}
              highlighted={showPracticeHighlight}
              highlightLabel={showPracticeHighlight ? t('onboarding.welcome.startHere') : undefined}
              onClick={() => { trackModeSelected('practice', 'home'); trackLandingCtaClick('mode_card', { mode: 'practice', variant: 'cyan' }); }}
            />
          </div>
        );
      }

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
              onClick={() => { trackModeSelected('blast', 'home'); trackLandingCtaClick('mode_card', { mode: 'blast', variant: 'orange' }); }}
            />
          </div>
        );

      case 'blastClassic':
        return (
          <div key="blastClassic" className="w-full h-full animate-[fadeInUp_0.4s_ease-out_both]" style={style}>
            <ModeCard
              title={t('landing.blastClassic')}
              description={t('landing.blastClassicDesc')}
              href={`/${language}/blast?v2=off`}
              icon={<Bomb className="w-6 h-6" />}
              variant="orange"
              badge="V1"
              onClick={() => { trackLandingCtaClick('mode_card', { mode: 'blastClassic', variant: 'orange' }); }}
            />
          </div>
        );

      case 'wordTower':
        return (
          <div key="wordTower" className="w-full h-full animate-[fadeInUp_0.4s_ease-out_both]" style={style}>
            <ModeCard
              title={t('wordTower.cardTitle')}
              description={t('wordTower.cardDesc')}
              href={`/${language}/word-tower`}
              icon={<Building2 className="w-6 h-6" />}
              modeImage="/modes/word-tower.png"
              variant="purple"
              badge="ADMIN"
              onClick={() => { trackLandingCtaClick('mode_card', { mode: 'wordTower', variant: 'purple' }); }}
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
              href={`/${language}/connections/play`}
              icon={<Link2 className="w-6 h-6" />}
              modeImage="/modes/connections.png"
              variant="purple"
              badge="NEW"
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
              onClick={() => { trackModeSelected('brainGym', 'home'); trackLandingCtaClick('mode_card', { mode: 'brainGym', variant: 'purple' }); }}
            />
          </div>
        );

      case 'wordCraft': {
        return (
          <div key="wordCraft" className="w-full h-full animate-[fadeInUp_0.4s_ease-out_both]" style={style}>
            <ModeCard
              title={t('wordcraft.modeTitle')}
              description={t('wordcraft.modeDesc')}
              href={`/${language}/word-craft`}
              icon={<Layers className="w-6 h-6" />}
              modeImage="/modes/word-craft.png"
              variant="purple"
              badge="BETA"
              onClick={() => { trackModeSelected('wordCraft' as never, 'home'); trackLandingCtaClick('mode_card', { mode: 'wordCraft', variant: 'purple' }); }}
            />
          </div>
        );
      }

      case 'wordCraftGems': {
        return (
          <div key="wordCraftGems" className="w-full h-full animate-[fadeInUp_0.4s_ease-out_both]" style={style}>
            <ModeCard
              title={t('wordcraft.gemsModeTitle')}
              description={t('wordcraft.gemsModeDesc')}
              href={`/${language}/word-craft?mode=gems`}
              icon={<Gem className="w-6 h-6" />}
              modeImage="/modes/word-craft.png"
              variant="purple"
              badge="BETA"
              onClick={() => { trackModeSelected('wordCraftGems' as never, 'home'); trackLandingCtaClick('mode_card', { mode: 'wordCraftGems', variant: 'purple' }); }}
            />
          </div>
        );
      }

      default:
        return null;
    }
  };

  const MP_MODES = new Set<LandingCardKey>(['arena']);
  const SP_MODES = new Set<LandingCardKey>(['practice', 'blast', 'adventure', 'connections', 'brainGym', 'wordCraft', 'wordCraftGems', 'wordTower', 'blastClassic']);
  // Newcomer-essential modes — always visible above the fold. Everything else
  // collapses into a "More Game Modes" expander to reduce choice paralysis
  // without removing the cards from the DOM (preserves SEO + AI-crawler links).
  // Arena (multiplayer) stays surfaced for newbies so the live-rooms entry
  // point isn't buried — players consistently asked for it on landing.
  const ESSENTIAL_FOR_NEWBIES = new Set<LandingCardKey>(['daily', 'practice', 'arena']);

  const heroCards = cardOrder.filter((m) => m === 'daily');
  const mpCardsAll = cardOrder.filter((m) => MP_MODES.has(m));
  // Non-veterans see practice promoted to a dedicated featured row above the SP grid
  // so it stops looking like just another card. Locked siblings (blast/adventure/etc.)
  // already de-emphasize the rest.
  const featurePractice = !isVeteran && cardOrder.includes('practice');
  const spCardsAll = cardOrder
    .filter((m) => SP_MODES.has(m))
    .filter((m) => !(featurePractice && m === 'practice'));
  // Split visible vs. collapsed for first-timers / newbies / newcomers (< 3 games).
  // The newcomer-by-games signal is the durable gate — onboarding-flag and MP-join
  // signals expire too quickly. Veterans + CG players still see everything.
  const collapseExtras = !hasPlayedMp && (isFirstTimer || isNewbie || isNewcomerByGames);
  const mpCards = collapseExtras ? mpCardsAll.filter((m) => ESSENTIAL_FOR_NEWBIES.has(m)) : mpCardsAll;
  const mpCardsExtra = collapseExtras ? mpCardsAll.filter((m) => !ESSENTIAL_FOR_NEWBIES.has(m)) : [];
  const spCards = collapseExtras ? spCardsAll.filter((m) => ESSENTIAL_FOR_NEWBIES.has(m)) : spCardsAll;
  const spCardsExtra = collapseExtras ? spCardsAll.filter((m) => !ESSENTIAL_FOR_NEWBIES.has(m)) : [];
  const hiddenCount = mpCardsExtra.length + spCardsExtra.length;
  const hasExtras = hiddenCount > 0;

  let runningIndex = 0;
  const nextIndex = () => runningIndex++;

  return (
    <div className="w-full max-w-5xl mx-auto xl:max-w-6xl space-y-5 md:space-y-6">
      {heroCards.length > 0 && (
        <div className="grid grid-cols-1 max-w-3xl lg:max-w-4xl xl:max-w-5xl mx-auto">
          {heroCards.map((mode) => renderCard(mode, nextIndex()))}
        </div>
      )}

      {mpCards.length > 0 && (
        <section
          data-testid="landing-section-mp"
          aria-label={t('landing.sectionMultiplayerTitle')}
        >
          <div className={`grid grid-cols-1 gap-3 sm:gap-4 md:gap-5 items-stretch ${mpCards.length >= 2 ? 'sm:grid-cols-2' : 'max-w-3xl lg:max-w-4xl xl:max-w-5xl mx-auto'}`}>
            {mpCards.map((mode) => renderCard(mode, nextIndex()))}
          </div>
        </section>
      )}

      {featurePractice && (
        <section
          data-testid="landing-section-practice-featured"
          aria-label={t('landing.practice')}
        >
          <div className="grid grid-cols-1 max-w-3xl lg:max-w-4xl xl:max-w-5xl mx-auto">
            {renderCard('practice', nextIndex())}
          </div>
        </section>
      )}

      {spCards.length > 0 && (
        <section
          data-testid="landing-section-sp"
          aria-label={t('landing.sectionSoloTitle')}
        >
          <div className={`grid grid-cols-1 gap-3 sm:gap-4 md:gap-5 items-stretch ${
            spCards.length === 1 ? 'max-w-3xl lg:max-w-4xl xl:max-w-5xl mx-auto' :
            spCards.length === 2 ? 'sm:grid-cols-2 max-w-3xl lg:max-w-4xl xl:max-w-5xl mx-auto' :
            spCards.length >= 4 ? 'sm:grid-cols-2 xl:grid-cols-4' :
            'sm:grid-cols-2 md:grid-cols-3'
          }`}>
            {spCards.map((mode) => renderCard(mode, nextIndex()))}
          </div>
        </section>
      )}

      {hasExtras && (
        // Native <details> keeps every link in the DOM for crawlers (Google,
        // ChatGPT, Perplexity all parse <details> content) while letting
        // first-timers opt into the longer mode list when they're ready.
        <details
          data-testid="landing-section-more"
          className="group relative rounded-neo border-3 border-black bg-gradient-to-br from-neo-navy-light to-neo-navy shadow-hard hover:shadow-hard-lime hover:-translate-x-0.5 hover:-translate-y-0.5 open:shadow-hard-lg transition-all overflow-hidden"
        >
          <summary className="cursor-pointer list-none flex items-center justify-between gap-3 select-none px-4 py-3 sm:py-4">
            <span className="flex items-center gap-3 min-w-0">
              <span
                aria-hidden="true"
                className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-neo bg-neo-lime border-2 border-black shadow-hard-sm shrink-0 group-hover:animate-neo-wobble"
              >
                <Sparkles className="w-5 h-5 text-neo-navy" strokeWidth={2.5} />
              </span>
              <span className="flex flex-col min-w-0">
                <span className="font-neo-display font-black text-base sm:text-lg uppercase tracking-wide text-neo-white truncate">
                  {t('landing.moreGameModes') || 'More Game Modes'}
                </span>
                <span className="font-neo-body text-xs sm:text-sm text-neo-white/70 group-open:hidden flex items-center gap-2">
                  {hiddenCount > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[1.4rem] h-5 px-1.5 rounded-full bg-neo-lime text-neo-navy font-neo-display font-black text-[0.65rem] leading-none border border-black">
                      +{hiddenCount}
                    </span>
                  )}
                  {t('landing.moreGameModesHint') || 'Tap to explore'}
                </span>
                <span className="font-neo-body text-xs sm:text-sm text-neo-white/70 hidden group-open:inline">
                  {t('common.collapse') || 'Hide'}
                </span>
              </span>
            </span>
            <span
              aria-hidden="true"
              className="flex items-center justify-center w-9 h-9 rounded-full bg-neo-white/10 border-2 border-neo-white/30 shrink-0 transition-transform duration-300 group-open:rotate-180 group-hover:bg-neo-lime/20 group-hover:border-neo-lime"
            >
              <ChevronDown className="w-5 h-5 text-neo-white" strokeWidth={2.5} />
            </span>
          </summary>
          <div className="mt-2 px-4 pb-4 space-y-5">
            {mpCardsExtra.length > 0 && (
              <div className={`grid grid-cols-1 gap-3 sm:gap-4 md:gap-5 items-stretch ${mpCardsExtra.length >= 2 ? 'sm:grid-cols-2' : 'max-w-3xl lg:max-w-4xl xl:max-w-5xl mx-auto'}`}>
                {mpCardsExtra.map((mode) => renderCard(mode, nextIndex()))}
              </div>
            )}
            {spCardsExtra.length > 0 && (
              <div className={`grid grid-cols-1 gap-3 sm:gap-4 md:gap-5 items-stretch ${
                spCardsExtra.length === 1 ? 'max-w-3xl lg:max-w-4xl xl:max-w-5xl mx-auto' :
                spCardsExtra.length === 2 ? 'sm:grid-cols-2 max-w-3xl lg:max-w-4xl xl:max-w-5xl mx-auto' :
                spCardsExtra.length >= 4 ? 'sm:grid-cols-2 xl:grid-cols-4' :
                'sm:grid-cols-2 md:grid-cols-3'
              }`}>
                {spCardsExtra.map((mode) => renderCard(mode, nextIndex()))}
              </div>
            )}
          </div>
        </details>
      )}
    </div>
  );
}
