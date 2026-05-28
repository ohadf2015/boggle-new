'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, RotateCcw, Trophy, Share2, ChevronsUp } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useHideNavigation } from '@/contexts/NavigationContext';
import { useHaptics } from '@/hooks/useHaptics';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
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
import { useWordTowerPerks } from './useWordTowerPerks';
import { WordTowerPerkDraft } from './WordTowerPerkDraft';
import { perkMilestoneAt, reducedTopple, PERKS } from '@/lib/wordTower/perks';
import { beatsDailyBest } from '@/lib/wordTower/dailyBest';
import { useSabotageIntegration } from './useSabotage';
import { WordTowerSabotageBay } from './WordTowerSabotageBay';
import { hazardsCrossed } from '@/lib/wordTower/hazards';
import { zoneTeaseAt } from '@/lib/wordTower/zoneTease';
import { newlyUnlocked, type Achievement } from '@/lib/wordTower/achievements';
import { WordTowerScene } from './WordTowerScene';
import { WordTowerHud } from './WordTowerHud';

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
  const personalBest = Math.max(personalBestM, game.heightM);
  // Near-miss anticipation: a quiet "Next: Aurora · 18m" chip in the last stretch
  // before a new zone (the zone-entry banner pays it off).
  const tease = useMemo(() => zoneTeaseAt(game.heightM), [game.heightM]);
  // Viewed altitude (live height, or lower while panned) — drives the landmark + rival rails.
  const [viewAlt, setViewAlt] = useState(game.heightM);
  // Restart guard: a climb is hard-won, so the reset button asks once. First tap
  // arms a 3s "Sure?" state; a second tap commits, otherwise it reverts.
  const [confirmReset, setConfirmReset] = useState(false);
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (confirmTimer.current) clearTimeout(confirmTimer.current); }, []);
  const handleResetClick = () => {
    if (confirmReset) {
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
      setConfirmReset(false);
      tower.reset();
      return;
    }
    setConfirmReset(true);
    confirmTimer.current = setTimeout(() => setConfirmReset(false), 3000);
  };

  // "N words possible" hint — how many dictionary words the player could build
  // from the current anchor + tray (recomputed only when those change).
  const possibleWords = useMemo(
    () => (dictionary ? countBuildableWords(dictionary, game.anchorLetter, game.tray, WORD_TOWER_MIN_WORD_LEN, game.usedWords) : null),
    [dictionary, game.anchorLetter, game.tray, game.usedWords],
  );
  const clueWord = useMemo(
    () => (dictionary ? pickClueWord(dictionary, game.anchorLetter, game.tray, WORD_TOWER_MIN_WORD_LEN, game.usedWords) : null),
    [dictionary, game.anchorLetter, game.tray, game.usedWords],
  );
  // Dead-end escape: re-anchor to a letter that actually has buildable words.
  const reroll = useCallback(
    () => tower.reroll(dictionary ? (a, tr) => countBuildableWords(dictionary, a, tr, WORD_TOWER_MIN_WORD_LEN) > 0 : undefined),
    [tower, dictionary],
  );

  // "NEW ZONE" banner — owns this slot; milestones at the same height defer.
  const [zoneText, setZoneText] = useState<string | null>(null);
  const prevZone = useRef(biomeId);
  useEffect(() => {
    if (prevZone.current === biomeId) return;
    prevZone.current = biomeId;
    setZoneText(t(`wordTower.biome.${biomeId}`));
    const id = setTimeout(() => setZoneText(null), 2600);
    return () => clearTimeout(id);
  }, [biomeId]); // eslint-disable-line react-hooks/exhaustive-deps

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
    const id = setTimeout(() => setMilestoneText(null), 2400);
    return () => clearTimeout(id);
  }, [game.heightM]); // eslint-disable-line react-hooks/exhaustive-deps

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
    const id = setTimeout(() => setLandmarkText(null), 2200);
    return () => clearTimeout(id);
  }, [game.heightM]); // eslint-disable-line react-hooks/exhaustive-deps

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
    const id = setTimeout(() => setAchToast(null), 2800);
    return () => clearTimeout(id);
  }, [game.heightM, game.floors.length, game.longestWord, game.longestCombo, rivals]);  

  const haptics = useHaptics();
  const { playCoinCollectSound, playChestOpenSound, playErrorSound } = useSoundEffects();

  // Roguelike perk draft — daily-run only. Boons fold into one modifier object
  // the crane + hazard sites read. Segregated from the endless board (daily gates
  // the progress POST), so height-boosting perks never inflate records.
  const perks = useWordTowerPerks(daily, perkSeed);

  // Crane Stack — cosy reward-amplifier; logic in useCraneDrop. Perk modifiers
  // tune the perfect bonus, height, brink forgiveness, and wobble cushioning.
  const crane = useCraneDrop(tower.commitPlacement, tower.hazard, perks.modifiers);

  // Imperative handle on the crane so the bottom HUD's swapped-in DROP CTA
  // can fire drop() — the player's thumb stays on the same button instead of
  // chasing the swinging beam to the top of the screen.
  const craneRef = useRef<WordTowerCraneHandle | null>(null);
  const triggerCraneDrop = useCallback(() => craneRef.current?.drop(), []);

  // Wrecking ball — perfect drops earn tokens; spend on a rival to topple a
  // floor off their ghost tower. Includes the receiver-side simulator
  // (?sim_sabotage=1) and the rail-display math.
  const { sab: sabotage, displayRivals } = useSabotageIntegration(crane.perfectStreak, rivals, tower.hazard);

  // Environmental hazards strike at fixed altitudes → topple floors; firedHazards guards re-fire.
  const prevHazardH = useRef(game.heightM);
  useEffect(() => {
    const prev = prevHazardH.current;
    prevHazardH.current = game.heightM;
    const crossed = hazardsCrossed(prev, game.heightM, game.firedHazards);
    if (crossed.length === 0) return;
    // featherfall (perk) softens the blow — but the hazard ids still fire so it
    // never re-triggers, even if 0 floors are lost.
    const floors = reducedTopple(crossed.reduce((s, h) => s + h.floors, 0), perks.modifiers);
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
    const id = setTimeout(() => setHazardText(null), 2900);
    return () => clearTimeout(id);
  }, [tower.state.hazardKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // CLUTCH SAVE banner — a clean drop pulled the tower back from a critical lean.
  // The biggest single beat in the climb (a fumble instead routes through the
  // hazard "ruined" banner above, so we only celebrate the save here).
  const [clutchText, setClutchText] = useState<string | null>(null);
  useEffect(() => {
    if (!crane.clutch || crane.clutch.outcome !== 'save') return;
    setClutchText(t('wordTower.clutch.save'));
    const id = setTimeout(() => setClutchText(null), 1600);
    return () => clearTimeout(id);
  }, [crane.clutch?.key]); // eslint-disable-line react-hooks/exhaustive-deps

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
    const id = setTimeout(() => setNewBestText(null), 2200);
    return () => clearTimeout(id);
  }, [daily, newBestShown, personalBestM, game.heightM, onNewDailyBest]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (game.heightM > 0) save(); }, [biomeId]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const selectTileHaptic = useCallback((i: number) => { haptics.selection(); tower.selectTile(i); }, [haptics, tower]);

  const shareTower = useCallback(async () => {
    const g = gameRef.current;
    const params = new URLSearchParams({
      h: String(Math.round(g.heightM)),
      f: String(g.floors.length),
      b: biomeForHeight(g.heightM),
      w: g.longestWord || '',
    });
    const imgUrl = `${window.location.origin}/api/word-tower/share?${params.toString()}`;
    const text = t('wordTower.share.text', { m: Math.round(g.heightM) });
    try {
      if (navigator.share) await navigator.share({ title: 'Word Tower', text, url: imgUrl });
      else await navigator.clipboard?.writeText(`${text} ${imgUrl}`);
    } catch { /* user cancelled / unsupported */ }
  }, [t]);

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
        reducedMotion={reducedMotion}
        bottomInsetPx={deckHeight}
        personalBestM={personalBest}
        leanDeg={crane.leanDeg}
        clutchSaveKey={crane.clutch?.outcome === 'save' ? crane.clutch.key : 0}
        toppleKey={tower.state.hazardKey}
        t={t}
        onViewAltChange={setViewAlt}
      />

      {/* World altitude landmarks you climb past (cloud base, jet stream, edge
          of space…) — gives the height a real sense of place. Driven by the
          *viewed* altitude so panning down reveals the marks at that height. */}
      <WordTowerLandmarkRail viewerHeightM={viewAlt} reducedMotion={reducedMotion} t={t} />

      {/* Rival rail — heights include local sabotage hits so the targeted ghost shrinks. */}
      <WordTowerRivalRail rivals={displayRivals} viewerHeightM={viewAlt} reducedMotion={reducedMotion} t={t} />

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
      {zoneText && (
        <div
          className="pointer-events-none absolute left-1/2 top-[9%] z-30 -translate-x-1/2 animate-neo-pop rounded-neo border-neo-thick border-black bg-neo-cyan px-4 py-2 text-center shadow-hard"
          aria-live="polite"
        >
          <div className="font-neo-body text-[10px] font-bold uppercase tracking-[0.2em] text-black/60">{t('wordTower.zone.entered')}</div>
          <div className="font-neo-display text-base font-black uppercase tracking-wide text-black">{zoneText}</div>
        </div>
      )}

      {/* Witty milestone toast */}
      {milestoneText && (
        <div
          className="pointer-events-none absolute left-1/2 top-[16%] z-20 -translate-x-1/2 animate-neo-pop rounded-neo border-neo-thick border-black bg-neo-purple px-3 py-1.5 font-neo-display text-sm font-black text-neo-white shadow-hard"
          aria-live="polite"
        >
          {milestoneText}
        </div>
      )}

      {/* Calm landmark flyby — a cosy, warm "you passed X" beat. Low-key cream
          (not electric) so it reads as a scenic moment, not a celebration.
          Shares the guarded milestone slot, so the two never co-occur. */}
      {landmarkText && (
        <div
          className={`pointer-events-none absolute left-1/2 top-[16%] z-20 -translate-x-1/2 rounded-neo border-neo-thick border-black bg-neo-cream px-3 py-1.5 font-neo-display text-sm font-black text-black shadow-hard ${reducedMotion ? '' : 'animate-neo-pop'}`}
          aria-live="polite"
        >
          {landmarkText}
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
          onDrop={crane.onDrop}
          onSignedDrop={crane.pushSignedOffset}
          t={t}
          reducedMotion={reducedMotion}
          hideOwnButton
        />
      )}

      {/* Wrecking-ball UI: chip + earn toast + rival picker + hit animation. */}
      <WordTowerSabotageBay
        tokens={sabotage.tokens}
        rivals={displayRivals}
        pickerOpen={sabotage.pickerOpen}
        onOpen={sabotage.openPicker}
        onClose={sabotage.closePicker}
        onSend={sabotage.sabotage}
        lastHit={sabotage.lastHit}
        onDismissHit={sabotage.dismissHit}
        earnedToast={sabotage.earnedToast}
        onDismissEarned={sabotage.dismissEarned}
        t={t}
        reducedMotion={reducedMotion}
      />

      {/* Hazard "tower ruined" banner — bold + red so the loss is unmissable */}
      {hazardText && (
        <div
          className={`pointer-events-none absolute left-1/2 top-[15%] z-40 -translate-x-1/2 rounded-neo border-neo-thick border-black bg-neo-red px-4 py-2 text-center font-neo-display text-base font-black text-neo-white shadow-hard ${reducedMotion ? '' : 'animate-neo-shake'}`}
          aria-live="assertive"
        >
          {hazardText}
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
      {clutchText && (
        <div
          className={`pointer-events-none absolute left-1/2 top-[12%] z-40 -translate-x-1/2 rounded-neo border-neo-thick border-black bg-neo-lime px-5 py-2.5 text-center font-neo-display text-lg font-black uppercase tracking-wide text-black shadow-hard ${reducedMotion ? '' : 'animate-neo-pop'}`}
          aria-live="assertive"
        >
          {clutchText}
        </div>
      )}

      {/* New daily best — the self-comparison routine beat. Gold = personal record. */}
      {newBestText && (
        <div
          className={`pointer-events-none absolute left-1/2 top-[19%] z-40 -translate-x-1/2 flex items-center gap-1.5 rounded-neo border-neo-thick border-black bg-neo-yellow px-4 py-2 text-center font-neo-display text-base font-black uppercase tracking-wide text-black shadow-hard ${reducedMotion ? '' : 'animate-neo-pop'}`}
          aria-live="polite"
        >
          🏆 {newBestText}
        </div>
      )}

      {/* Owned perks — small badge row (daily run) so the player sees their build. */}
      {daily && perks.owned.length > 0 && (
        <div className="pointer-events-none fixed left-2 top-12 z-40 flex flex-col gap-1" dir={dir}>
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
      {achToast && (
        <div
          className="pointer-events-none absolute left-1/2 top-[23%] z-30 -translate-x-1/2 animate-neo-pop rounded-neo border-neo-thick border-black bg-neo-yellow px-3 py-2 text-center shadow-hard"
          aria-live="polite"
        >
          <div className="font-neo-body text-[10px] font-bold uppercase tracking-wider text-black/60">{t('wordTower.ach.unlocked')}</div>
          <div className="font-neo-display text-sm font-black text-black">{achToast.icon} {t(achToast.nameKey)}</div>
        </div>
      )}

      <div className="pointer-events-auto absolute inset-x-0 top-0 z-10 flex items-center justify-between p-3">
        <Link
          href={`/${language}`}
          onClick={() => save(true)}
          className="flex items-center gap-1 rounded-neo border-neo-thick border-black bg-neo-navy/80 px-3 py-2 font-neo-body text-sm font-bold text-neo-white shadow-hard backdrop-blur-sm"
        >
          <ArrowLeft className="h-4 w-4" /> {t('common.backToHome')}
        </Link>
        <div className="flex items-center gap-2">
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
          <button
            type="button"
            onClick={handleResetClick}
            aria-label={confirmReset ? t('wordTower.hud.restartConfirm') : t('wordTower.hud.restart')}
            className={`rounded-neo border-neo-thick border-black p-2 shadow-hard backdrop-blur-sm transition-colors ${confirmReset ? `bg-neo-red text-neo-white ${reducedMotion ? '' : 'animate-neo-shake'}` : 'bg-neo-navy/80 text-neo-white'}`}
          >
            {confirmReset
              ? <span className="px-1 font-neo-display text-xs font-black leading-none">{t('wordTower.hud.restartConfirm')}</span>
              : <RotateCcw className="h-4 w-4" />}
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
          personalBestM={personalBest}
          combo={game.combo}
          scramblesLeft={game.scramblesLeft}
          floorsCount={game.floors.length}
          possibleWords={possibleWords}
          clueWord={clueWord}
          onReroll={reroll}
          biomeId={biomeId}
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
          t={t}
          dir={dir}
        />
      </div>
    </div>
  );
}
