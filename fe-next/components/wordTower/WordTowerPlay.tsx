'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Trophy, Share2, Flame, Sparkles } from 'lucide-react';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { useLanguage } from '@/contexts/LanguageContext';
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
import { sweepPeriodMs, SWEEP_PERIOD_FLOOR_MS } from '@/lib/wordTower/craneSweep';
import { isNearMiss } from '@/lib/wordTower/towerLean';
import {
  mutatorForDate,
  mutatorModifiers,
  mutatorSweepMult,
  mutatorWordMultiplier,
  type DailyMutator,
} from '@/lib/wordTower/dailyMutators';
import { comboMilestone, type ComboMilestone } from '@/lib/wordTower/comboMilestone';
import { utcDateKey } from '@/lib/wordTower/dailySeed';
import { WordTowerMutatorBanner } from './WordTowerMutatorBanner';
import { WordTowerNoticeColumn } from './WordTowerNoticeColumn';
import { fireConfetti } from '@/utils/confettiUtils';
import { LazyMotion, domAnimation } from 'framer-motion';
import { CoinCounterAnimated } from '@/components/animations/CoinCounterAnimated';
import { swayInstability, swayHeightDampen, steadyHandsDampen } from '@/lib/wordTower/towerSway';
import { blockMaterial } from '@/lib/wordTower/blockGrade';
import { newlyUnlockedSkin, type TowerSkin } from '@/lib/wordTower/skins';
import { useTowerSkin } from './useTowerSkin';
import { WordTowerSkinPicker } from './WordTowerSkinPicker';
import { WordTowerFlowFrame } from './WordTowerFlowFrame';
import { textColorOn } from '@/lib/wordTower/towerColumn';
import { dropFlavor } from '@/lib/wordTower/dropFlavor';
import { buildDropVerdict, formatHeightGain, type DropVerdict } from '@/lib/wordTower/dropVerdict';
import type { PlacementOutcome } from '@/lib/wordTower/cranePlacement';
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
import { getTowerArchitectTier } from '@/lib/wordTower/architectTier';
import { WordTowerNextRivalChip } from './WordTowerNextRivalChip';
import { addCoins, getCoins, spendCoins } from '@/utils/coinManager';
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

  // Live coin balance mirror — coinManager is a plain (server-synced) store with
  // no reactive hook, so we mirror it locally (same pattern as the upgrade panel)
  // and refresh after any grant/spend. Powers the scramble button's buy state.
  const [coinBalance, setCoinBalance] = useState(() => getCoins());
  const biomeId = useMemo(() => biomeForHeight(game.heightM), [game.heightM]);
  const architectTier = useMemo(() => getTowerArchitectTier(game.floors), [game.floors]);
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
  const clueWord = useMemo(
    () => (dictionary ? pickClueWord(dictionary, game.tray, WORD_TOWER_MIN_WORD_LEN, game.usedWords) : null),
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

  // Sweep period RAMPS with tower height (slow + learnable near the ground,
  // faster the taller you climb) — escalating challenge, not a flat speed.
  // Tailwind day slows the sweep (more dwell = easier perfects); other days = 1×.
  // Clamped to the floor so a future "gale" mutator can't drive it impossibly fast.
  // Steady Cable upgrade slows the sweep (÷ sweepSpeedMult<1 lengthens the
  // period → more dwell, easier timing) on top of the height/mutator pacing.
  const sweepMs = Math.max(
    SWEEP_PERIOD_FLOOR_MS,
    (sweepPeriodMs(game.floors.length) * (mutator ? mutatorSweepMult(mutator) : 1)) / upgradeEffects.sweepSpeedMult,
  );
  // How shaky the tower is (0..1) — drives the continuous SWING and, via the
  // crane's matching offset, makes placing on an unstable tower genuinely harder.
  // Damped by height: a tall tower's top travels far at a given angle, so without
  // this a 30-floor tower whips side-to-side ("goes crazy"). The SAME damped value
  // is fed to BOTH the crane target and the Pixi tower angle, so WYSIWYG holds.
  const instability =
    swayInstability(crane.consecutiveSloppy, crane.leanDeg) *
    swayHeightDampen(game.floors.length) *
    steadyHandsDampen(crane.perfectStreak); // a perfect run steadies the crane (skill → calm)

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
    // PERFECT landings pay a small sharp burst at the tower line — kept to the
    // flawless band only so it stays a skill signal, not per-drop noise.
    if (o.quality === 'perfect' && !reducedMotion) {
      fireConfetti({ particleCount: 24, spread: 60, startVelocity: 28, scalar: 0.8, origin: { y: 0.42 } });
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
  const sendWreck = useCallback(
    (rivalId: string, rivalName: string) => {
      sab.sabotage(rivalId, rivalName); // local beat + spend a charge
      const rival = rivals.find((r) => r.id === rivalId);
      if (!daily && rival?.playerId) {
        // Heights are derived server-side from the authoritative progress table —
        // we only name the target; the server computes + clamps the damage.
        void fetch('/api/word-tower/wreck', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetPlayerId: rival.playerId }),
        }).catch(() => { /* best-effort raid */ });
      }
    },
    [sab, rivals, daily],
  );

  // Apply any pending async wrecks ONCE on session start (endless only): fold
  // them into the restored tower (SESSION state only — never the protected
  // best_*), surface a Wreck Report, and hand the defender compensation
  // scrambles so the beat feels fair, not punitive.
  const [wreckReport, setWreckReport] = useState<{ names: string[]; floors: number } | null>(null);
  const wreckCheckedRef = useRef(false);
  useEffect(() => {
    if (daily || wreckCheckedRef.current) return;
    wreckCheckedRef.current = true;
    void fetch('/api/word-tower/wreck')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { wrecks?: PendingWreck[] } | null) => {
        const wrecks = data?.wrecks ?? [];
        if (wrecks.length === 0) return;
        // Fold into the LIVE tower (via ref), not the stale mount snapshot — if
        // the fetch resolves after the player has already placed a word, we
        // knock floors off what's actually there instead of discarding progress.
        const res = applyAsyncWrecks(gameRef.current, wrecks);
        tower.restore(res.state);
        setWreckReport({ names: res.attackerNames, floors: res.totalFloorsRemoved });
        haptics.error();
      })
      .catch(() => { /* best-effort */ });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
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

  const save = useCallback((beacon = false) => {
    // Daily runs are perk-eligible and bounded — they must NEVER touch the shared
    // endless best-height board, or a boosted climb would inflate it. Hard gate.
    if (daily) return;
    const g = gameRef.current;
    if (g.floors.length === lastSavedFloors.current) return;
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
    }).catch(() => { /* best-effort */ });
  }, [buildPayload, daily]);

  // Save cadence: every 10 floors + on biome crossing (rare, high-signal).
  const floorsCount = game.floors.length;
  useEffect(() => {
    if (floorsCount > 0 && floorsCount % 10 === 0) save();
  }, [floorsCount, save]);

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
  useEffect(() => { if (game.heightM > 0) save(); }, [biomeId]); // eslint-disable-line react-hooks/exhaustive-deps

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
    const onHide = () => { if (document.visibilityState === 'hidden') save(true); };
    const onPageHide = () => save(true);
    window.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      save(true);
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

  const shareTower = useCallback(async () => {
    const g = gameRef.current;
    const params = new URLSearchParams({
      h: String(Math.round(g.heightM)),
      f: String(g.floors.length),
      b: biomeForHeight(g.heightM),
      w: g.longestWord || '',
    });
    // Surface the day's shared twist on the card — the brag hook that ties the
    // daily ("I climbed 240m on Golden-Letter day").
    if (mutator) params.set('m', mutator.id);
    const imgUrl = `${window.location.origin}/api/word-tower/share?${params.toString()}`;
    const text = t('wordTower.share.text', { m: Math.round(g.heightM) });
    try {
      if (navigator.share) await navigator.share({ title: t('wordTower.share.title'), text, url: imgUrl });
      else await navigator.clipboard?.writeText(`${text} ${imgUrl}`);
    } catch { /* user cancelled / unsupported */ }
  }, [t, mutator]);

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
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-neo-navy" dir={dir}>
      <WordTowerScene
        floors={game.floors}
        biomeId={biomeId}
        heightM={game.heightM}
        pendingWord={tower.word}
        anchorLen={game.anchorLetter.length}
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
        t={t}
        onViewAltChange={setViewAlt}
      />

      {/* World altitude landmarks you climb past (cloud base, jet stream, edge
          of space…) — gives the height a real sense of place. Driven by the
          *viewed* altitude so panning down reveals the marks at that height. */}
      <WordTowerLandmarkRail viewerHeightM={viewAlt} reducedMotion={reducedMotion} t={t} />

      {/* Rival rail — read-only leaderboard ghosts to climb past. */}
      <WordTowerRivalRail rivals={displayRivals} viewerHeightM={viewAlt} reducedMotion={reducedMotion} t={t} />

      {/* Persistent chase chip — the closest record still ABOVE you (the rail only
          draws on-screen ghosts, so the real target is usually off-screen up).
          Keyed off the live climb height, not the panned view. */}
      <WordTowerNextRivalChip rivals={displayRivals} viewerHeightM={game.heightM} reducedMotion={reducedMotion} t={t} dir={dir} />

      {/* ── Left utility rail ── persistent state chips (wrecking ball + watch-ad,
          steady-hands streak, active mutator, owned perks) stack in ONE flex
          column on the start side, below the top chrome. One layout owner means
          they can never overlap each other — or the centred banners — at
          hand-tuned absolute offsets again (the 390px pile-up, 2026-07-02). */}
      <div className="pointer-events-none absolute start-2 top-36 z-20 flex max-w-[45%] flex-col items-start gap-1" dir={dir}>
        {/* Wrecking Ball bay — token chip + rival picker + the wrecking-ball arc.
            Earned by reaching new zones / unlocking achievements; spent to raid a
            rival's tower. Chips render inline here; overlays stay fullscreen. */}
        <WordTowerSabotageBay
          inline
          tokens={sab.tokens}
          rivals={displayRivals}
          pickerOpen={sab.pickerOpen}
          onOpen={sab.openPicker}
          onClose={sab.closePicker}
          onSend={sendWreck}
          lastHit={sab.lastHit}
          onDismissHit={sab.dismissHit}
          earnedToast={sab.earnedToast}
          onDismissEarned={sab.dismissEarned}
          adEarnedToast={sab.adEarnedToast}
          onDismissAdEarned={sab.dismissAdEarned}
          t={t}
          reducedMotion={reducedMotion}
        />

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

        {/* Persistent mutator chip — keeps the day's active twist visible all run. */}
        {mutator && (
          <span
            className="flex items-center gap-1 rounded-neo border-neo border-black bg-neo-lime px-1.5 py-0.5 font-neo-body text-[10px] font-black text-black shadow-hard-sm"
            title={t(mutator.descKey, mutator.id === 'goldenLetter' ? { letter: mutator.goldenLetter ?? '' } : undefined)}
          >
            <span aria-hidden>{mutator.icon}</span>
            {t(mutator.nameKey)}
          </span>
        )}

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

      {/* "In the zone" frame — a hard-edged electric border that lights the play
          area on a hot perfect-drop streak, gold at "ON FIRE". Pure feel. */}
      <WordTowerFlowFrame perfectStreak={crane.perfectStreak} reducedMotion={reducedMotion} />

      {/* (Steady-hands FLOW chip + skin picker now live in the left utility rail
          and the top-bar actions row respectively.) */}

      {/* (All transient banners — zone, milestone, landmark, skin unlock, tease,
          combo, surprise, new-best, clutch, hazard, achievement, wreck report —
          now render in the single notice column below the verdict block.) */}

      {/* Crane Stack — the held word swings; tap the BOTTOM CTA to drop it.
          The crane's own button is hidden; the HUD's swapped-in DROP button
          calls craneRef.current.drop() so the player never chases the beam. */}
      {tower.state.pendingWord && (
        <WordTowerCrane
          ref={craneRef}
          word={tower.state.pendingWord}
          consecutiveSloppy={crane.consecutiveSloppy}
          onDrop={handleCraneDrop}
          onSignedDrop={crane.pushSignedOffset}
          t={t}
          reducedMotion={reducedMotion}
          periodMs={sweepMs}
          instability={instability}
          perfectBandBonus={upgradeEffects.perfectBandBonus}
          blockColorHex={blockColorHex}
          blockTextHex={blockTextHex}
          hideOwnButton
        />
      )}

      {/* ── Notice column ── every transient banner (verdict, alarms,
          celebrations, rewards, scenic beats) stacks here in priority order.
          See WordTowerNoticeColumn for the rationale + ordering. */}
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
        sabEarned={sab.earnedToast}
        sabAdEarned={!!sab.adEarnedToast}
        skinUnlock={skinUnlockR}
        surprise={surpriseR}
        combo={comboR}
        milestone={milestoneR}
        landmark={landmarkR}
        ach={achR}
        wreckReport={wreckReport}
        reducedMotion={reducedMotion}
        t={t}
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
        <WordTowerUpgradePanel onClose={() => setShowUpgrades(false)} t={t} dir={dir} />
      )}

      {/* Top chrome — ONE flow layout so nothing overlaps by construction:
          row 1 is a real flex row [back] · [actions], row 2 centres the
          altitude readout below it. The old version kept THREE separate
          absolute layers (back @top-3, StatHud @mt-8, actions @top-14) whose
          hand-tuned offsets collided on 390px phones — the altitude pill sat
          BEHIND the action buttons (founder screenshot, 2026-07-02). pt-10
          clears the fixed Daily/Endless strip (~y8–36); the actions row keeps
          me-12 so it clears the global mute FAB (fixed top-inline-end, 48px). */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 px-3 pt-10">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/${language}`}
            onClick={() => save(true)}
            aria-label={t('common.backToHome')}
            className="pointer-events-auto flex shrink-0 items-center gap-1 rounded-neo border-neo-thick border-black bg-neo-navy/80 px-3 py-2 font-neo-body text-sm font-bold text-neo-white shadow-hard backdrop-blur-sm"
          >
            <DirectionalIcon icon={ArrowLeft} className="h-4 w-4" />
            <span className="hidden min-[380px]:inline">{t('common.backToHome')}</span>
          </Link>
          <div className="pointer-events-auto me-12 flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setShowUpgrades(true)}
          aria-label={t('wordTower.upgrade.title')}
          className="rounded-neo border-neo-thick border-black bg-neo-cyan p-2 text-black shadow-hard active:translate-y-0.5 active:shadow-hard-pressed"
        >
          <Sparkles className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={shareTower}
          aria-label={t('wordTower.share.button')}
          className="rounded-neo border-neo-thick border-black bg-neo-pink p-2 text-neo-white shadow-hard active:translate-y-0.5 active:shadow-hard-pressed"
        >
          <Share2 className="h-4 w-4" />
        </button>
        {/* Tower-skin picker sits right beside Share (founder ask: "skin
            selection can be near the share") instead of floating mid-screen. */}
        <WordTowerSkinPicker inline skin={skin} bestHeightM={personalBest} t={t} dir={dir} reducedMotion={reducedMotion} />
        <button
          type="button"
          onClick={onOpenLeaderboard}
          aria-label={t('wordTower.leaderboard.title')}
          className="rounded-neo border-neo-thick border-black bg-neo-yellow p-2 text-black shadow-hard active:translate-y-0.5 active:shadow-hard-pressed"
        >
          <Trophy className="h-4 w-4" />
        </button>
          </div>
        </div>
        {/* Compact altitude card — its own centred row BELOW the buttons, so no
            locale label width or icon count can ever push it behind them. The
            live WALLET rides beside it: rewards were previously paid into a
            void (no visible balance anywhere in the climb) — now every grant
            counts up + pulses where the player is already looking. */}
        <div className="mx-auto mt-1.5 flex w-fit items-center gap-1.5">
          <WordTowerStatHud
            heightM={game.heightM}
            biomeId={biomeId}
            floorsCount={game.floors.length}
            personalBestM={personalBest}
            combo={game.combo}
            tier={architectTier}
            t={t}
          />
          {/* LazyMotion: the counter is built on framer `m.` primitives, which
              render nothing without a features provider — and this page has
              none (the counter had no live consumer before this). */}
          <LazyMotion features={domAnimation}>
            <CoinCounterAnimated value={coinBalance} size="xs" animateOnMount={false} />
          </LazyMotion>
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
          scramblesLeft={game.scramblesLeft}
          possibleWords={possibleWords}
          clueWord={clueWord}
          onReroll={reroll}
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
          onScramble={handleScramble}
          scrambleCost={WORD_TOWER_SCRAMBLE_COIN_COST}
          coinBalance={coinBalance}
          onDeckHeight={onDeckHeight}
          gainPreview={
            tower.word.length >= WORD_TOWER_MIN_WORD_LEN
              ? formatHeightGain(floorMeters(tower.word.length, game.combo))
              : undefined
          }
          pendingWord={tower.state.pendingWord}
          onCraneDrop={triggerCraneDrop}
          accentHex={blockColorHex}
          reducedMotion={reducedMotion}
          runPerks={runStreak.perks}
          t={t}
          dir={dir}
        />
      </div>
    </div>
  );
}
