'use client';

import { useState, useEffect } from 'react';
import DailyChallengeCube from '@/components/daily/DailyChallengeCube';
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
  | 'wordForge'
  | 'wordVault'
  | 'party'
  | 'wordAlchemy'
  | 'shiritori'
  | 'sealedBid'
  | 'crossword'
  | 'wordfall';

/** Default card order when no server data available */
const DEFAULT_ORDER: LandingCardKey[] = ['daily', 'arena', 'blast', 'practice', 'connections', 'brainGym'];

/**
 * Featured landing modes — surfaces every shippable mode so players can
 * discover Connections, Adventure, and Brain Gym without hunting through
 * sidebar nav. Newcomer/veteran branches still bias which solo card leads.
 */
const FEATURED_MODES = new Set<LandingCardKey>([
  'daily', 'arena', 'blast', 'practice',
  'connections', 'brainGym', 'wordCraft', 'wordTower',
  'wordForge', 'wordVault',
  'party', 'wordAlchemy', 'shiritori', 'sealedBid', 'crossword', 'wordfall',
]);

/** CSS stagger delay for each card index */

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
  // gated on in-work access (admin OR beta tester), no extra experiment lock.
  const { canSeeInWorkModes } = useAuth();
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
  // Homepage mode section is the cubes bento (legacy control card grid retired).
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
    if (canSeeInWorkModes && !next.includes('wordTower')) next.push('wordTower');
    // In-work dev previews of modes not yet surfaced on the public hub.
    if (canSeeInWorkModes && !next.includes('wordForge')) next.push('wordForge');
    if (canSeeInWorkModes && !next.includes('wordVault')) next.push('wordVault');
    // Hidden modes that ship code but aren't surfaced to the public hub —
    // gated behind a PostHog flag (party), a typed-URL-only puzzle
    // (wordAlchemy), or pure standalone routes (shiritori). Admins + beta
    // testers get one hub entry per mode so previews stay reachable without
    // flipping flags in the dashboard.
    if (canSeeInWorkModes && !next.includes('party')) next.push('party');
    if (canSeeInWorkModes && !next.includes('wordAlchemy')) next.push('wordAlchemy');
    if (canSeeInWorkModes && !next.includes('shiritori')) next.push('shiritori');
    if (canSeeInWorkModes && !next.includes('sealedBid')) next.push('sealedBid');
    if (canSeeInWorkModes && !next.includes('crossword')) next.push('crossword');
    // Wordfall (Blast V2) — admin/beta dev preview, routes to /blast/v2.
    if (canSeeInWorkModes && !next.includes('wordfall')) next.push('wordfall');
    if (language === 'ja') return next.filter((m) => !JA_HIDDEN_MODES.has(m));
    return next;
  })();
  // Bump Blast up the hub: it sits directly after the multiplayer ('arena')
  // card, regardless of popularity ranking. (Supersedes the old
  // blast-before-adventure rule — arena is always above adventure.)
  const serverOrder: LandingCardKey[] = placeBlastAfterArena(rawOrder);
  // Veterans have completed practice — remove it so it doesn't compete for
  // the featured-row slot or the SP grid (they don't need the onramp).
  // Practice is an onramp cube for NEW players only.
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


  const MP_MODES = new Set<LandingCardKey>(['arena']);
  const SP_MODES = new Set<LandingCardKey>(['practice', 'blast', 'adventure', 'connections', 'brainGym', 'wordCraft', 'wordTower', 'wordForge', 'wordVault', 'party', 'wordAlchemy', 'shiritori', 'sealedBid', 'crossword', 'wordfall']);
  // Newcomer-essential modes — always visible above the fold. Everything else
  // collapses into a "More Game Modes" expander to reduce choice paralysis
  // without removing the cards from the DOM (preserves SEO + AI-crawler links).
  // Arena (multiplayer) stays surfaced for newbies so the live-rooms entry
  // point isn't buried — players consistently asked for it on landing.
  const ESSENTIAL_FOR_NEWBIES = new Set<LandingCardKey>(['daily', 'practice', 'arena']);

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
      genIcon: meta.genIcon, imgScale: meta.imgScale, badge: meta.badge, role, onClick,
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
  // Daily is the cubes hero — always present (it's the once-a-day hook), not
  // gated on heroCards like the control arm. It renders above the bento grid.
  const dailyNode = <DailyChallengeCube preloadedStats={dailyChallengeStats} />;

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
