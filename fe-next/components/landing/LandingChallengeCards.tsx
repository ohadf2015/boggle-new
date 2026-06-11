'use client';

import { useState, useEffect } from 'react';
import { Swords, BookOpen, Map, Bomb, Link2, Brain, Sparkles, ChevronDown, Layers, Building2, Hammer, Vault, PartyPopper, FlaskConical, ScrollText, Gavel, Grid3x3 } from 'lucide-react';
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
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { requiresNetworkToPlay } from '@/lib/offline/landingOfflineAwareness';
import type { LandingGameMode } from '@/lib/landing/fetchGameModeStats';
import { placeBlastAfterArena } from '@/lib/landing/blastPlacement';
import { useExperiment } from '@/hooks/useExperiment';
import { LandingModeCubes } from './LandingModeCubes';
import { MODE_META, modeRoute, type ModeCubeModel } from '@/lib/landing/modeMeta';

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
type LandingCardKey =
  | LandingGameMode
  | 'connections'
  | 'brainGym'
  | 'wordCraft'
  | 'wordTower'
  | 'blastClassic'
  | 'blastV2'
  | 'wordForge'
  | 'wordVault'
  | 'party'
  | 'wordAlchemy'
  | 'shiritori'
  | 'sealedBid'
  | 'crossword';

/** Default card order when no server data available */
const DEFAULT_ORDER: LandingCardKey[] = ['daily', 'arena', 'blast', 'practice', 'connections', 'brainGym'];

/**
 * Featured landing modes — surfaces every shippable mode so players can
 * discover Connections, Adventure, and Brain Gym without hunting through
 * sidebar nav. Newcomer/veteran branches still bias which solo card leads.
 */
const FEATURED_MODES = new Set<LandingCardKey>([
  'daily', 'arena', 'blast', 'practice',
  'connections', 'brainGym', 'wordCraft', 'wordTower', 'blastClassic', 'blastV2',
  'wordForge', 'wordVault',
  'party', 'wordAlchemy', 'shiritori', 'sealedBid', 'crossword',
]);

/** CSS stagger delay for each card index */
const cardDelay = (index: number) => `${index * 0.07}s`;

/** Modes with no content for Japanese locale — hidden from hub */
const JA_HIDDEN_MODES = new Set<LandingCardKey>(['connections']);

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
  // Offline-aware home: when the device is offline, live-multiplayer cards are
  // shown locked so a player on a flight doesn't tap into a dead lobby. Every
  // other landing mode is solo / offline-capable. SSR-safe (true on server).
  const isOffline = !useOnlineStatus();

  // Personalization flags read localStorage, so their value differs between the
  // server (no window → false) and the client's first render. Using them during
  // that first render flips element types (expanded <section> ↔ collapsed
  // <details>) and card order → React #418 → whole-tree regeneration. Gate them
  // behind `mounted`: the first client render matches SSR (all false → expanded),
  // and the real personalization applies on the next commit. SSR already paints
  // the expanded layout, so this reflow is unchanged from before — only the
  // hydration error is removed.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Synchronous init from localStorage — read eagerly, but only consumed after
  // mount (see `mounted` gate below) so SSR/first-render stays stable.
  const [isFirstTimerRaw] = useState(() => {
    if (typeof window === 'undefined') return false;
    return shouldShowGuidance('firstPlayTutorialCompleted') && !hasCompletedOnboarding();
  });
  const [isNewbieRaw] = useState(() => {
    if (typeof window === 'undefined') return false;
    return isNewPlayer();
  });
  const isFirstTimer = mounted && isFirstTimerRaw;
  const isNewbie = mounted && isNewbieRaw;
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
  // Homepage layout A/B — `cubes` swaps the card grid for a bento of mode cubes.
  // BOTH layouts consume the identical computed/gated mode list below, so the
  // test isolates layout. Exposure fires only when the cube layout actually
  // renders (effect gated on the variant) for a clean denominator.
  const { variant: cubesVariant, trackExposure: trackCubesExposure } =
    useExperiment('landing-modes-cubes-v1');
  useEffect(() => {
    if (cubesVariant === 'cubes') trackCubesExposure();
  }, [cubesVariant, trackCubesExposure]);
  const isNewcomerByGames =
    mounted &&
    !isOnCrazyGamesPlatform &&
    !!userStats &&
    userStats.totalGamesPlayed < THRESHOLDS.modeRoster;
  // Once a player has finished even one multiplayer round they're past the
  // choice-paralysis window — surface every mode unconditionally instead of
  // hiding half behind a "More Game Modes" expander.
  const [hasPlayedMpRaw] = useState(() => {
    if (typeof window === 'undefined') return false;
    return getGamesCompleted() > 0;
  });
  const hasPlayedMp = mounted && hasPlayedMpRaw;
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
    // WordCraft is public — territory surfaces on the hub for everyone.
    if (!next.includes('wordCraft')) next.push('wordCraft');
    if (isAdmin && !next.includes('wordTower')) next.push('wordTower');
    // Blast Classic (legacy V1 engine) — admin-only card so both V1 + V2 (the
    // public 'blast' card) are reachable. /blast?v2=off opts into the V1 engine.
    if (isAdmin && !next.includes('blastClassic')) next.push('blastClassic');
    // Blast V2 (new SP engine) — admin-only card, its own standalone route.
    // Public 'blast' stays V1; /blast/v2 is a separate mode, not a toggle.
    if (isAdmin && !next.includes('blastV2')) next.push('blastV2');
    // Admin-only dev previews of modes not yet surfaced on the public hub.
    if (isAdmin && !next.includes('wordForge')) next.push('wordForge');
    if (isAdmin && !next.includes('wordVault')) next.push('wordVault');
    // Hidden modes that ship code but aren't surfaced to the public hub —
    // gated behind a PostHog flag (party), a typed-URL-only puzzle
    // (wordAlchemy), or pure standalone routes (shiritori). Admins get one
    // hub entry per mode so dev previews stay reachable without flipping
    // flags in the dashboard.
    if (isAdmin && !next.includes('party')) next.push('party');
    if (isAdmin && !next.includes('wordAlchemy')) next.push('wordAlchemy');
    if (isAdmin && !next.includes('shiritori')) next.push('shiritori');
    if (isAdmin && !next.includes('sealedBid')) next.push('sealedBid');
    if (isAdmin && !next.includes('crossword')) next.push('crossword');
    if (language === 'ja') return next.filter((m) => !JA_HIDDEN_MODES.has(m));
    return next;
  })();
  // Bump Blast up the hub: it sits directly after the multiplayer ('arena')
  // card, regardless of popularity ranking. (Supersedes the old
  // blast-before-adventure rule — arena is always above adventure.)
  const serverOrder: LandingCardKey[] = placeBlastAfterArena(rawOrder);
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
              priority
              variant="pink"
              liveBadge={{ openRooms, totalPlayers, roomsLabel: t('landing.openRooms'), playersLabel: t('landing.playersLive') }}
              playerCount={{ count: activePlayers, label: t('landing.playingNow') }}
              highlighted={isFirstTimer && !isNewbie && !practiceWinsHighlight}
              highlightLabel={isFirstTimer && !isNewbie && !practiceWinsHighlight ? t('onboarding.welcome.startHere') : undefined}
              locked={isOffline && requiresNetworkToPlay('arena')}
              lockedMessage={t('landing.offlineLocked')}
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
              priority
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

      case 'blastV2':
        return (
          <div key="blastV2" className="w-full h-full animate-[fadeInUp_0.4s_ease-out_both]" style={style}>
            <ModeCard
              title={t('landing.blastV2')}
              description={t('landing.blastV2Desc')}
              href={`/${language}/blast/v2`}
              icon={<Bomb className="w-6 h-6" />}
              variant="purple"
              badge="V2"
              onClick={() => { trackLandingCtaClick('mode_card', { mode: 'blastV2', variant: 'purple' }); }}
            />
          </div>
        );

      case 'crossword':
        return (
          <div key="crossword" className="w-full h-full animate-[fadeInUp_0.4s_ease-out_both]" style={style}>
            <ModeCard
              title={t('crossword.name')}
              description={t('crossword.tagline')}
              href={`/${language}/crossword`}
              icon={<Grid3x3 className="w-6 h-6" />}
              variant="cyan"
              badge="NEW"
              onClick={() => { trackLandingCtaClick('mode_card', { mode: 'crossword', variant: 'cyan' }); }}
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
              variant="blue"
              badge="NEW"
              onClick={() => { trackModeSelected('connections', 'home'); trackLandingCtaClick('mode_card', { mode: 'connections', variant: 'blue' }); }}
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
              variant="orange"
              badge="NEW"
              onClick={() => { trackModeSelected('wordCraft' as never, 'home'); trackLandingCtaClick('mode_card', { mode: 'wordCraft', variant: 'orange' }); }}
            />
          </div>
        );
      }

      case 'wordForge':
        return (
          <div key="wordForge" className="w-full h-full animate-[fadeInUp_0.4s_ease-out_both]" style={style}>
            <ModeCard
              title={t('landing.wordForgeMode')}
              description={t('landing.wordForgeModeDesc')}
              href={`/${language}/word-forge`}
              icon={<Hammer className="w-6 h-6" />}
              variant="lime"
              badge="ADMIN"
              onClick={() => { trackLandingCtaClick('mode_card', { mode: 'wordForge', variant: 'lime' }); }}
            />
          </div>
        );

      case 'wordVault':
        return (
          <div key="wordVault" className="w-full h-full animate-[fadeInUp_0.4s_ease-out_both]" style={style}>
            <ModeCard
              title={t('landing.wordVaultMode')}
              description={t('landing.wordVaultModeDesc')}
              href={`/${language}/word-vault`}
              icon={<Vault className="w-6 h-6" />}
              variant="cyan"
              badge="ADMIN"
              onClick={() => { trackLandingCtaClick('mode_card', { mode: 'wordVault', variant: 'cyan' }); }}
            />
          </div>
        );

      case 'party':
        return (
          <div key="party" className="w-full h-full animate-[fadeInUp_0.4s_ease-out_both]" style={style}>
            <ModeCard
              title={t('landing.partyMode')}
              description={t('landing.partyModeDesc')}
              href={`/${language}/party`}
              icon={<PartyPopper className="w-6 h-6" />}
              variant="pink"
              badge="ADMIN"
              locked={isOffline && requiresNetworkToPlay('party')}
              lockedMessage={t('landing.offlineLocked')}
              onClick={() => { trackLandingCtaClick('mode_card', { mode: 'party', variant: 'pink' }); }}
            />
          </div>
        );

      case 'wordAlchemy':
        return (
          <div key="wordAlchemy" className="w-full h-full animate-[fadeInUp_0.4s_ease-out_both]" style={style}>
            <ModeCard
              title={t('landing.wordAlchemyMode')}
              description={t('landing.wordAlchemyModeDesc')}
              href={`/${language}/word-alchemy`}
              icon={<FlaskConical className="w-6 h-6" />}
              variant="purple"
              badge="ADMIN"
              onClick={() => { trackLandingCtaClick('mode_card', { mode: 'wordAlchemy', variant: 'purple' }); }}
            />
          </div>
        );

      case 'shiritori':
        return (
          <div key="shiritori" className="w-full h-full animate-[fadeInUp_0.4s_ease-out_both]" style={style}>
            <ModeCard
              title={t('landing.shiritoriMode')}
              description={t('landing.shiritoriModeDesc')}
              href={`/${language}/shiritori/solo`}
              icon={<ScrollText className="w-6 h-6" />}
              variant="cyan"
              badge="ADMIN"
              onClick={() => { trackLandingCtaClick('mode_card', { mode: 'shiritori', variant: 'cyan' }); }}
            />
          </div>
        );

      case 'sealedBid':
        return (
          <div key="sealedBid" className="w-full h-full animate-[fadeInUp_0.4s_ease-out_both]" style={style}>
            <ModeCard
              title={t('landing.sealedBidMode')}
              description={t('landing.sealedBidModeDesc')}
              href={`/${language}/sealed-bid`}
              icon={<Gavel className="w-6 h-6" />}
              variant="blue"
              badge="ADMIN"
              onClick={() => { trackLandingCtaClick('mode_card', { mode: 'sealedBid', variant: 'blue' }); }}
            />
          </div>
        );

      default:
        return null;
    }
  };

  const MP_MODES = new Set<LandingCardKey>(['arena']);
  const SP_MODES = new Set<LandingCardKey>(['practice', 'blast', 'adventure', 'connections', 'brainGym', 'wordCraft', 'wordTower', 'blastClassic', 'blastV2', 'wordForge', 'wordVault', 'party', 'wordAlchemy', 'shiritori', 'sealedBid', 'crossword']);
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

  // ===== `cubes` A/B variant — bento layout over the SAME gated mode list =====
  if (cubesVariant === 'cubes') {
    // Modes that fire `mode_selected` in the control switch — preserve so the
    // A/B compares layout, not instrumentation.
    const TRACK_SELECTED = new Set<LandingCardKey>([
      'arena', 'practice', 'blast', 'adventure', 'connections', 'brainGym', 'wordCraft',
    ]);
    const buildCubeModel = (key: LandingCardKey, role: 'anchor' | 'normal'): ModeCubeModel | null => {
      const meta = MODE_META[key];
      const href = modeRoute(key, language);
      if (!meta || !href) return null; // 'daily' + any unmapped key → not a cube
      const onClick = () => {
        if (TRACK_SELECTED.has(key)) trackModeSelected(key as never, 'home');
        trackLandingCtaClick('mode_card', { mode: key, variant: meta.variant });
      };
      const base: ModeCubeModel = {
        key, title: t(meta.titleKey), href, variant: meta.variant, Icon: meta.Icon,
        genIcon: meta.genIcon, badge: meta.badge, role, onClick,
      };
      if (key === 'arena') {
        const arenaHighlight = isFirstTimer && !isNewbie && !practiceWinsHighlight;
        return {
          ...base,
          livePill: activePlayers > 0 ? `${activePlayers.toLocaleString()} ${t('landing.playingNow')}` : undefined,
          highlighted: arenaHighlight,
          highlightLabel: arenaHighlight ? t('onboarding.welcome.startHere') : undefined,
          locked: isOffline && requiresNetworkToPlay('arena'),
          lockedMessage: t('landing.offlineLocked'),
        };
      }
      if (key === 'practice') {
        const showPracticeHighlight = isNewbie || !isVeteran;
        return {
          ...base,
          highlighted: showPracticeHighlight,
          highlightLabel: showPracticeHighlight ? t('onboarding.welcome.startHere') : undefined,
        };
      }
      if (key === 'party') {
        return { ...base, locked: isOffline && requiresNetworkToPlay('party'), lockedMessage: t('landing.offlineLocked') };
      }
      return base;
    };

    const isModel = (m: ModeCubeModel | null): m is ModeCubeModel => m !== null;
    // SAME above-fold/collapsed split as the control card grid — newcomers see
    // the essential set, the rest goes into the "more modes" expander. Keeps the
    // A/B a pure layout test (identical visible + collapsed sets both sides). The
    // sparse-grid look a 2-mode newcomer set would give is handled by the
    // adaptive anchor in LandingModeCubes (no forced 2×2 when few cubes).
    const visibleKeys: LandingCardKey[] = [
      ...mpCards,
      ...(featurePractice ? (['practice'] as LandingCardKey[]) : []),
      ...spCards,
    ];
    const visibleModels = visibleKeys
      .map((k) => buildCubeModel(k, k === 'arena' ? 'anchor' : 'normal'))
      .filter(isModel);
    const extraModels = [...mpCardsExtra, ...spCardsExtra]
      .map((k) => buildCubeModel(k, 'normal'))
      .filter(isModel);
    const dailyNode = heroCards.includes('daily')
      ? <DailyChallengeBanner preloadedStats={dailyChallengeStats} />
      : null;

    return (
      <LandingModeCubes
        models={visibleModels}
        extras={extraModels}
        dailyNode={dailyNode}
        sectionLabel={t('landing.sectionSoloTitle')}
        moreLabel={t('landing.moreGameModes')}
        moreHint={t('landing.moreGameModesHint')}
        collapseLabel={t('common.collapse')}
        t={t}
      />
    );
  }

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
                <span className="font-neo-body text-xs sm:text-sm text-neo-white group-open:hidden flex items-center gap-2">
                  {hiddenCount > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[1.4rem] h-5 px-1.5 rounded-full bg-neo-lime text-neo-navy font-neo-display font-black text-[0.65rem] leading-none border border-black">
                      +{hiddenCount}
                    </span>
                  )}
                  {t('landing.moreGameModesHint') || 'Tap to explore'}
                </span>
                <span className="font-neo-body text-xs sm:text-sm text-neo-white hidden group-open:inline">
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
