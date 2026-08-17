'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Trophy, Flame, Sparkles } from 'lucide-react';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { subscribeToWordTowerWrecks } from '@/lib/wordTower/wreckLive';
import { useHideNavigation } from '@/contexts/NavigationContext';
import { useHaptics } from '@/hooks/useHaptics';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useGameActiveSound } from '@/hooks/useGameActiveSound';
import { TOWER_SURPRISE_META, type ActiveTowerSurprise, type TowerSurpriseSound } from '@/lib/wordTower/towerSurprise';
import type { Language } from '@/shared/types/game';
import { useWordTower } from '@/lib/wordTower/useWordTower';
import {
  biomeForHeight,
  floorMeters,
  restoreWordTowerState,
  serializeWordTowerState,
  type WordTowerPlayerState,
} from '@/lib/wordTower/wordTowerManager';
import { letterTickRate } from '@/lib/wordTower/placementFx';
import { WORD_TOWER_MIN_WORD_LEN, WORD_TOWER_BIOMES, WORD_TOWER_SCRAMBLE_COIN_COST } from '@/shared/constants/wordTowerConstants';
import { countBuildableWords, pickClueWord } from '@/lib/wordTower/wordHints';
import type { RivalMarker } from '@/lib/wordTower/rivals';
import { WordTowerRivalRail } from './WordTowerRivalRail';
import { WordTowerLandmarkRail } from './WordTowerLandmarkRail';
import { milestoneCrossed } from '@/lib/wordTower/milestones';
import { landmarkCrossed } from '@/lib/wordTower/landmarkMoment';
import WordTowerCrane, { type WordTowerCraneHandle } from './WordTowerCrane';
import { useCraneDrop } from './useCraneDrop';
import { useAutoDismiss } from './useAutoDismiss';
import { useExitReveal } from './useExitReveal';
import { effectiveSweepPeriodMs } from '@/lib/wordTower/craneSweep';
import { isNearMiss } from '@/lib/wordTower/towerLean';
import { swayInstability, swayHeightDampen, steadyHandsDampen } from '@/lib/wordTower/towerSway';
import { BIOME_THEME } from './biomeTheme';
import {
  mutatorForDate,
  mutatorModifiers,
  mutatorSweepMult,
  mutatorWordMultiplier,
  type DailyMutator,
} from '@/lib/wordTower/dailyMutators';
import { comboMilestone, type ComboMilestone } from '@/lib/wordTower/comboMilestone';
import { dailyTowerGameCode, DAILY_PLAYER_ID, utcDateKey } from '@/lib/wordTower/dailySeed';
import { WordTowerMutatorBanner } from './WordTowerMutatorBanner';
import { WordTowerNoticeColumn } from './WordTowerNoticeColumn';
import { fireConfetti } from '@/utils/confettiUtils';
import { LazyMotion, domAnimation } from 'framer-motion';
import { CoinCounterAnimated } from '@/components/animations/CoinCounterAnimated';
import { blockMaterial } from '@/lib/wordTower/blockGrade';
import { newlyUnlockedSkin, type TowerSkin } from '@/lib/wordTower/skins';
import { unseenSkinIds, readSeenSkins, markSkinsSeen } from '@/lib/wordTower/menuNotice';
import { useTowerSkin } from './useTowerSkin';
import { WordTowerSkinPicker } from './WordTowerSkinPicker';
import { WordTowerActionMenu } from './WordTowerActionMenu';
import { textColorOn } from '@/lib/wordTower/towerColumn';
import { dropFlavor } from '@/lib/wordTower/dropFlavor';
import { buildDropVerdict, formatHeightGain, type DropVerdict } from '@/lib/wordTower/dropVerdict';
import { supportBandBonus, type PlacementOutcome, type PlacementQuality } from '@/lib/wordTower/cranePlacement';
import { playChromeFrame, DEFAULT_TOP_CHROME_PX } from '@/lib/wordTower/playChromeFrame';
import { useWordTowerPerks } from './useWordTowerPerks';
import { useRunStreakPerk } from '@/lib/wordTower/useRunStreakPerk';
import { WordTowerPerkDraft } from './WordTowerPerkDraft';
import { perkMilestoneAt, reducedTopple, combineModifiers, PERKS } from '@/lib/wordTower/perks';
import { beatsDailyBest } from '@/lib/wordTower/dailyBest';
import { hazardsCrossed } from '@/lib/wordTower/hazards';
import { zoneTeaseAt } from '@/lib/wordTower/zoneTease';
import { newlyUnlocked, type Achievement } from '@/lib/wordTower/achievements';
import { WordTowerScene } from './WordTowerScene';
import { WordTowerHud } from './WordTowerHud';
import { WordTowerStatHud } from './WordTowerStatHud';
import { WordTowerToolbar } from './WordTowerToolbar';
import { WordTowerNextRivalChip } from './WordTowerNextRivalChip';
import { addCoins, getCoins, spendCoins } from '@/utils/coinManager';
import { DomCoinBurst } from '@/components/animations/DomCoinBurst';
import {
  rollTowerReward,
  nextDryStreak,
  rewardRoll01,
  type RewardSource,
} from '@/lib/wordTower/towerReward';
import { type RewardRevealPayload } from './WordTowerRewardReveal';
import { useTowerUpgradeStore } from '@/lib/wordTower/useTowerUpgradeStore';
import { computeEffects as computeUpgradeEffects } from '@/lib/wordTower/upgrades';
import { WordTowerUpgradePanel } from './WordTowerUpgradePanel';
import { useSabotageIntegration } from './useSabotage';
import { WordTowerSabotageBay } from './WordTowerSabotageBay';
import { applyAsyncWrecks, type PendingWreck } from '@/lib/wordTower/asyncWreck';
import { asyncWreckDamageFloors } from '@/lib/wordTower/sabotage';
import { trackGameStart, trackGameEnd } from '@/utils/growthTracking';

/** How long a transient celebration toast holds before it auto-dismisses. Kept
 *  short + uniform so banners clear quickly and never pile up / "stick" on
 *  screen (founder 2026-06-19: "the notifications stay stuck and don't
 *  disappear"). Trimmed again so even back-to-back drops never leave a banner
 *  lingering over the play area. */
const TOAST_MS = 950;

/** The big centre DROP VERDICT is the most screen-dominant banner, so it clears
 *  fastest — long enough to read the result + metres, gone before the next drop
 *  so it never blocks the tower. */
const VERDICT_MS = 750;

/** Coin-reward reveal holds a touch longer than a toast — it's the "you got
 *  something" beat and deserves a readable count. */
const REWARD_MS = 1500;
/** Wreck Report (async raid landed on you) holds longest — it's a one-per-session
 *  story beat the defender should actually read. */
const WRECK_REPORT_MS = 3500;

/** Local session fallback key. The tower itself persists across days; only the
 *  daily seed/wheel changes per UTC day. */
function sessionStorageKey(daily: boolean) {
  return daily ? 'wt-session-persistent' : 'wt-session-endless';
}

interface SavedSession {
  savedAt: number;
  state: ReturnType<typeof serializeWordTowerState>;
}

function saveSessionToLocalStorage(g: WordTowerPlayerState, daily: boolean) {
  try {
    const payload: SavedSession = { savedAt: Date.now(), state: serializeWordTowerState(g) };
    localStorage.setItem(sessionStorageKey(daily), JSON.stringify(payload));
  } catch { /* best-effort; private mode can throw */ }
}

function loadSessionFromLocalStorage(daily: boolean): SavedSession | null {
  const tryKey = (key: string): SavedSession | null => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as SavedSession;
      if (!parsed?.state) return null;
      return parsed;
    } catch { return null; }
  };
  let saved = tryKey(sessionStorageKey(daily));
  // One-time migration from the old date-stamped daily key.
  if (!saved && daily) {
    saved = tryKey(`wt-session-daily-${utcDateKey()}`);
    if (saved) {
      try { localStorage.setItem(sessionStorageKey(true), JSON.stringify(saved)); } catch { /* */ }
    }
  }
  return saved;
}

/* (Verdict tone classes + tier-kicker keys moved into WordTowerNoticeColumn.) */

interface PlayProps {
  language: Language;
  isInDictionary: (canonWord: string) => boolean;
  /** Client dictionary (canonical words) — drives the "N words possible" hint. */
  dictionary: Set<string> | null;
  initialGame: WordTowerPlayerState;
  personalBestM: number;
  onOpenLeaderboard: () => void;
  /** Other players' records to climb past (empty = no rail). */
  rivals?: RivalMarker[];
  /** Daily Tower run — gates the endless progress POST so a daily (perk-eligible)
   *  climb NEVER writes to the shared monotonic board. */
  daily?: boolean;
  /** Fires once when the player first engages the daily run (first floor placed) —
   *  the wrapper uses it to grow the daily streak. */
  onDailyEngaged?: () => void;
  /** Seed for the daily perk draft (the shared daily game code) — perks only
   *  appear in daily mode, so this is unused when `daily` is false. */
  perkSeed?: string;
  /** Fires (daily mode) the first time the climb beats today's stored best —
   *  the wrapper persists the new best. */
  onNewDailyBest?: (heightM: number) => void;
}

function usePrefersReducedMotion(): boolean {
  // Reactive STATE, not a ref: a ref mutation never re-renders, so the old
  // version silently reported `false` forever — reduced-motion users still got
  // every tween (and the snappy exitMs=0 dismiss path was never taken). Reading
  // it as state means the preference is actually honoured, and it tracks live
  // toggles via the media-query change event.
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);
  return reduced;
}

export function WordTowerPlay({ language, isInDictionary, dictionary, initialGame, personalBestM, onOpenLeaderboard, rivals = [], daily = false, onDailyEngaged, perkSeed = '', onNewDailyBest }: PlayProps) {
  const { t, dir } = useLanguage();
  const reducedMotion = usePrefersReducedMotion();
  const tower = useWordTower({ language, sessionId: 'solo', isInDictionary, initialGame });
  const { game } = tower.state;
  // Always-current pointer to the live game, for async callbacks (e.g. the
  // session-start wreck apply) that must act on the latest state, not a stale
  // closure snapshot.
  const gameRef = useRef(game);
  gameRef.current = game;

  // Session funnel. Word Tower shipped with ZERO telemetry across its 25
  // components: PostHog held no word-tower event at all, so "6 players ever"
  // (word_tower_progress, 2026-08-17) could not be told apart from "hundreds
  // open it and bounce before floor 1". Endless mode has no completion, so the
  // pair is start-on-mount / abandon-on-exit carrying the height reached —
  // that distribution IS the cliff. Reuses the same helpers every other mode
  // calls, so the mode lands in the existing funnels for free (trackGameStart
  // also arms the pagehide abandon, which covers a closed tab).
  useEffect(() => {
    const startedAt = Date.now();
    // The daily tower PERSISTS across sessions, so a returning player mounts with
    // floors already built. Baseline them, or every resumed session would report
    // "reached floor 1" without the player having placed anything this visit.
    const floorsAtStart = gameRef.current.floors.length;
    trackGameStart('word-tower', { daily, floorsAtStart });
    return () => {
      const g = gameRef.current;
      const floorsBuilt = g.floors.length - floorsAtStart;
      trackGameEnd(
        'word-tower',
        Math.round(g.heightM),
        Math.max(0, floorsBuilt),
        false,
        Math.round((Date.now() - startedAt) / 1000),
        {
          floors: g.floors.length,
          floorsBuilt,
          heightM: Math.round(g.heightM),
          daily,
          // The bounce test: did this visit place a single floor at all?
          placedAnyFloor: floorsBuilt > 0,
        },
      );
    };
    // Mount/unmount only — a re-run would double-count the session.
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Live coin balance mirror — coinManager is a plain (server-synced) store with
  // no reactive hook, so we mirror it locally (same pattern as the upgrade panel)
  // and refresh after any grant/spend. Powers the scramble button's buy state.
  const [coinBalance, setCoinBalance] = useState(() => getCoins());
  const biomeId = useMemo(() => biomeForHeight(game.heightM), [game.heightM]);
  const personalBest = Math.max(personalBestM, game.heightM);
  // Near-miss anticipation: a quiet "Next: Aurora · 18m" chip in the last stretch
  // before a new zone (the zone-entry banner pays it off).
  const tease = useMemo(() => zoneTeaseAt(game.heightM), [game.heightM]);
  // Viewed altitude (live height, or lower while panned) — drives the landmark + rival rails.
  const [viewAlt, setViewAlt] = useState(game.heightM);
  // Persistent upgrade shop (spend coins on permanent tower boosts between climbs).
  const [showUpgrades, setShowUpgrades] = useState(false);
  // "N words possible" hint — how many dictionary words the player could build
  // from the current anchor + tray (recomputed only when those change).
  const possibleWords = useMemo(
    () => (dictionary ? countBuildableWords(dictionary, game.tray, WORD_TOWER_MIN_WORD_LEN, game.usedWords) : null),
    [dictionary, game.tray, game.usedWords],
  );
  // Nth clue for the CURRENT wheel. A plain memoised `clueWord` was the bug the
  // founder hit: identical inputs → identical word, so clue #2 (a rewarded ad)
  // repeated clue #1. The toolbar owns the index and asks for the next one.
  const getClue = useCallback(
    (skip: number) => (dictionary ? pickClueWord(dictionary, game.tray, WORD_TOWER_MIN_WORD_LEN, game.usedWords, skip) : null),
    [dictionary, game.tray, game.usedWords],
  );
  // Dead-end escape: spin a fresh wheel that actually has buildable words left.
  const reroll = useCallback(
    () => tower.reroll(dictionary ? (wheel) => countBuildableWords(dictionary, wheel, WORD_TOWER_MIN_WORD_LEN, game.usedWords) > 0 : undefined),
    [tower, dictionary, game.usedWords],
  );

  // ── audio (declared before the feedback effects below that fire these sounds) ──
  const haptics = useHaptics();
  const {
    playCoinCollectSound,
    playChestOpenSound,
    playErrorSound,
    playComboMilestoneSound,
    playLevelUpSound,
    playHintRevealSound,
    playPowerUpSound,
    playGiftReceivedSound,
    playTimeBonusSound,
    playRareWordSound,
    playPerfectWordSound,
    playPathConnectSound,
    playTileSelectSound,
    playTileAppearSound,
    playSound,
  } = useSoundEffects();
  // A satisfying, slightly-random LANDING thock on every drop (founder ask). The
  // variant + dust scale by how cleanly it landed; seeded per drop so it's varied
  // but reproducible. Maps dropFlavor's abstract key → a concrete percussive SFX.
  const dropSoundFns = useMemo<Record<string, () => void>>(
    () => ({
      landCrisp: playPerfectWordSound,
      landSolid: playPathConnectSound,
      landSoft: playTileSelectSound,
      landDull: playTileAppearSound,
    }),
    [playPerfectWordSound, playPathConnectSound, playTileSelectSound, playTileAppearSound],
  );
  const dropCountRef = useRef(0);
  // Maps a surprise event's semantic sound key (declared in TOWER_SURPRISE_META)
  // to the concrete play*Sound fn — keeps the audio choice co-located with the
  // event in the pure module, the wiring here.
  const surpriseSoundFns = useMemo<Record<TowerSurpriseSound, () => void>>(
    () => ({
      powerUp: playPowerUpSound,
      gift: playGiftReceivedSound,
      timeBonus: playTimeBonusSound,
      rare: playRareWordSound,
      chest: playChestOpenSound,
    }),
    [playPowerUpSound, playGiftReceivedSound, playTimeBonusSound, playRareWordSound, playChestOpenSound],
  );

  // ── unmute: tell the sound system a game is active for the playing lifetime.
  // Word Tower authors 8 SFX but never flipped game-active, so every one silently
  // no-op'd (playSound defaults requiresGameActive:true). This makes them audible.
  useGameActiveSound(true);

  // ── Tangible rewards: REAL coins granted at milestones (new zone / achievement),
  // with a variable-reward tier reveal. Coins land in the shared wallet via
  // coinManager — the player ACTUALLY keeps them, closing the old "visual-only
  // rewards" gap.
  //
  // Idempotency is owned by the CALLERS, not a cross-run breadcrumb: the zone
  // effect's `prevZone` ref fires once per zone crossing, and `achUnlocked`
  // (localStorage-persisted) makes each achievement pay once ever. That is
  // deliberate — a localStorage breadcrumb keyed on the static endless gameCode
  // ('solo') would pay each zone only ONCE PER DEVICE EVER, starving every later
  // climb. With the ref guards, a fresh climb re-earns its zone coins (income
  // that flows each session) while achievements stay one-time feats.
  const dryStreakRef = useRef(0);
  // Per-mount seed so each climb's reward tiers vary (the static gameCode can't).
  const rewardRunSeed = useRef(typeof window !== 'undefined' ? String(Date.now()) : 'ssr');
  const [rewardFx, setRewardFx] = useState<RewardRevealPayload | null>(null);
  // "Coins collected" fly — a burst of coins streams from the reward beat up into
  // the wallet counter, which then pulses + rolls the new total (founder ask
  // 2026-07-17). Self-contained (DomCoinBurst) with the counter's real on-screen
  // position, so it can't drift from the true balance the way the shared global
  // coin HUD (server/guest total) could on this local-coin surface.
  const [coinFly, setCoinFly] = useState<{ source: { x: number; y: number }; target: { x: number; y: number }; count: number; key: number } | null>(null);
  // Cumulative progression earn-events (new zones + achievements) this run —
  // the primary source of wrecking-ball charges.
  const [earnEvents, setEarnEvents] = useState(0);
  const grantReward = useCallback(
    (source: RewardSource, id: string, magnitude: number) => {
      if (typeof window === 'undefined') return;
      const reward = rollTowerReward(rewardRoll01(`${rewardRunSeed.current}-${source}-${id}`), {
        source,
        magnitude,
        dryStreak: dryStreakRef.current,
      });
      dryStreakRef.current = nextDryStreak(dryStreakRef.current, reward.tier);
      // Master Architect upgrade fattens every payout (read imperatively so the
      // store subscription never churns this hot reward path).
      const rewardMult = useTowerUpgradeStore.getState().effects().rewardMult;
      const coins = Math.round(reward.coins * rewardMult);
      addCoins(coins, `wordtower_${source}`, { id });
      setCoinBalance(getCoins());
      setRewardFx({ coins, tier: reward.tier, source, key: Date.now() });
      playCoinCollectSound();
      // "Coins collected" fly: stream a few coins from the reward beat (upper
      // centre) into the wallet counter, which then pulses + rolls up. Skipped
      // under reduced motion (the counter's +N/roll still reads the gain).
      if (typeof window !== 'undefined' && !reducedMotion) {
        const counterEl = document.querySelector<HTMLElement>('[data-coin-counter="true"]');
        const r = counterEl?.getBoundingClientRect();
        const target = r
          ? { x: r.left + r.width / 2, y: r.top + r.height / 2 }
          : { x: window.innerWidth - 48, y: 56 };
        setCoinFly({
          source: { x: window.innerWidth / 2, y: window.innerHeight * 0.32 },
          target,
          count: Math.max(4, Math.min(12, Math.round(coins / 6))),
          key: Date.now(),
        });
      }
      // Rare/epic drops get a PHYSICAL payoff beyond the chip — a confetti
      // burst scaled to tier + the chest sting on epic — so the controlled-
      // rarity moment is felt, not just read. Commons stay quiet by design
      // (they fire every zone; celebrating all of them would be noise).
      if (reward.tier === 'rare' || reward.tier === 'epic') {
        if (!reducedMotion) {
          fireConfetti({
            particleCount: reward.tier === 'epic' ? 90 : 40,
            spread: reward.tier === 'epic' ? 100 : 70,
            origin: { y: 0.35 },
          });
        }
        if (reward.tier === 'epic') playChestOpenSound();
      }
    },
    [playCoinCollectSound, playChestOpenSound, reducedMotion],
  );
  useAutoDismiss(rewardFx?.key, () => setRewardFx(null), REWARD_MS);

  // "NEW ZONE" banner — owns this slot; milestones at the same height defer.
  const [zoneText, setZoneText] = useState<string | null>(null);
  const prevZone = useRef(biomeId);
  useEffect(() => {
    if (prevZone.current === biomeId) return;
    prevZone.current = biomeId;
    setZoneText(t(`wordTower.biome.${biomeId}`));
    // A new place pays out coins AND earns a wrecking-ball charge (founder ask).
    const zoneIndex = WORD_TOWER_BIOMES.findIndex((b) => b.id === biomeId);
    grantReward('zone', biomeId, Math.max(0, zoneIndex));
    setEarnEvents((n) => n + 1);
  }, [biomeId]); // eslint-disable-line react-hooks/exhaustive-deps
  useAutoDismiss(zoneText, () => setZoneText(null), TOAST_MS);

  // Witty milestone toast on crossing a height landmark.
  const [milestoneText, setMilestoneText] = useState<string | null>(null);
  const prevMilestoneH = useRef(game.heightM);
  useEffect(() => {
    const prev = prevMilestoneH.current;
    prevMilestoneH.current = game.heightM;
    // A zone change owns the celebration at that height → skip the colliding milestone.
    if (biomeForHeight(prev) !== biomeForHeight(game.heightM)) return;
    const hit = milestoneCrossed(prev, game.heightM);
    if (!hit) return;
    setMilestoneText(t(hit.key));
    haptics.success();
    playLevelUpSound();
  }, [game.heightM]); // eslint-disable-line react-hooks/exhaustive-deps
  useAutoDismiss(milestoneText, () => setMilestoneText(null), TOAST_MS);

  // Landmark flyby — cosy "you passed X" beat. Defers to a zone or milestone at the same height.
  const [landmarkText, setLandmarkText] = useState<string | null>(null);
  const prevLandmarkH = useRef(game.heightM);
  useEffect(() => {
    const prev = prevLandmarkH.current;
    prevLandmarkH.current = game.heightM;
    if (biomeForHeight(prev) !== biomeForHeight(game.heightM)) return; // zone owns it
    if (milestoneCrossed(prev, game.heightM)) return;                  // milestone owns it
    const hit = landmarkCrossed(prev, game.heightM);
    if (!hit) return;
    setLandmarkText(`${hit.icon} ${t(hit.key)}`);
    playHintRevealSound();
  }, [game.heightM]); // eslint-disable-line react-hooks/exhaustive-deps
  useAutoDismiss(landmarkText, () => setLandmarkText(null), TOAST_MS);

  // Achievements — unlock once (persisted in localStorage), pop a trophy toast.
  const achUnlocked = useRef<Set<string>>(new Set());
  const achLoaded = useRef(false);
  if (!achLoaded.current) {
    achLoaded.current = true;
    try { achUnlocked.current = new Set(JSON.parse(typeof localStorage !== 'undefined' ? localStorage.getItem('wt-achievements') || '[]' : '[]')); } catch { /* */ }
  }
  const [achToast, setAchToast] = useState<Achievement | null>(null);
  useEffect(() => {
    const stats = {
      heightM: game.heightM,
      floors: game.floors.length,
      longestWord: (game.longestWord || '').length,
      longestCombo: game.longestCombo,
      passedRival: rivals.some((r) => game.heightM > r.heightM),
    };
    const fresh = newlyUnlocked(stats, achUnlocked.current);
    if (fresh.length === 0) return;
    fresh.forEach((ach) => achUnlocked.current.add(ach.id));
    try { localStorage.setItem('wt-achievements', JSON.stringify([...achUnlocked.current])); } catch { /* */ }
    setAchToast(fresh[fresh.length - 1]); // show the most impressive of the batch
    // Each unlock pays REAL coins + earns a wrecking-ball charge (founder ask).
    fresh.forEach((ach, i) => grantReward('achievement', ach.id, i));
    setEarnEvents((n) => n + fresh.length);
  }, [game.heightM, game.floors.length, game.longestWord, game.longestCombo, rivals]); // eslint-disable-line react-hooks/exhaustive-deps
  useAutoDismiss(achToast, () => setAchToast(null), TOAST_MS);

  // Roguelike perk draft — daily-run only. Boons fold into one modifier object
  // the crane + hazard sites read. Segregated from the endless board (daily gates
  // the progress POST), so height-boosting perks never inflate records.
  const perks = useWordTowerPerks(daily, perkSeed);
  const runStreak = useRunStreakPerk();
  useEffect(() => {
    runStreak.onGameUpdate(game.heightM, game.floors.length);
  }, [game.heightM, game.floors.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // The day's shared mutator — the twist EVERY player faces today (daily only).
  // Date-seeded so it's identical worldwide; keeps daily scores comparable while
  // making each day play differently (the fun + random-factor lever).
  const mutator: DailyMutator | null = useMemo(
    () => (daily ? mutatorForDate(utcDateKey(), language) : null),
    [daily, language],
  );
  // Structural mutator effects (skyline ×height, featherday topple-save) fold INTO
  // the perk struct via the same fields the crane + hazard sites already read.
  // Persistent upgrades the player has bought, folded into the run. Reinforced
  // Core (extraTopple) → brinkExtra (more bad drops before do-or-die) via the SAME
  // modifier algebra perks + mutators use; Steady Cable (sweepSpeedMult) slows the
  // crane below; reward/wind are read at their own sites.
  const upgradeLevels = useTowerUpgradeStore((s) => s.levels);
  const upgradeEffects = useMemo(() => computeUpgradeEffects(upgradeLevels), [upgradeLevels]);
  const craneMods = useMemo(() => {
    const withMutator = mutator ? combineModifiers(perks.modifiers, mutatorModifiers(mutator)) : perks.modifiers;
    // Fold EVERY modifier-shaped upgrade effect into the run via the same algebra
    // perks + mutators use: Reinforced Core (brinkExtra), Tailwind (heightMult),
    // Salvage (toppleReduction), Momentum (perfectBonus). Sweep/wind/reward/perfect-
    // band/lean-recovery are read at their own sites.
    const withUpgrades = combineModifiers(withMutator, {
      brinkExtra: upgradeEffects.extraTopple,
      heightMult: upgradeEffects.heightMult,
      toppleReduction: upgradeEffects.toppleReduction,
      perfectBonus: upgradeEffects.perfectBonus,
    });
    return runStreak.totalHeightMult !== 1
      ? combineModifiers(withUpgrades, { heightMult: runStreak.totalHeightMult })
      : withUpgrades;
  }, [perks.modifiers, mutator, upgradeEffects, runStreak.totalHeightMult]);
  // Word-aware mutator height × (golden letter / vowels / length). Read at drop
  // time from the held word — the only mutator effect that can't fit PerkModifiers.
  const pendingWordRef = useRef<string | null>(null);
  pendingWordRef.current = tower.state.pendingWord;
  const wordHeightMult = useCallback(() => {
    const pw = pendingWordRef.current;
    return mutator && pw ? mutatorWordMultiplier(mutator, pw, language) : 1;
  }, [mutator, language]);

  // Crane Stack — cosy reward-amplifier; logic in useCraneDrop. Combined modifiers
  // tune the perfect bonus, height, brink forgiveness, and wobble cushioning; the
  // word-mult getter applies the day's word-aware twist on the drop.
  // Quick Recovery upgrade getter — read live (imperative) so the calm-down speed
  // tracks the owned level without churning the stable drop callback.
  const leanRelaxGetter = useCallback(() => upgradeEffects.leanResetMult, [upgradeEffects.leanResetMult]);
  const crane = useCraneDrop(tower.commitPlacement, tower.hazard, craneMods, wordHeightMult, leanRelaxGetter);

  // Imperative handle on the crane so the bottom HUD's swapped-in DROP CTA
  // can fire drop() — the player's thumb stays on the same button instead of
  // chasing the swinging beam to the top of the screen.
  const craneRef = useRef<WordTowerCraneHandle | null>(null);
  const triggerCraneDrop = useCallback(() => craneRef.current?.drop(), []);

  // The band the crane's aim would CURRENTLY score, mirrored down to the DROP
  // control at the bottom of the screen.
  //
  // The crane sweeps at the top of the viewport while the player's thumb rests
  // on the hub at the bottom — so timing the shot meant watching one end of the
  // screen and tapping the other. The wheel's answer to this used to be a
  // "crane steering dial": a rim with spokes that rotated and steered nothing.
  // Mirroring the real band instead makes the drop a genuine skill shot the
  // player can read where their thumb already is.
  const [aimBand, setAimBand] = useState<PlacementQuality | null>(null);

  // Sweep period RAMPS with tower height (slow + learnable near the ground,
  // faster the taller you climb) — escalating challenge, not a flat speed.
  // Tailwind day slows the sweep (more dwell = easier perfects); other days = 1×.
  // Steady Cable upgrade slows the sweep too. `effectiveSweepPeriodMs` clamps the
  // combined result to a sane band: never faster than the comfortable floor, and
  // never SLOWER than the ground-floor default — so even a fully-upgraded crane
  // stays a normal pace instead of the old super-slow ~5.7 s crawl (founder ask
  // 2026-07-17).
  const sweepMs = effectiveSweepPeriodMs(
    game.floors.length,
    upgradeEffects.sweepSpeedMult,
    mutator ? mutatorSweepMult(mutator) : 1,
  );
  // How shaky the tower is (0..1) — drives the continuous SWING and, via the
  // crane's matching offset, makes placing on an unstable tower genuinely harder.
  // The SAME value feeds the crane target and the Pixi tower angle, so WYSIWYG
  // holds: the swaying tower IS the moving target, and tracking it still lands
  // perfect (only fighting it is punished — see towerSway.ts).
  //
  // This was hard-coded to 0 with the note "was causing visual flickering and
  // felt redundant". The flicker was not the sway model, it was the delivery:
  // the crane pushed a fresh sway value through `setState` on every animation
  // frame. The crane now writes those transforms imperatively, so the sway can
  // come back honestly — and the founder specifically wants imprecision to be
  // felt ("make the tower a bit more shakey when you are not too precise").
  //
  // Three signals compose:
  //   · swayInstability   — bad-drop streak OR current visible lean, worst wins
  //   · swayHeightDampen  — a tall tower's top travels far at a given angle
  //   · steadyHandsDampen — a run of perfect drops calms it back down (skill)
  // then the biome's own instabilityMult, which until now was documented as
  // "DATA ONLY... must be applied at the SHARED instability source" and never
  // actually applied anywhere.
  const instability = useMemo(() => {
    const raw = swayInstability(crane.consecutiveSloppy, crane.leanDeg);
    const damped = raw * swayHeightDampen(game.floors.length) * steadyHandsDampen(crane.perfectStreak);
    return Math.max(0, Math.min(1, damped * (BIOME_THEME[biomeId]?.instabilityMult ?? 1)));
  }, [crane.consecutiveSloppy, crane.leanDeg, crane.perfectStreak, game.floors.length, biomeId]);

  // The crane carries the block in the FINAL committed material colour of the
  // current build line, so it never "switches weird colours" on landing. Convert
  // the packed material int → CSS hex once per zone, with a legible glyph colour.
  // Tower SKIN — the equipped material palette (persisted, unlocked by climbing).
  const skin = useTowerSkin(personalBest);
  const blockColorInt = useMemo(() => blockMaterial(biomeId, skin.palette), [biomeId, skin.palette]);
  const blockColorHex = useMemo(() => `#${blockColorInt.toString(16).padStart(6, '0')}`, [blockColorInt]);
  const blockTextHex = useMemo(
    () => `#${textColorOn(blockColorInt).toString(16).padStart(6, '0')}`,
    [blockColorInt],
  );

  // ── Variable reward: NEW SKIN unlocked by climbing past a height milestone.
  //    Pops a celebratory beat AND auto-equips the freshly-earned look so the
  //    payoff is instant. prevBest guards against re-granting on every render.
  const [skinUnlock, setSkinUnlock] = useState<TowerSkin | null>(null);
  const prevBestForSkin = useRef(personalBest);
  const setSkinIdRef = useRef(skin.setSkinId);
  setSkinIdRef.current = skin.setSkinId;
  useEffect(() => {
    const fresh = newlyUnlockedSkin(prevBestForSkin.current, personalBest);
    prevBestForSkin.current = personalBest;
    if (!fresh) return;
    setSkinUnlock(fresh);
    setSkinIdRef.current(fresh.id); // wear the reward immediately
  }, [personalBest]);
  useAutoDismiss(skinUnlock, () => setSkinUnlock(null), TOAST_MS);

  // Unseen unlocks behind the collapsed action menu → the menu badge. Hydrated
  // in an effect (localStorage is not available during SSR/first render) and
  // re-read whenever the menu is opened, which is where they're marked seen.
  const [seenSkins, setSeenSkins] = useState<string[]>([]);
  useEffect(() => { setSeenSkins(readSeenSkins()); }, []);
  const unseenSkins = useMemo(() => unseenSkinIds(personalBest, seenSkins), [personalBest, seenSkins]);

  // Unmistakable verdict pop — one big, band-coloured beat on every drop telling
  // the player exactly how they did + the metres gained. Keyed off the placement
  // result; the height delta is read after commit settles into `game.heightM`.
  const lastOutcomeRef = useRef<PlacementOutcome | null>(null);
  const handleCraneDrop = useCallback(
    (o: PlacementOutcome) => {
      lastOutcomeRef.current = o;
      // Satisfying, varied landing thock — fires on release, before the accepted-
      // word fanfare, so the drop itself has a percussive payoff.
      dropSoundFns[dropFlavor(dropCountRef.current++, o.quality).soundKey]?.();
      crane.onDrop(o);
    },
    [crane.onDrop, dropSoundFns], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const [verdict, setVerdict] = useState<{ v: DropVerdict; key: number } | null>(null);
  const prevVerdictHeight = useRef(game.heightM);
  useEffect(() => {
    const o = lastOutcomeRef.current;
    if (!o || tower.state.resultKey === 0) return;
    const gain = game.heightM - prevVerdictHeight.current;
    prevVerdictHeight.current = game.heightM;
    setVerdict({ v: buildDropVerdict(o, gain), key: tower.state.resultKey });
    // Confetti is reserved for the standout beats now — a genuinely LONG word
    // (skyscraper tier) — instead of firing on every perfect drop. Ordinary drops
    // lean on the crane + landing physics + verdict pop for feedback, so the burst
    // stays a rare "wow", not per-drop noise (founder ask 2026-07-17). Streaks get
    // their own burst via the combo-milestone effect below.
    if (tower.state.lastResult?.tier === 'skyscraper' && !reducedMotion) {
      fireConfetti({ particleCount: 60, spread: 80, startVelocity: 34, origin: { y: 0.4 } });
    }
  }, [tower.state.resultKey]); // eslint-disable-line react-hooks/exhaustive-deps
  // Dismiss via the shared hook (keyed on the verdict's own resultKey) rather than
  // an inline timer, so the lifespan is owned in ONE place and can never be reset
  // by an unrelated re-render — the same robustness the other banners already use.
  useAutoDismiss(verdict?.key, () => setVerdict(null), VERDICT_MS);
  // Safety net: the instant the next word is LIFTED for placement, drop any
  // lingering verdict so it can NEVER bleed into the next build. This defends
  // against a main-thread-janked timer (the Pixi loop can starve setTimeout on a
  // busy mobile webview) holding the big centre PERFECT/+m pop on screen — the
  // founder's "the perfect and metres text stays on the screen" report.
  useEffect(() => {
    if (tower.state.pendingWord) setVerdict(null);
  }, [tower.state.pendingWord]);
  // Belt-and-suspenders against the "messages stay stuck" report: the instant the
  // player begins spelling the NEXT word (first tile selected), drop every
  // lingering post-drop celebration so none can bleed across builds even if a
  // timer was starved. (useAutoDismiss/useExitReveal now also self-heal via rAF.)
  useEffect(() => {
    if (tower.word.length === 1) {
      // Hard guarantee against the founder's "notifications stay stuck on the
      // screen and don't disappear" report: the instant the player begins the
      // NEXT word (first tile selected), drop EVERY transient post-drop banner —
      // the big centre verdict AND every peripheral toast — so none can ever
      // bleed across builds, even if a dismiss timer was starved on a busy frame.
      setVerdict(null);
      setComboFx(null);
      setSurpriseFx(null);
      setZoneText(null);
      setMilestoneText(null);
      setLandmarkText(null);
      setAchToast(null);
      setSkinUnlock(null);
      setHazardText(null);
      setClutchText(null);
      setNewBestText(null);
    }
  }, [tower.word.length]);

  // Combo-milestone fanfare — a one-shot "×5 ON FIRE!" beat the moment the combo
  // crosses 3/5/10/20. Keyed off resultKey so it fires on the placing tick only.
  const [comboFx, setComboFx] = useState<{ m: ComboMilestone; key: number } | null>(null);
  useEffect(() => {
    if (tower.state.resultKey === 0) return;
    const hit = comboMilestone(game.combo);
    if (!hit) return;
    setComboFx({ m: hit, key: tower.state.resultKey });
    haptics.success();
    playComboMilestoneSound(hit.combo);
    // ×5 and up get a physical burst that grows with the chain — the banner
    // alone undersold the rarest skill beat in the mode.
    if (hit.combo >= 5 && !reducedMotion) {
      fireConfetti({ particleCount: Math.min(30 + hit.combo * 6, 100), spread: 80, origin: { y: 0.4 } });
    }
  }, [tower.state.resultKey]); // eslint-disable-line react-hooks/exhaustive-deps
  useAutoDismiss(comboFx?.key, () => setComboFx(null), TOAST_MS);

  // Surprise pop — the variable-reward beat. A per-word deterministic roll
  // (towerSurprise.ts) occasionally grants bonus height / scrambles / an updraft
  // charge; we surface it as its own banner + a fitting sound so the can't-predict
  // payoff lands as a felt reward, not a silent number change.
  const [surpriseFx, setSurpriseFx] = useState<{ s: ActiveTowerSurprise; key: number } | null>(null);
  useEffect(() => {
    if (tower.state.resultKey === 0) return;
    const s = tower.state.lastResult?.surprise;
    if (!s) return;
    setSurpriseFx({ s, key: tower.state.resultKey });
    const surpriseMeta = TOWER_SURPRISE_META[s.event];
    if (surpriseMeta) surpriseSoundFns[surpriseMeta.sound]?.();
    haptics.levelComplete();
    // NB: surprises keep paying in bonus metres + scrambles (their existing
    // reward). They intentionally do NOT grant coins — surprises fire many
    // times per climb, and addCoins increments the games-played counter, so
    // coin grants stay on the BOUNDED milestones (new zone / achievement).
  }, [tower.state.resultKey]); // eslint-disable-line react-hooks/exhaustive-deps
  useAutoDismiss(surpriseFx?.key, () => setSurpriseFx(null), TOAST_MS);

  // ── Wrecking Ball — earned by PROGRESSION (new zone / achievement), spent on a
  // rival. The local beat (ghost-tower drop + wrecking-ball arc + toast) fires
  // immediately; the cross-player raid is PERSISTED so it lands on the rival's
  // NEXT climb (endless only — daily never writes shared state). This restores
  // the wrecking-ball, now with the real backend the old local-only version lacked.
  const { sab, displayRivals } = useSabotageIntegration(
    crane.perfectStreak,
    earnEvents,
    rivals,
    tower.hazard,
  );
  // Bumped every time the wrecking-ball mini-game finishes and its full-screen
  // overlay closes — WordTowerScene watches this to snap the camera back to
  // the build line and flash, so the player's own tower (a small tile stack
  // easy to lose track of after the big dramatic smash overlay) is the first
  // thing back in focus, not a blank scroll position.
  const [wreckDoneKey, setWreckDoneKey] = useState(0);
  const sendWreck = useCallback(
    (rivalId: string, rivalName: string, accuracy: number) => {
      const rival = rivals.find((r) => r.id === rivalId);
      // Skill (mini-game accuracy) + height lead combine via the SHARED formula,
      // so the optimistic local rail drop matches what the server will apply.
      const floors = asyncWreckDamageFloors(personalBest, rival?.heightM ?? 0, accuracy);
      sab.sabotage(rivalId, rivalName, floors); // local beat + spend a charge
      setWreckDoneKey((k) => k + 1);
      if (!daily && rival?.playerId) {
        // The server re-derives heights from the authoritative progress table and
        // re-clamps the damage; we only name the target + report the strike
        // accuracy (skill raises damage, but never past the shared cap).
        void fetch('/api/word-tower/wreck', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetPlayerId: rival.playerId, accuracy }),
        }).catch(() => { /* best-effort raid */ });
      }
    },
    [sab, rivals, daily, personalBest],
  );

  // Apply any pending async wrecks: fold them into the restored tower (SESSION
  // state only — never the protected best_*), surface a Wreck Report, and hand
  // the defender compensation scrambles so the beat feels fair, not punitive.
  // Runs once on session start AND again live (see the realtime subscription
  // below) — a rival that raids you WHILE you're mid-session shows the same
  // scene immediately instead of waiting for your next reload.
  const [wreckReport, setWreckReport] = useState<{ names: string[]; floors: number } | null>(null);
  const { user } = useAuth();
  // Refs (not deps) for tower.restore/haptics — checkWrecks is handed to a
  // long-lived realtime subscription below; if it depended on `tower`
  // directly (a fresh object every render) the channel would tear down and
  // resubscribe on every render instead of staying open for the session.
  const towerRestoreRef = useRef(tower.restore);
  towerRestoreRef.current = tower.restore;
  const hapticsRef = useRef(haptics);
  hapticsRef.current = haptics;
  const checkWrecks = useCallback(() => {
    void fetch('/api/word-tower/wreck')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { wrecks?: PendingWreck[] } | null) => {
        const wrecks = data?.wrecks ?? [];
        if (wrecks.length === 0) return;
        // Fold into the LIVE tower (via ref), not the stale mount snapshot — if
        // the fetch resolves after the player has already placed a word, we
        // knock floors off what's actually there instead of discarding progress.
        const res = applyAsyncWrecks(gameRef.current, wrecks);
        towerRestoreRef.current(res.state);
        setWreckReport({ names: res.attackerNames, floors: res.totalFloorsRemoved });
        hapticsRef.current.error();
      })
      .catch(() => { /* best-effort */ });
  }, []);
  const wreckCheckedRef = useRef(false);
  useEffect(() => {
    if (daily || wreckCheckedRef.current) return;
    wreckCheckedRef.current = true;
    checkWrecks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Live doorbell: a fresh row for this defender re-runs the SAME trusted GET
  // claim above — the realtime payload itself is never trusted as game state,
  // it only tells us to go re-fetch (server stays the sole damage authority).
  useEffect(() => {
    if (daily || !user?.id) return;
    return subscribeToWordTowerWrecks(user.id, checkWrecks);
  }, [daily, user?.id, checkWrecks]);
  useAutoDismiss(wreckReport, () => setWreckReport(null), WRECK_REPORT_MS);

  // Environmental hazards strike at fixed altitudes → topple floors; firedHazards guards re-fire.
  const prevHazardH = useRef(game.heightM);
  useEffect(() => {
    const prev = prevHazardH.current;
    prevHazardH.current = game.heightM;
    const crossed = hazardsCrossed(prev, game.heightM, game.firedHazards);
    if (crossed.length === 0) return;
    // featherfall (perk) + featherday (mutator) soften the blow — but the hazard
    // ids still fire so it never re-triggers, even if 0 floors are lost.
    const floors = reducedTopple(crossed.reduce((s, h) => s + h.floors, 0), craneMods);
    tower.hazard(floors, crossed[crossed.length - 1]!.kind, crossed.map((h) => h.id));
  }, [game.heightM]); // eslint-disable-line react-hooks/exhaustive-deps

  // Perk draft — offered each 100m of new altitude in daily mode (pick 1 of 3).
  const prevPerkH = useRef(game.heightM);
  useEffect(() => {
    if (!daily) return;
    const prev = prevPerkH.current;
    prevPerkH.current = game.heightM;
    const idx = perkMilestoneAt(prev, game.heightM);
    if (idx !== null) perks.offerDraft(idx);
  }, [game.heightM, daily]); // eslint-disable-line react-hooks/exhaustive-deps

  // "Your tower was ruined" banner + FX — never silent (founder ask).
  const [hazardText, setHazardText] = useState<string | null>(null);
  useEffect(() => {
    const hz = tower.state.lastHazard;
    if (!hz || tower.state.hazardKey === 0) return;
    setHazardText(t('wordTower.hazard.lost', { kind: t(`wordTower.hazard.${hz.kind}`), n: hz.removed }));
    haptics.bossHit();
    playErrorSound();
  }, [tower.state.hazardKey]); // eslint-disable-line react-hooks/exhaustive-deps
  useAutoDismiss(hazardText, () => setHazardText(null), TOAST_MS);

  // CLUTCH SAVE banner — a clean drop pulled the tower back from a critical lean.
  // The biggest single beat in the climb (a fumble instead routes through the
  // hazard "ruined" banner above, so we only celebrate the save here).
  const [clutchText, setClutchText] = useState<string | null>(null);
  useEffect(() => {
    if (!crane.clutch || crane.clutch.outcome !== 'save') return;
    setClutchText(t('wordTower.clutch.save'));
  }, [crane.clutch?.key]); // eslint-disable-line react-hooks/exhaustive-deps
  useAutoDismiss(clutchText, () => setClutchText(null), TOAST_MS);

  // Hide the global bottom nav for the duration of gameplay (full-screen mode).
  const setIsInGame = useHideNavigation();
  useEffect(() => {
    setIsInGame(true);
    return () => setIsInGame(false);
  }, [setIsInGame]);

  // Control-deck height (measured by the HUD) → the tower grounds just above it.
  const [deckHeight, setDeckHeight] = useState(220);
  // Play surface height — drives shared chrome framing (notice band + crane top).
  const playRootRef = useRef<HTMLDivElement>(null);
  const [playH, setPlayH] = useState(
    typeof window !== 'undefined' ? window.innerHeight : 800,
  );
  useEffect(() => {
    const el = playRootRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setPlayH(entry.contentRect.height);
    });
    ro.observe(el);
    setPlayH(el.clientHeight || window.innerHeight);
    return () => ro.disconnect();
  }, []);
  // Top chrome is MEASURED, not assumed. It used to be the hardcoded
  // DEFAULT_TOP_CHROME_PX (112), which the notice column uses as its top edge —
  // so when the header grew a third row (the play tools moved up out of the
  // deck) every drop verdict landed on top of the clue button. A ref + observer
  // keeps the two in sync whatever the header ends up holding.
  const topChromeRef = useRef<HTMLDivElement>(null);
  const [topChromePx, setTopChromePx] = useState(DEFAULT_TOP_CHROME_PX);
  useEffect(() => {
    const el = topChromeRef.current;
    if (!el) return;
    const report = () => setTopChromePx(el.offsetHeight || DEFAULT_TOP_CHROME_PX);
    report();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(report);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const chromeFrame = useMemo(
    () => playChromeFrame({
      viewportH: playH,
      topChromePx,
      deckHeightPx: deckHeight,
    }),
    [playH, deckHeight, topChromePx],
  );
  const onDeckHeight = useCallback((px: number) => setDeckHeight(px), []);

  // ── persistence: build payload + save (fetch or beacon) ──
  // (gameRef is declared once near the top — used here + by the async wreck apply.)
  // Dedupe by floor count: skip a save if nothing was built since the last one
  // (heightM always changes per word, so it can't dedupe; floor count can).
  const lastSavedFloors = useRef(-1);

  const buildPayload = useCallback((g: WordTowerPlayerState) => ({
    heightM: g.heightM,
    floors: g.floors.length,
    longestCombo: g.longestCombo,
    longestWord: g.longestWord || undefined,
    highestBiome: biomeForHeight(g.heightM),
    state: serializeWordTowerState(g),
  }), []);

  const save = useCallback((beacon = false, opts: { force?: boolean } = {}) => {
    const g = gameRef.current;
    // Always flush the session locally — it's cheap and protects guests, daily
    // runs, and authenticated players when the network drops or the API rejects.
    saveSessionToLocalStorage(g, daily);

    // Daily runs are perk-eligible and bounded. Save to DB too (daily mode now
    // persists across sessions), but only the local session is the fallback.
    if (daily) {
      saveSessionToLocalStorage(g, daily);
      // Don't skip the DB save below — daily runs also persist to Supabase.
    }

    // Server upserts are deduped by floor count to avoid redundant writes; forced
    // saves (interval, unload, biome crossing) bypass the dedupe.
    if (!opts.force && g.floors.length === lastSavedFloors.current) return;
    lastSavedFloors.current = g.floors.length;

    const body = JSON.stringify(buildPayload(g));
    if (beacon && typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon('/api/word-tower/progress', new Blob([body], { type: 'application/json' }));
      return;
    }
    void fetch('/api/word-tower/progress', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
      keepalive: true,
    })
      .then((r) => {
        // 401 (unauthenticated) or any server error → local session is the fallback.
        if (!r.ok) saveSessionToLocalStorage(g, daily);
      })
      .catch(() => {
        // Network failure → local session already holds the latest state.
        saveSessionToLocalStorage(g, daily);
      });
  }, [buildPayload, daily]);
  const sessionRestoredRef = useRef(false);
  // Hoisted out of the dep array: the exhaustive-deps rule cannot verify a
  // member expression (`tower.restore`) and demanded the whole `tower` object,
  // which would re-run this restore effect on every state change.
  const restoreTower = tower.restore;
  useEffect(() => {
    if (sessionRestoredRef.current) return;
    if (typeof window === 'undefined') return;
    if (!dictionary) return; // wait for the dictionary so the restored tray is solvable
    const saved = loadSessionFromLocalStorage(daily);
    if (!saved) return;
    sessionRestoredRef.current = true;
    const restored = restoreWordTowerState(
      {
        gameCode: daily ? dailyTowerGameCode() : 'solo',
        playerId: daily ? DAILY_PLAYER_ID : 'solo',
        language,
        dict: dictionary,
      },
      saved.state,
    );
    // Only restore if there's actual progress and it is at least as far as the
    // server-provided initial game (prevents a stale local blob from rolling back
    // an authenticated player whose server progress is ahead).
    if (restored.floors.length === 0 && restored.heightM === 0) return;
    if (restored.floors.length < initialGame.floors.length || restored.heightM < initialGame.heightM) return;
    restoreTower(restored);
  }, [daily, dictionary, initialGame, language, restoreTower]);

  // Save cadence: every 5 floors + on biome crossing (rare, high-signal).
  const floorsCount = game.floors.length;
  useEffect(() => {
    if (floorsCount > 0 && floorsCount % 5 === 0) save();
  }, [floorsCount, save]);

  // Daily mode: persist after EVERY floor so a reload never loses the latest
  // progress (the tower is meant to stay persistent throughout the day).
  useEffect(() => {
    if (daily && floorsCount > 0) save(false, { force: true });
  }, [floorsCount, save, daily]);

  // Periodically flush to localStorage (and server for endless) so even a crash
  // or killed app loses at most 2 minutes of progress.
  useEffect(() => {
    const id = setInterval(() => save(false, { force: true }), 120_000);
    return () => clearInterval(id);
  }, [save]);

  // Flush on page close / reload so the latest state is always persisted.
  useEffect(() => {
    const onBeforeUnload = () => save(true, { force: true });
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [save]);

  // Daily engagement → grow the streak. Fires once the first floor lands (a real
  // attempt, not a mount), and is idempotent downstream so repeats are harmless.
  useEffect(() => {
    if (daily && floorsCount >= 1) onDailyEngaged?.();
  }, [daily, floorsCount, onDailyEngaged]);

  // Daily best → the self-comparison routine beat. Fires once the moment the
  // climb first passes the best this run started with; the wrapper persists it.
  const [newBestShown, setNewBestShown] = useState(false);
  const [newBestText, setNewBestText] = useState<string | null>(null);
  useEffect(() => {
    if (!daily || newBestShown || !beatsDailyBest(personalBestM, game.heightM)) return;
    setNewBestShown(true);
    setNewBestText(t('wordTower.daily.newBest'));
    onNewDailyBest?.(game.heightM);
    // A personal record is THE self-comparison payoff — celebrate it bigger
    // than any single drop (wide gold-heavy burst + the level-complete buzz).
    haptics.levelComplete();
    if (!reducedMotion) {
      fireConfetti({ particleCount: 120, spread: 120, startVelocity: 45, origin: { y: 0.4 } });
    }
  }, [daily, newBestShown, personalBestM, game.heightM, onNewDailyBest]); // eslint-disable-line react-hooks/exhaustive-deps
  useAutoDismiss(newBestText, () => setNewBestText(null), TOAST_MS);
  useEffect(() => { if (game.heightM > 0) save(false, { force: true }); }, [biomeId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Cool EXIT for every compliment/message: after its ~2s hold the source
  //    nulls, and useExitReveal keeps the LAST value on screen with `exiting`
  //    true for the wt-toast-out clip-wipe before unmounting (instant under
  //    reduced motion). Each render below reads `<x>R.value` + `<x>R.exiting`. ──
  const EXIT_MS = reducedMotion ? 0 : 420;
  // The centre verdict is the most screen-dominant beat, so it gets a SNAPPIER
  // exit than the peripheral toasts — its full presence is VERDICT_MS + this tail,
  // and a long tail is exactly what made the big PERFECT/+m pop feel like it
  // "stays on the screen" between back-to-back drops.
  const VERDICT_EXIT_MS = reducedMotion ? 0 : 160;
  const zoneR = useExitReveal(zoneText, EXIT_MS);
  const milestoneR = useExitReveal(milestoneText, EXIT_MS);
  const landmarkR = useExitReveal(landmarkText, EXIT_MS);
  const skinUnlockR = useExitReveal(skinUnlock, EXIT_MS);
  const verdictR = useExitReveal(verdict, VERDICT_EXIT_MS);
  const hazardR = useExitReveal(hazardText, EXIT_MS);
  const clutchR = useExitReveal(clutchText, EXIT_MS);
  const newBestR = useExitReveal(newBestText, EXIT_MS);
  const comboR = useExitReveal(comboFx, EXIT_MS);
  const surpriseR = useExitReveal(surpriseFx, EXIT_MS);
  const achR = useExitReveal(achToast, EXIT_MS);
  /** Entrance anim while live, the clip-wipe exit while leaving (none under RM). */

  // Always flush when the tab is hidden / page unloads.
  useEffect(() => {
    const onHide = () => { if (document.visibilityState === 'hidden') save(true, { force: true }); };
    const onPageHide = () => save(true, { force: true });
    window.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      save(true, { force: true });
      window.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [save]);

  // ── feel ──
  useEffect(() => {
    if (tower.state.resultKey === 0 || !tower.state.lastResult) return;
    if (tower.state.lastResult.tier === 'skyscraper') { haptics.levelComplete(); playChestOpenSound(); }
    else { haptics.success(); playCoinCollectSound(); }
  }, [tower.state.resultKey]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (tower.state.errorKey === 0) return;
    haptics.error();
    playErrorSound();
  }, [tower.state.errorKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const [nearMissKey, setNearMissKey] = useState(0);
  useEffect(() => {
    if (tower.state.resultKey === 0) return;
    if (isNearMiss(crane.leanDeg)) setNearMissKey((k) => k + 1);
  }, [tower.state.resultKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Per-letter escalation: each added letter ticks at a rising pitch, so a
  // growing word audibly climbs (rate is Howler playback speed = pitch).
  const selectTileHaptic = useCallback((i: number) => {
    haptics.selection();
    playSound('tileSelect', { rate: letterTickRate(tower.state.selected.length) });
    tower.selectTile(i);
  }, [haptics, tower, playSound]);
  // Unselecting rewinds the pitch ladder — a lower tick reads as "letter removed".
  const deselectTileTick = useCallback((i: number) => {
    playSound('tileSelect', { rate: 0.9 });
    tower.deselectTile(i);
  }, [tower, playSound]);

  // Scramble = a fresh wheel. Founder 2026-06-26: it's no longer free-on-tap —
  // spend a banked BONUS scramble first (earned from surprises / wreck-comp), and
  // once those run out, BUY a spin with coins. The 0-words-possible reroll stays
  // free (onReroll, the soft-lock escape). The button is disabled when broke, so
  // a fired tap here always has a banked scramble or affordable coins.
  const handleScramble = useCallback(() => {
    if (gameRef.current.scramblesLeft > 0) { haptics.selection(); tower.scramble(); return; }
    if (spendCoins(WORD_TOWER_SCRAMBLE_COIN_COST, 'wordtower_scramble')) {
      setCoinBalance(getCoins());
      haptics.success();
      tower.scramblePaid();
    }
  }, [haptics, tower]);

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'Enter') { e.preventDefault(); tower.hold(); return; }
      if (e.key === 'Backspace') { e.preventDefault(); tower.backspace(); return; }
      if (e.key === 'Escape') { tower.clear(); return; }
      if (e.key.length !== 1) return;
      const k = e.key.toUpperCase();
      const idx = game.tray.findIndex((l, i) => l.toUpperCase() === k && !tower.state.selected.includes(i));
      if (idx >= 0) selectTileHaptic(idx);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [game.tray, tower, selectTileHaptic]);

  return (
    <div ref={playRootRef} className="relative min-h-[100dvh] w-full overflow-hidden bg-neo-navy" dir={dir}>
      <WordTowerScene
        floors={game.floors}
        biomeId={biomeId}
        heightM={game.heightM}
        pendingWord=""
        resultKey={tower.state.resultKey}
        errorKey={tower.state.errorKey}
        lastResult={tower.state.lastResult}
        dropQuality={lastOutcomeRef.current?.quality}
        reducedMotion={reducedMotion}
        bottomInsetPx={deckHeight}
        palette={skin.palette}
        personalBestM={personalBest}
        rivals={displayRivals}
        leanDeg={crane.leanDeg}
        instability={instability}
        clutchSaveKey={crane.clutch?.outcome === 'save' ? crane.clutch.key : 0}
        toppleKey={tower.state.hazardKey}
        nearMissKey={nearMissKey}
        toppleFloors={tower.state.lastHazard?.removed ?? 1}
        wreckDoneKey={wreckDoneKey}
        t={t}
        locale={language}
        onViewAltChange={setViewAlt}
      />

      {/* World altitude landmarks you climb past (cloud base, jet stream, edge
          of space…) — gives the height a real sense of place. Driven by the
          *viewed* altitude so panning down reveals the marks at that height. */}
      <WordTowerLandmarkRail viewerHeightM={viewAlt} reducedMotion={reducedMotion} t={t} />

      {/* Rival rail + chase chip — the read-only leaderboard-ghost meta belongs to
          the (retired) endless mode. The tower is daily-only now, so these never
          render (displayRivals is empty in daily anyway); gating them out also
          clears the top-right rival chip that overlapped the header. */}
      {!daily && (
        <>
          <WordTowerRivalRail rivals={displayRivals} viewerHeightM={viewAlt} reducedMotion={reducedMotion} t={t} />
          <WordTowerNextRivalChip rivals={displayRivals} viewerHeightM={game.heightM} reducedMotion={reducedMotion} t={t} dir={dir} />
        </>
      )}

      {/* ── Left utility rail ── persistent state chips (steady-hands streak,
          owned perks) stack in ONE flex column on the start side, below the top
          chrome. One layout owner means
          they can never overlap each other — or the centred banners — at
          hand-tuned absolute offsets again (the 390px pile-up, 2026-07-02). */}
      {/* Parked just ABOVE the build line, on the start side. At `top-36` the
          rail sat inside the crane's chrome and drew over the mast; hung off the
          deck instead, it drew over the tower's own base floor. The band just
          above the build line is the one strip that stays clear at every tower
          height — the crown pins at the build line, so everything below it is
          tower and everything above is sky (2026-08-07). */}
      <div
        className="pointer-events-none absolute start-2 top-[38%] z-20 flex max-w-[45%] flex-col items-start gap-1"
        dir={dir}
      >
        {/* (The decorative "biome spine" bar that used to run down this rail is
            gone. It carried no information the tower, sky and block colours were
            not already showing, and it drew a permanent stripe down the side of
            the play surface for it.) */}
        {/* Wrecking Ball bay — rival-raid meta, endless-only. Hidden in the
            daily-only tower (no rivals to raid); keeps the left rail to the
            steady-hands / mutator / perk chips that matter to a daily climb. */}
        {!daily && (
          <WordTowerSabotageBay
            inline
            tokens={sab.tokens}
            rivals={displayRivals}
            pickerOpen={sab.pickerOpen}
            onOpen={sab.openPicker}
            onClose={sab.closePicker}
            onSend={sendWreck}
            attackerHeightM={personalBest}
            lastHit={sab.lastHit}
            onDismissHit={sab.dismissHit}
            earnedToast={sab.earnedToast}
            onDismissEarned={sab.dismissEarned}
            adEarnedToast={sab.adEarnedToast}
            onDismissAdEarned={sab.dismissAdEarned}
            t={t}
            reducedMotion={reducedMotion}
          />
        )}

        {/* Steady-hands FLOW chip — the positive crane-skill beat: a run of
            perfect drops calms the tower (see instability) and escalates this
            badge. Cyan → lime → gold "ON FIRE" so the streak reads at a glance. */}
        {crane.perfectStreak >= 2 && (
          <div
            className={`flex items-center gap-1 rounded-neo border-neo-thick border-black px-2 py-1 shadow-hard ${reducedMotion ? '' : 'animate-neo-pop'} ${
              crane.perfectStreak >= 5
                ? 'bg-gradient-to-b from-neo-yellow to-neo-orange text-black'
                : crane.perfectStreak >= 4
                  ? 'bg-neo-lime text-black'
                  : 'bg-neo-cyan text-black'
            }`}
            role="status"
            aria-live="polite"
            aria-label={t('wordTower.crane.steadyAria', { n: crane.perfectStreak })}
          >
            {crane.perfectStreak >= 5
              ? <Flame className={`h-4 w-4 ${reducedMotion ? '' : 'animate-bounce'}`} aria-hidden />
              : <Sparkles className="h-4 w-4" aria-hidden />}
            <span className="font-neo-display text-sm font-black uppercase tracking-wide tabular-nums">
              {crane.perfectStreak >= 5 ? t('wordTower.crane.onFire') : t('wordTower.crane.steady')} ×{crane.perfectStreak}
            </span>
          </div>
        )}

        {/* (The day's twist is announced once on entry by WordTowerMutatorBanner —
            no persistent chip here: it read as an opaque label and cluttered the
            rail. Its gameplay effect is unchanged.) */}

        {/* Owned perks — small badge column (daily run) so the player sees their build. */}
        {daily && perks.owned.map((id) => {
          const perk = PERKS[id];
          if (!perk) return null;
          return (
            <span
              key={id}
              className="flex items-center gap-1 rounded-neo border-neo border-black bg-neo-purple px-1.5 py-0.5 font-neo-body text-[10px] font-black text-neo-white shadow-hard-sm"
              title={t(perk.descKey)}
            >
              <span aria-hidden>{perk.icon}</span>
              {t(perk.nameKey)}
            </span>
          );
        })}
      </div>

      {/* (Coin-reward reveal now renders inside the notice column, directly
          under the zone banner it usually accompanies.) */}

      {/* (Steady-hands FLOW chip + skin picker now live in the left utility rail
          and the top-bar actions row respectively.) */}

      {/* (All transient banners — zone, milestone, landmark, skin unlock, tease,
          combo, surprise, new-best, clutch, hazard, achievement, wreck report —
          now render in the single notice column below the verdict block.) */}

      {/* Crane Stack — the word builds ON the crane: each selected letter stacks
          onto the swinging beam (not the tower crown, #9), and the swing widens
          per letter. Once BUILT (held), the HUD's DROP button drops it — the
          crane's own button is hidden so the player never chases the beam. The
          drop is a no-op until a word is actually held, so previewing is safe. */}
      {(tower.state.pendingWord || tower.word) && (
        <WordTowerCrane
          ref={craneRef}
          word={tower.state.pendingWord || tower.word}
          consecutiveSloppy={crane.consecutiveSloppy}
          onDrop={handleCraneDrop}
          onSignedDrop={crane.pushSignedOffset}
          onLiveBandChange={setAimBand}
          t={t}
          reducedMotion={reducedMotion}
          periodMs={sweepMs}
          instability={instability}
          // Upgrade widening + the PLATFORM the last word left behind: a long
          // word is a wide floor, and a wide floor is genuinely easier to land
          // on. This is what ties the word game to the stacking game.
          perfectBandBonus={upgradeEffects.perfectBandBonus + supportBandBonus(game.floors[game.floors.length - 1]?.len ?? 0)}
          blockColorHex={blockColorHex}
          blockTextHex={blockTextHex}
          craneTopPx={chromeFrame.craneTopPx}
          hideOwnButton
        />
      )}

      {/* ── Notice column ── every transient banner (verdict, alarms,
          celebrations, rewards, scenic beats) stacks here in priority order.
          Framed into the sky band above the construction zone so banners never
          permanently occlude the active floors / drop path. */}
      <WordTowerNoticeColumn
        verdict={verdictR}
        lastResultTier={tower.state.lastResult?.tier ?? null}
        hazard={hazardR}
        clutch={clutchR}
        critical={crane.critical && !!tower.state.pendingWord && !clutchText}
        newBest={newBestR}
        zone={zoneR}
        tease={zoneText ? null : tease}
        reward={rewardFx}
        sabEarned={daily ? null : sab.earnedToast}
        sabAdEarned={!daily && !!sab.adEarnedToast}
        skinUnlock={skinUnlockR}
        surprise={surpriseR}
        combo={comboR}
        milestone={milestoneR}
        landmark={landmarkR}
        ach={achR}
        wreckReport={wreckReport}
        reducedMotion={reducedMotion}
        t={t}
        noticeTopPx={chromeFrame.noticeTopPx}
        noticeMaxHeightPx={chromeFrame.noticeMaxHeightPx}
      />

      {/* Daily mutator intro — the day's shared twist, popped once on entry. */}
      {mutator && <WordTowerMutatorBanner mutator={mutator} t={t} reducedMotion={reducedMotion} />}

      {/* (Mutator chip + owned-perk badges now live in the left utility rail.) */}

      {/* Roguelike perk draft — pick 1 of 3 at each daily milestone. */}
      <WordTowerPerkDraft choices={perks.draft} onChoose={perks.choose} onSkip={perks.skip} t={t} dir={dir} />

      {/* Persistent upgrade shop — opened from the top-bar actions row (see the
          Sparkles button beside Share); spends coins on permanent tower boosts.
          (Moved out of the top-left corner where it sat ON TOP of the Back
          button — founder 2026-06-25: "the hud on the top has some buttons
          overlap each other".) */}
      {showUpgrades && (
        <WordTowerUpgradePanel onClose={() => setShowUpgrades(false)} t={t} language={language} dir={dir} />
      )}

      {/* Top chrome — one tight two-row header (no more floating pills between).
          Row 1 shares the fixed mute-FAB band: [back] · [coins · menu], reserving
          the FAB's width via me-12. Row 2 centres the compact altitude readout
          directly beneath, so the header reads as a single aligned block. */}
      <div ref={topChromeRef} className="pointer-events-none absolute inset-x-0 top-0 z-10 px-3 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between gap-2">
          <Link
            href={`/${language}`}
            onClick={() => save(true, { force: true })}
            aria-label={t('common.backToHome')}
            className="pointer-events-auto flex h-10 shrink-0 items-center gap-1 rounded-neo border-neo-thick border-black bg-neo-navy/95 px-3 font-neo-body text-sm font-bold text-neo-white shadow-hard"
          >
            <DirectionalIcon icon={ArrowLeft} className="h-4 w-4" />
            <span className="hidden min-[380px]:inline">{t('common.backToHome')}</span>
          </Link>
          {/* Top-right cluster: the wallet stays ALWAYS visible (rewards count up
              where the player looks), and every secondary action folds behind ONE
              expanding menu button so the header stops overlapping itself
              (founder 2026-07-17). */}
          <div className="pointer-events-auto me-12 flex items-center gap-1.5">
            <LazyMotion features={domAnimation}>
              <CoinCounterAnimated value={coinBalance} size="sm" animateOnMount={false} />
            </LazyMotion>
            <WordTowerActionMenu
              t={t}
              reducedMotion={reducedMotion}
              noticeCount={unseenSkins.length}
              onOpened={() => { markSkinsSeen(unseenSkins); setSeenSkins(readSeenSkins()); }}
            >
              <button
                type="button"
                onClick={() => setShowUpgrades(true)}
                aria-label={t('wordTower.upgrade.title')}
                className="rounded-neo border-neo-thick border-black bg-neo-cyan p-2 text-black shadow-hard active:translate-y-0.5 active:shadow-hard-pressed"
              >
                <Sparkles className="h-4 w-4" />
              </button>
              {/* Tower-skin picker (founder ask: keep skin selection reachable). */}
              <WordTowerSkinPicker inline skin={skin} bestHeightM={personalBest} t={t} dir={dir} reducedMotion={reducedMotion} />
              <button
                type="button"
                onClick={onOpenLeaderboard}
                aria-label={t('wordTower.leaderboard.title')}
                className="rounded-neo border-neo-thick border-black bg-neo-yellow p-2 text-black shadow-hard active:translate-y-0.5 active:shadow-hard-pressed"
              >
                <Trophy className="h-4 w-4" />
              </button>
            </WordTowerActionMenu>
          </div>
        </div>
        {/* Compact altitude + combo readout — centred directly under row 1 (tight
            gap: no pill sits between them anymore). */}
        <div className="mx-auto mt-2 flex w-fit items-center gap-1.5">
          <WordTowerStatHud
            heightM={game.heightM}
            combo={game.combo}
            t={t}
          />
        </div>
        {/* Play tools (clue · reroll · scramble) — hoisted out of the bottom deck
            so every button in the game lives in this one top band and the wheel
            below is the only thing competing with the tower (founder 2026-08-14). */}
        <div className="mx-auto mt-1.5 flex w-fit">
          <WordTowerToolbar
            possibleWords={possibleWords}
            getClue={getClue}
            wheelKey={game.tray.join('')}
            scramblesLeft={game.scramblesLeft}
            scrambleCost={WORD_TOWER_SCRAMBLE_COIN_COST}
            coinBalance={coinBalance}
            onScramble={handleScramble}
            onReroll={reroll}
            disabled={!!tower.state.pendingWord}
            t={t}
            dir={dir}
          />
        </div>
      </div>

      {/* pointer-events-none so this full-screen layer doesn't shield the header
          buttons or the pan catcher — the deck inside re-enables events on itself. */}
      <div className="pointer-events-none absolute inset-0 z-10">
        <WordTowerHud
          anchorLetter={game.anchorLetter}
          tray={game.tray}
          selected={tower.state.selected}
          word={tower.word}
          heightM={game.heightM}
          combo={game.combo}
          goldenLetter={mutator?.id === 'goldenLetter' ? mutator.goldenLetter : undefined}
          lastError={tower.state.lastError}
          errorKey={tower.state.errorKey}
          lastResult={tower.state.lastResult}
          resultKey={tower.state.resultKey}
          onSelectTile={selectTileHaptic}
          onDeselectTile={deselectTileTick}
          onBackspace={tower.backspace}
          onClear={tower.clear}
          onSubmit={tower.hold}
          onDeckHeight={onDeckHeight}
          gainPreview={
            tower.word.length >= WORD_TOWER_MIN_WORD_LEN
              ? formatHeightGain(floorMeters(tower.word.length, game.combo))
              : undefined
          }
          pendingWord={tower.state.pendingWord}
          aimBand={aimBand}
          onCraneDrop={triggerCraneDrop}
          onCancelPlacement={tower.cancelPlacement}
          accentHex={blockColorHex}
          reducedMotion={reducedMotion}
          runPerks={runStreak.perks}
          t={t}
          dir={dir}
        />
      </div>

      {/* Coins-collected fly — streams from the reward beat into the wallet
          counter (which pulses + rolls the new total). Self-removing. */}
      {coinFly && (
        <DomCoinBurst
          key={coinFly.key}
          source={coinFly.source}
          target={coinFly.target}
          count={coinFly.count}
          onDone={() => setCoinFly(null)}
        />
      )}
    </div>
  );
}
