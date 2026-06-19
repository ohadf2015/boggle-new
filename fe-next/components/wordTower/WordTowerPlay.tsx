'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Trophy, Share2, ChevronsUp, Flame, Sparkles } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useHideNavigation } from '@/contexts/NavigationContext';
import { useHaptics } from '@/hooks/useHaptics';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useGameActiveSound } from '@/hooks/useGameActiveSound';
import { TOWER_SURPRISE_META, UPDRAFT_MULT, type ActiveTowerSurprise, type TowerSurpriseSound } from '@/lib/wordTower/towerSurprise';
import type { Language } from '@/shared/types/game';
import { useWordTower } from '@/lib/wordTower/useWordTower';
import {
  biomeForHeight,
  serializeWordTowerState,
  type WordTowerPlayerState,
} from '@/lib/wordTower/wordTowerManager';
import { WORD_TOWER_MIN_WORD_LEN } from '@/shared/constants/wordTowerConstants';
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
import { swayInstability, swayHeightDampen, steadyHandsDampen } from '@/lib/wordTower/towerSway';
import { blockMaterial } from '@/lib/wordTower/blockGrade';
import { newlyUnlockedSkin, type TowerSkin } from '@/lib/wordTower/skins';
import { useTowerSkin } from './useTowerSkin';
import { WordTowerSkinPicker } from './WordTowerSkinPicker';
import { WordTowerFlowFrame } from './WordTowerFlowFrame';
import { textColorOn } from '@/lib/wordTower/towerColumn';
import { dropFlavor } from '@/lib/wordTower/dropFlavor';
import { buildDropVerdict, type DropVerdict, type VerdictTone } from '@/lib/wordTower/dropVerdict';
import type { PlacementOutcome } from '@/lib/wordTower/cranePlacement';
import { useWordTowerPerks } from './useWordTowerPerks';
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

/** Verdict-pop colour by band — mirrors the swinging-beam tint families. */
const VERDICT_TONE_CLASS: Record<VerdictTone, string> = {
  lime: 'bg-neo-lime text-neo-black',
  cyan: 'bg-neo-cyan text-neo-black',
  yellow: 'bg-neo-yellow text-neo-black',
  red: 'bg-neo-red text-neo-white',
};

/** Long-word celebration label per tier — folded into the verdict pop so the
 *  "SKYSCRAPER!" beat rides with the drop verdict instead of as a 2nd floating
 *  pop. (Mirrors WordTowerHud's TIER_KEY.) */
const TOWER_TIER_KEY: Record<'highRise' | 'tall' | 'skyscraper', string> = {
  highRise: 'wordTower.celebration.highRise',
  tall: 'wordTower.celebration.tall',
  skyscraper: 'wordTower.celebration.skyscraper',
};

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
  const ref = useRef(false);
  useEffect(() => {
    ref.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);
  return ref.current;
}

export function WordTowerPlay({ language, isInDictionary, dictionary, initialGame, personalBestM, onOpenLeaderboard, rivals = [], daily = false, onDailyEngaged, perkSeed = '', onNewDailyBest }: PlayProps) {
  const { t, dir } = useLanguage();
  const reducedMotion = usePrefersReducedMotion();
  const tower = useWordTower({ language, sessionId: 'solo', isInDictionary, initialGame });
  const { game } = tower.state;
  const biomeId = useMemo(() => biomeForHeight(game.heightM), [game.heightM]);
  const architectTier = useMemo(() => getTowerArchitectTier(game.floors), [game.floors]);
  const personalBest = Math.max(personalBestM, game.heightM);
  // Near-miss anticipation: a quiet "Next: Aurora · 18m" chip in the last stretch
  // before a new zone (the zone-entry banner pays it off).
  const tease = useMemo(() => zoneTeaseAt(game.heightM), [game.heightM]);
  // Viewed altitude (live height, or lower while panned) — drives the landmark + rival rails.
  const [viewAlt, setViewAlt] = useState(game.heightM);
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

  // "NEW ZONE" banner — owns this slot; milestones at the same height defer.
  const [zoneText, setZoneText] = useState<string | null>(null);
  const prevZone = useRef(biomeId);
  useEffect(() => {
    if (prevZone.current === biomeId) return;
    prevZone.current = biomeId;
    setZoneText(t(`wordTower.biome.${biomeId}`));
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
  }, [game.heightM, game.floors.length, game.longestWord, game.longestCombo, rivals]);
  useAutoDismiss(achToast, () => setAchToast(null), TOAST_MS);

  // Roguelike perk draft — daily-run only. Boons fold into one modifier object
  // the crane + hazard sites read. Segregated from the endless board (daily gates
  // the progress POST), so height-boosting perks never inflate records.
  const perks = useWordTowerPerks(daily, perkSeed);

  // The day's shared mutator — the twist EVERY player faces today (daily only).
  // Date-seeded so it's identical worldwide; keeps daily scores comparable while
  // making each day play differently (the fun + random-factor lever).
  const mutator: DailyMutator | null = useMemo(
    () => (daily ? mutatorForDate(utcDateKey(), language) : null),
    [daily, language],
  );
  // Structural mutator effects (skyline ×height, featherday topple-save) fold INTO
  // the perk struct via the same fields the crane + hazard sites already read.
  const craneMods = useMemo(
    () => (mutator ? combineModifiers(perks.modifiers, mutatorModifiers(mutator)) : perks.modifiers),
    [perks.modifiers, mutator],
  );
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
  const crane = useCraneDrop(tower.commitPlacement, tower.hazard, craneMods, wordHeightMult);

  // Imperative handle on the crane so the bottom HUD's swapped-in DROP CTA
  // can fire drop() — the player's thumb stays on the same button instead of
  // chasing the swinging beam to the top of the screen.
  const craneRef = useRef<WordTowerCraneHandle | null>(null);
  const triggerCraneDrop = useCallback(() => craneRef.current?.drop(), []);

  // Sweep period RAMPS with tower height (slow + learnable near the ground,
  // faster the taller you climb) — escalating challenge, not a flat speed.
  // Tailwind day slows the sweep (more dwell = easier perfects); other days = 1×.
  // Clamped to the floor so a future "gale" mutator can't drive it impossibly fast.
  const sweepMs = Math.max(
    SWEEP_PERIOD_FLOOR_MS,
    sweepPeriodMs(game.floors.length) * (mutator ? mutatorSweepMult(mutator) : 1),
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
    surpriseSoundFns[TOWER_SURPRISE_META[s.event].sound]();
    haptics.levelComplete();
  }, [tower.state.resultKey]); // eslint-disable-line react-hooks/exhaustive-deps
  useAutoDismiss(surpriseFx?.key, () => setSurpriseFx(null), TOAST_MS);

  // Rival ghosts are leaderboard records to climb past (read-only). The old
  // solo "wrecking-ball" sabotage was a fake, local-only effect against these
  // ghosts (no backend) — cut from solo. Async-versus interference lives in the
  // (unwired) WordTowerVersus prototype for the future shared-daily mode.
  const displayRivals = rivals;

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
  const gameRef = useRef(game);
  gameRef.current = game;
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
  const fxClass = (exiting: boolean, enter: string) => (reducedMotion ? '' : exiting ? 'wt-toast-out' : enter);

  // Always flush when the tab is hidden / page unloads.
  useEffect(() => {
    const onHide = () => { if (document.visibilityState === 'hidden') save(true); };
    window.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', () => save(true));
    return () => {
      save(true);
      window.removeEventListener('visibilitychange', onHide);
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

  const selectTileHaptic = useCallback((i: number) => { haptics.selection(); tower.selectTile(i); }, [haptics, tower]);

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
      if (navigator.share) await navigator.share({ title: 'Word Tower', text, url: imgUrl });
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

      {/* "In the zone" frame — a hard-edged electric border that lights the play
          area on a hot perfect-drop streak, gold at "ON FIRE". Pure feel. */}
      <WordTowerFlowFrame perfectStreak={crane.perfectStreak} reducedMotion={reducedMotion} />

      {/* Steady-hands FLOW chip — the positive crane-skill beat: a run of perfect
          drops calms the tower (see instability) and escalates this badge. Cyan →
          lime → gold "ON FIRE" so the streak reads at a glance. */}
      {crane.perfectStreak >= 2 && (
        <div
          className={`pointer-events-none absolute start-2 top-[11%] z-[8] flex items-center gap-1 rounded-neo border-neo-thick border-black px-2 py-1 shadow-hard ${reducedMotion ? '' : 'animate-neo-pop'} ${
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

      {/* Tower-skin picker — equip the materials you've unlocked by climbing. */}
      <WordTowerSkinPicker skin={skin} bestHeightM={personalBest} t={t} dir={dir} reducedMotion={reducedMotion} />

      {/* NEW SKIN UNLOCKED — the variable-reward beat when a climb crosses a
          skin's height milestone (the new look is auto-equipped). */}
      {skinUnlockR.value && (() => { const skinUnlock = skinUnlockR.value; return (
        <div
          className={`pointer-events-none absolute left-1/2 top-[22%] z-40 flex -translate-x-1/2 items-center gap-2 rounded-neo border-neo-thick border-black bg-neo-yellow px-4 py-2 shadow-hard ${fxClass(skinUnlockR.exiting, 'animate-neo-pop')}`}
          role="status"
          aria-live="polite"
        >
          <span className="flex overflow-hidden rounded-neo border-neo border-black" aria-hidden>
            <span className="h-6 w-2.5" style={{ background: `#${skinUnlock.palette.city.toString(16).padStart(6, '0')}` }} />
            <span className="h-6 w-2.5" style={{ background: `#${skinUnlock.palette.galaxy.toString(16).padStart(6, '0')}` }} />
          </span>
          <span className="flex flex-col items-start leading-tight">
            <span className="font-neo-body text-[10px] font-bold uppercase tracking-[0.2em] text-black/60">
              {t('wordTower.skin.unlockedToast')}
            </span>
            <span className="font-neo-display text-base font-black uppercase tracking-wide text-black">
              {t(skinUnlock.nameKey)}
            </span>
          </span>
        </div>
      ); })()}

      {/* Next-zone tease — quiet anticipation chip in the approach window. Hidden
          while the NEW ZONE banner is paying off the arrival. */}
      {tease && !zoneText && (
        <div
          className="pointer-events-none absolute left-1/2 top-[6%] z-20 -translate-x-1/2 flex items-center gap-1 rounded-neo border-neo border-black bg-neo-navy/75 px-2 py-1 font-neo-body text-[11px] font-bold text-neo-cyan backdrop-blur-sm"
          aria-live="polite"
        >
          <ChevronsUp className="h-3 w-3" />
          {t('wordTower.zone.next', { zone: t(`wordTower.biome.${tease.nextBiomeId}`), m: Math.ceil(tease.metersToNext) })}
        </div>
      )}

      {/* NEW ZONE banner — the headline of entering a new biome */}
      {zoneR.value && (
        <div
          className={`pointer-events-none absolute left-1/2 top-[9%] z-30 -translate-x-1/2 ${fxClass(zoneR.exiting, 'animate-neo-pop')} rounded-neo border-neo-thick border-black bg-neo-cyan px-4 py-2 text-center shadow-hard`}
          aria-live="polite"
        >
          <div className="font-neo-body text-[10px] font-bold uppercase tracking-[0.2em] text-black/60">{t('wordTower.zone.entered')}</div>
          <div className="font-neo-display text-base font-black uppercase tracking-wide text-black">{zoneR.value}</div>
        </div>
      )}

      {/* Witty milestone toast */}
      {milestoneR.value && (
        <div
          className={`pointer-events-none absolute left-1/2 top-[16%] z-20 -translate-x-1/2 ${fxClass(milestoneR.exiting, 'animate-neo-pop')} rounded-neo border-neo-thick border-black bg-neo-purple px-3 py-1.5 font-neo-display text-sm font-black text-neo-white shadow-hard`}
          aria-live="polite"
        >
          {milestoneR.value}
        </div>
      )}

      {/* Calm landmark flyby — a cosy, warm "you passed X" beat. Low-key cream
          (not electric) so it reads as a scenic moment, not a celebration.
          Shares the guarded milestone slot, so the two never co-occur. */}
      {landmarkR.value && (
        <div
          className={`pointer-events-none absolute left-1/2 top-[16%] z-20 -translate-x-1/2 rounded-neo border-neo-thick border-black bg-neo-cream px-3 py-1.5 font-neo-display text-sm font-black text-black shadow-hard ${fxClass(landmarkR.exiting, 'animate-neo-pop')}`}
          aria-live="polite"
        >
          {landmarkR.value}
        </div>
      )}

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
          blockColorHex={blockColorHex}
          blockTextHex={blockTextHex}
          hideOwnButton
        />
      )}

      {/* Unmistakable DROP VERDICT — the single big beat that answers "did I nail
          it?". Band-coloured headline (PERFECT/NICE/SLOPPY/MISSED) + the metres
          actually gained, popped centre-stage so it can't be missed. */}
      {verdictR.value && (() => { const verdict = verdictR.value; return (
        <div
          key={verdict.key}
          className={`pointer-events-none absolute left-1/2 top-[40%] z-40 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5 ${fxClass(verdictR.exiting, '')}`}
          aria-live="assertive"
          role="status"
        >
          {/* Tier kicker — the long-word celebration (SKYSCRAPER!) folded INTO the
              verdict so it is ONE consolidated beat, not a separate floating pop
              stacking on top of this one (founder: less clutter, more fun to watch). */}
          {tower.state.lastResult && tower.state.lastResult.tier !== 'none' && (
            <div className="rounded-neo border-neo border-black bg-neo-yellow px-3 py-0.5 font-neo-display text-sm font-black uppercase tracking-wide text-black shadow-hard">
              {t(TOWER_TIER_KEY[tower.state.lastResult.tier])}
            </div>
          )}
          <div
            className={`rounded-neo border-neo-thick border-black px-5 py-2.5 text-center font-neo-display text-2xl font-black uppercase tracking-wide shadow-hard ${VERDICT_TONE_CLASS[verdict.v.tone]} ${reducedMotion ? '' : verdict.v.toppled ? 'animate-neo-shake' : 'animate-neo-pop'}`}
          >
            {t(verdict.v.labelKey)}
          </div>
          {verdict.v.gainText !== '+0m' && (
            <div className="rounded-neo border-neo border-black bg-neo-navy/85 px-3 py-1 font-neo-display text-lg font-black text-neo-white shadow-hard backdrop-blur-sm">
              {verdict.v.gainText}
            </div>
          )}
        </div>
      ); })()}

      {/* Hazard "tower ruined" banner — bold + red so the loss is unmissable */}
      {hazardR.value && (
        <div
          className={`pointer-events-none absolute left-1/2 top-[15%] z-40 -translate-x-1/2 rounded-neo border-neo-thick border-black bg-neo-red px-4 py-2 text-center font-neo-display text-base font-black text-neo-white shadow-hard ${fxClass(hazardR.exiting, 'animate-neo-shake')}`}
          aria-live="assertive"
        >
          {hazardR.value}
        </div>
      )}

      {/* CRITICAL-lean warning — the tower is one shaky drop from falling.
          Telegraphs the clutch stake: land THIS drop cleanly. */}
      {crane.critical && tower.state.pendingWord && !clutchText && (
        <div
          className={`pointer-events-none absolute left-1/2 top-[12%] z-30 -translate-x-1/2 flex items-center gap-1 rounded-neo border-neo-thick border-black bg-neo-orange px-3 py-1.5 font-neo-display text-sm font-black uppercase tracking-wide text-black shadow-hard ${reducedMotion ? '' : 'animate-pulse'}`}
          aria-live="assertive"
        >
          ⚠ {t('wordTower.clutch.critical')}
        </div>
      )}

      {/* CLUTCH SAVE banner — the do-or-die payoff. Lime = triumph. */}
      {clutchR.value && (
        <div
          className={`pointer-events-none absolute inset-x-0 top-[12%] z-40 mx-auto w-fit rounded-neo border-neo-thick border-black bg-neo-lime px-5 py-2.5 text-center font-neo-display text-lg font-black uppercase tracking-wide text-black shadow-hard ${fxClass(clutchR.exiting, 'animate-neo-pop')}`}
          aria-live="assertive"
        >
          {clutchR.value}
        </div>
      )}

      {/* New daily best — the self-comparison routine beat. Gold = personal record. */}
      {newBestR.value && (
        <div
          className={`pointer-events-none absolute inset-x-0 top-[19%] z-40 mx-auto w-fit flex items-center gap-1.5 rounded-neo border-neo-thick border-black bg-neo-yellow px-4 py-2 text-center font-neo-display text-base font-black uppercase tracking-wide text-black shadow-hard ${fxClass(newBestR.exiting, 'animate-neo-pop')}`}
          aria-live="polite"
        >
          🏆 {newBestR.value}
        </div>
      )}

      {/* Combo-milestone fanfare — a flame-orange "×5 ON FIRE!" beat. Sits below
          the centre verdict so the two read as separate hits, not one pile. */}
      {comboR.value && (() => { const comboFx = comboR.value; return (
        <div
          key={comboFx.key}
          className={`pointer-events-none absolute inset-x-0 top-[28%] z-30 mx-auto w-fit flex items-center gap-1.5 rounded-neo border-neo-thick border-black bg-neo-orange px-4 py-2 text-center font-neo-display text-lg font-black uppercase tracking-wide text-black shadow-hard ${fxClass(comboR.exiting, 'animate-neo-pop')}`}
          aria-live="polite"
        >
          🔥 {t(comboFx.m.labelKey)} <span className="tabular-nums">×{comboFx.m.combo}</span>
        </div>
      ); })()}

      {/* Surprise pop — the variable-reward beat. Gold tile (celebration accent),
          sits high-centre so it reads as its own lucky hit above the verdict. */}
      {surpriseR.value && (() => { const surpriseFx = surpriseR.value; return (
        <div
          key={surpriseFx.key}
          className={`pointer-events-none absolute inset-x-0 top-[18%] z-40 mx-auto w-fit flex flex-col items-center gap-0.5 rounded-neo border-neo-thick border-black bg-neo-yellow px-5 py-2.5 text-center shadow-hard ${fxClass(surpriseR.exiting, 'animate-neo-pop')}`}
          aria-live="polite"
        >
          <div className="flex items-center gap-1.5 font-neo-display text-xl font-black uppercase tracking-wide text-black">
            <span aria-hidden>{TOWER_SURPRISE_META[surpriseFx.s.event].emoji}</span>
            {t(`wordTower.surprise.${TOWER_SURPRISE_META[surpriseFx.s.event].key}`)}
          </div>
          {(surpriseFx.s.bonusMeters > 0 || surpriseFx.s.bonusScrambles > 0) && (
            <div className="font-neo-body text-xs font-black text-black/80 tabular-nums">
              {surpriseFx.s.bonusMeters > 0 && `+${Math.round(surpriseFx.s.bonusMeters)}m`}
              {surpriseFx.s.bonusMeters > 0 && surpriseFx.s.bonusScrambles > 0 && ' · '}
              {surpriseFx.s.bonusScrambles > 0 && `+${surpriseFx.s.bonusScrambles}🔀`}
            </div>
          )}
          {/* Updraft pays out on the NEXT word, so it has no immediate bonus to
              show — surface the PROMISE explicitly so the reward isn't hollow. */}
          {surpriseFx.s.event === 'updraft' && (
            <div className="font-neo-body text-xs font-black text-black/80 tabular-nums">
              {t('wordTower.surprise.nextWord')} ×{UPDRAFT_MULT}
            </div>
          )}
        </div>
      ); })()}

      {/* Daily mutator intro — the day's shared twist, popped once on entry. */}
      {mutator && <WordTowerMutatorBanner mutator={mutator} t={t} reducedMotion={reducedMotion} />}

      {/* Persistent mutator chip — keeps the active twist visible all run. */}
      {mutator && (
        <div className="pointer-events-none fixed left-2 top-[44px] z-40" dir={dir}>
          <span
            className="flex items-center gap-1 rounded-neo border-neo border-black bg-neo-lime px-1.5 py-0.5 font-neo-body text-[10px] font-black text-black shadow-hard-sm"
            title={t(mutator.descKey, mutator.id === 'goldenLetter' ? { letter: mutator.goldenLetter ?? '' } : undefined)}
          >
            <span aria-hidden>{mutator.icon}</span>
            {t(mutator.nameKey)}
          </span>
        </div>
      )}

      {/* Owned perks — small badge row (daily run) so the player sees their build. */}
      {daily && perks.owned.length > 0 && (
        <div className="pointer-events-none fixed left-2 top-[76px] z-40 flex flex-col gap-1" dir={dir}>
          {perks.owned.map((id) => (
            <span
              key={id}
              className="flex items-center gap-1 rounded-neo border-neo border-black bg-neo-purple px-1.5 py-0.5 font-neo-body text-[10px] font-black text-neo-white shadow-hard-sm"
              title={t(PERKS[id].descKey)}
            >
              <span aria-hidden>{PERKS[id].icon}</span>
              {t(PERKS[id].nameKey)}
            </span>
          ))}
        </div>
      )}

      {/* Roguelike perk draft — pick 1 of 3 at each daily milestone. */}
      <WordTowerPerkDraft choices={perks.draft} onChoose={perks.choose} onSkip={perks.skip} t={t} dir={dir} />

      {/* Achievement unlock toast */}
      {achR.value && (() => { const achToast = achR.value; return (
        <div
          className={`pointer-events-none absolute left-1/2 top-[23%] z-30 -translate-x-1/2 rounded-neo border-neo-thick border-black bg-neo-yellow px-3 py-2 text-center shadow-hard ${fxClass(achR.exiting, 'animate-neo-pop')}`}
          aria-live="polite"
        >
          <div className="font-neo-body text-[10px] font-bold uppercase tracking-wider text-black/60">{t('wordTower.ach.unlocked')}</div>
          <div className="font-neo-display text-sm font-black text-black">{achToast.icon} {t(achToast.nameKey)}</div>
        </div>
      ); })()}

      {/* Top bar — three flex columns: [back] · [altitude readout] · [actions].
          The altitude HUD shares this row, so it can NEVER sit behind the back
          button (the old corner card overlapped it once the label wrapped in a
          longer locale). The container is inert; only the buttons take taps. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-2 p-3">
        <Link
          href={`/${language}`}
          onClick={() => save(true)}
          aria-label={t('common.backToHome')}
          className="pointer-events-auto flex shrink-0 items-center gap-1 rounded-neo border-neo-thick border-black bg-neo-navy/80 px-3 py-2 font-neo-body text-sm font-bold text-neo-white shadow-hard backdrop-blur-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden min-[380px]:inline">{t('common.backToHome')}</span>
        </Link>
        {/* Dropped below the top-centre mode-toggle badge row (Daily/Endless, a
            fixed full-width strip ~y8–37) so the height line isn't hidden behind
            it. Back button (left) + actions (right) stay pinned to the top. */}
        <div className="pointer-events-none mt-8">
          <WordTowerStatHud
            heightM={game.heightM}
            biomeId={biomeId}
            floorsCount={game.floors.length}
            personalBestM={personalBest}
            combo={game.combo}
            tier={architectTier}
            t={t}
          />
        </div>
        {/* me-12 (48px) keeps these actions clear of the global mute FAB
            (InGameAudioButton: fixed top-inline-end, 40px + 8px inset = 48px),
            so no button ever sits behind the mute/unmute control. RTL-safe:
            margin-inline-end + the FAB both flip to the same corner. */}
        <div className="pointer-events-auto me-12 flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={shareTower}
            aria-label={t('wordTower.share.button')}
            className="rounded-neo border-neo-thick border-black bg-neo-pink p-2 text-neo-white shadow-hard"
          >
            <Share2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onOpenLeaderboard}
            aria-label={t('wordTower.leaderboard.title')}
            className="rounded-neo border-neo-thick border-black bg-neo-yellow p-2 text-black shadow-hard"
          >
            <Trophy className="h-4 w-4" />
          </button>
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
          onBackspace={tower.backspace}
          onClear={tower.clear}
          onSubmit={tower.hold}
          onScramble={tower.scramble}
          onDeckHeight={onDeckHeight}
          pendingWord={tower.state.pendingWord}
          onCraneDrop={triggerCraneDrop}
          accentHex={blockColorHex}
          reducedMotion={reducedMotion}
          t={t}
          dir={dir}
        />
      </div>
    </div>
  );
}
