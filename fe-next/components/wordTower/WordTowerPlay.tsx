'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, RotateCcw, Trophy, Share2 } from 'lucide-react';
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
import { hazardsCrossed } from '@/lib/wordTower/hazards';
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
}

function usePrefersReducedMotion(): boolean {
  const ref = useRef(false);
  useEffect(() => {
    ref.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);
  return ref.current;
}

export function WordTowerPlay({ language, isInDictionary, dictionary, initialGame, personalBestM, onOpenLeaderboard, rivals = [] }: PlayProps) {
  const { t, dir } = useLanguage();
  const reducedMotion = usePrefersReducedMotion();
  const tower = useWordTower({ language, sessionId: 'solo', isInDictionary, initialGame });
  const { game } = tower.state;
  const biomeId = useMemo(() => biomeForHeight(game.heightM), [game.heightM]);
  const personalBest = Math.max(personalBestM, game.heightM);
  // Altitude the camera is *looking at* — equals the live height, but drops as the
  // user pans down to review lower floors. The scene owns the pan gesture and
  // reports it here so the landmark + rival rails track the scroll too (otherwise
  // they freeze at the top and the lower sky reads blank). Starts at the height
  // the session resumes from.
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

  // "NEW ZONE" banner on entering a new biome — the headline celebration of the
  // climb. Owns its height so a colliding milestone (m50/m150 sit on the
  // sky/stratosphere thresholds) defers to it.
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

  // Environmental hazards: a bomb low down, a hurricane up high, strike at fixed
  // altitudes and topple the top floors. Detect the crossing → apply the damage
  // (the scene pops the lost floors automatically; the banner below names it).
  // height drops after a strike, so the next run sees curM<prevM → no re-fire,
  // and `firedHazards` guards re-climbing past the same altitude.
  const prevHazardH = useRef(game.heightM);
  useEffect(() => {
    const prev = prevHazardH.current;
    prevHazardH.current = game.heightM;
    const crossed = hazardsCrossed(prev, game.heightM, game.firedHazards);
    if (crossed.length === 0) return;
    const floors = crossed.reduce((s, h) => s + h.floors, 0);
    tower.hazard(floors, crossed[crossed.length - 1]!.kind, crossed.map((h) => h.id));
  }, [game.heightM]); // eslint-disable-line react-hooks/exhaustive-deps

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
  }, [buildPayload]);

  // Save cadence: every 10 floors + on biome crossing (rare, high-signal).
  const floorsCount = game.floors.length;
  useEffect(() => {
    if (floorsCount > 0 && floorsCount % 10 === 0) save();
  }, [floorsCount, save]);
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
      if (e.key === 'Enter') { e.preventDefault(); tower.submit(); return; }
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
        t={t}
        onViewAltChange={setViewAlt}
      />

      {/* World altitude landmarks you climb past (cloud base, jet stream, edge
          of space…) — gives the height a real sense of place. Driven by the
          *viewed* altitude so panning down reveals the marks at that height. */}
      <WordTowerLandmarkRail viewerHeightM={viewAlt} reducedMotion={reducedMotion} t={t} />

      {/* Rival record lines you climb past — fed by the leaderboard. */}
      <WordTowerRivalRail rivals={rivals} viewerHeightM={viewAlt} reducedMotion={reducedMotion} t={t} />

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

      {/* Hazard "tower ruined" banner — bold + red so the loss is unmissable */}
      {hazardText && (
        <div
          className={`pointer-events-none absolute left-1/2 top-[15%] z-40 -translate-x-1/2 rounded-neo border-neo-thick border-black bg-neo-red px-4 py-2 text-center font-neo-display text-base font-black text-neo-white shadow-hard ${reducedMotion ? '' : 'animate-neo-shake'}`}
          aria-live="assertive"
        >
          {hazardText}
        </div>
      )}

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
          onSubmit={tower.submit}
          onScramble={tower.scramble}
          onDeckHeight={onDeckHeight}
          t={t}
          dir={dir}
        />
      </div>
    </div>
  );
}
