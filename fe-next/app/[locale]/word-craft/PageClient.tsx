'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Layers } from 'lucide-react';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useHideNavigation } from '@/contexts/NavigationContext';
import { PageLoader } from '@/components/ui/PageLoader';
import { useWordCraftGame } from '@/lib/word-craft/useWordCraftGame';
import { loadWordCraftDictionary } from '@/lib/word-craft/dictionary';
import type { SupportedLocale } from '@/lib/word-craft/tileBag';
import { WordCraftRack } from '@/components/word-craft/WordCraftRack';
import { WordCraftScoreboard } from '@/components/word-craft/WordCraftScoreboard';
import { WordCraftControls } from '@/components/word-craft/WordCraftControls';
import { WordCraftCelebration, type CelebrationKind } from '@/components/word-craft/WordCraftCelebration';
import { HeatMeter } from '@/components/word-craft/HeatMeter';
import { ScoreFloat } from '@/components/word-craft/ScoreFloat';
import { WordCraftTutor } from '@/components/word-craft/WordCraftTutor';
import { WordCraftDragGhost } from '@/components/word-craft/WordCraftDragGhost';
import { WordCraftPendingStrip } from '@/components/word-craft/WordCraftPendingStrip';
import { WordCraftLiveRegion } from '@/components/word-craft/WordCraftLiveRegion';
import { WordCraftBoardSection } from '@/components/word-craft/WordCraftBoardSection';
import { WordCraftHandoff } from '@/components/word-craft/WordCraftHandoff';
import { WordCraftTerritoryStrip } from '@/components/word-craft/WordCraftTerritoryStrip';
import { WordCraftGameOverScene } from '@/components/word-craft/WordCraftGameOverScene';
import { useWordCraftJuice } from '@/components/word-craft/useWordCraftJuice';
import { useWordCraftDrag } from '@/components/word-craft/useWordCraftDrag';
import { useWordCraftKeyboardShortcuts } from '@/components/word-craft/hooks/useWordCraftKeyboardShortcuts';
import type { SceneCtx } from '@/lib/word-craft/pixi/sceneCtx';
import { mountAmbientSparkles, type PremiumCellRef } from '@/lib/word-craft/pixi/ambientSparkles';
import { playTilePlaceRipple } from '@/lib/word-craft/pixi/scenes/tilePlaceRipple';
import { playSpectacleCommit } from '@/lib/word-craft/celebration/playSpectacleCommit';
import { useWordCraftSound } from '@/components/word-craft/useWordCraftSound';
import { recordBest } from '@/lib/word-craft/bestScore';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { classifyHeat, detectHeatTransition, type HeatBeat } from '@/lib/word-craft/celebration/heatTransition';
import { WordCraftHeatStamp } from '@/components/word-craft/WordCraftHeatStamp';
import { WordCraftScorePreviewBadge } from '@/components/word-craft/WordCraftScorePreviewBadge';
import { playBotMoveReveal } from '@/lib/word-craft/pixi/scenes/botMoveReveal';
import { playGameOverBurst } from '@/lib/word-craft/pixi/scenes/gameOverBurst';
import { inferAxis, resolveTap } from '@/lib/word-craft/placement';
import {
  trackWordCraftAxisLocked,
  trackWordCraftFastTapUsed,
  trackWordCraftOffAxisDrop,
  trackWordCraftPendingRecall,
  trackWordCraftRecallAll,
  trackWordCraftTurnSubmitted,
  type WordCraftInputMethod,
} from '@/components/word-craft/wordCraftTelemetry';
import { useAchievementQueue } from '@/components/achievements';
import { countClaimed } from '@/lib/word-craft/territory';
import { cn } from '@/lib/utils';

const ENCOURAGEMENT_COUNT = 8;
const LINGUIST_STORAGE_KEY = 'wc_locales_played';

function getPlayedLocales(): Set<string> {
  try {
    const raw = localStorage.getItem(LINGUIST_STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function recordLocale(locale: string) {
  try {
    const set = getPlayedLocales();
    set.add(locale);
    localStorage.setItem(LINGUIST_STORAGE_KEY, JSON.stringify([...set]));
    return set.size;
  } catch {
    return 0;
  }
}

export default function WordCraftPageClient() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const { loading: authLoading } = useAuth();
  const isRTL = language === 'he';
  const locale = (language ?? 'en') as SupportedLocale;

  // Compact multiplier labels painted inside empty premium cells. Built once
  // per locale so WordCraftBoard's memo isn't busted every render.
  const premiumLabels = useMemo(
    () => ({
      TW: t('wordcraft.premiumLabel.tw'),
      DW: t('wordcraft.premiumLabel.dw'),
      TL: t('wordcraft.premiumLabel.tl'),
      DL: t('wordcraft.premiumLabel.dl'),
    }),
    [t],
  );

  // Hide the global bottom nav while in WordCraft — it's an immersive,
  // no-scroll screen and the nav was overlapping the board and rack. This
  // also drops --bottom-nav-height to 0 so the h-svh layout reclaims the
  // full viewport.
  const setIsInGame = useHideNavigation();
  useEffect(() => {
    setIsInGame(true);
    return () => setIsInGame(false);
  }, [setIsInGame]);

  const [dict, setDict] = useState<Set<string> | null>(null);

  // Load locale dictionary
  useEffect(() => {
    let cancelled = false;
    loadWordCraftDictionary(locale).then((d) => {
      if (!cancelled) setDict(d);
    }).catch(() => {
      if (!cancelled) setDict(new Set());
    });
    return () => { cancelled = true; };
  }, [locale]);

  // Record locale for linguist achievement
  useEffect(() => {
    recordLocale(locale);
  }, [locale]);

  const seed = useMemo(() => {
    if (typeof window === 'undefined') return 1;
    const fromUrl = new URLSearchParams(window.location.search).get('seed');
    return fromUrl ? Number(fromUrl) : Math.floor(Math.random() * 1_000_000);
  }, []);

  // Territory mode is the default twist. Opt-out: ?classic=1 returns the
  // legacy Scrabble-alt feel (no claims, no capture bonus, no endgame bonus).
  const territoryEnabled = useMemo(() => {
    if (typeof window === 'undefined') return true;
    const classic = new URLSearchParams(window.location.search).get('classic');
    return classic !== '1' && classic !== 'true';
  }, []);

  // Hot-seat (pass-and-play) human vs human on one device: ?vs=human.
  const hotseat = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('vs') === 'human';
  }, []);

  const game = useWordCraftGame({ seed, dict, locale, territoryEnabled, hotseat });
  const { cosyMode } = useAccessibility();

  // Audio: activates the SFX gate + in-game music on mount, fires heat-beat /
  // capture / game-over sounds as state transitions, and exposes playCommit for
  // the per-word celebration. WordCraft was silent before this.
  const {
    playCommit: playCommitSound,
    playOpponentScored,
    playPass: playPassSound,
    playSwap: playSwapSound,
    playNewBest,
  } = useWordCraftSound(
    {
      heat: game.state.heat,
      overdrive: game.state.overdrive,
      burnout: game.state.burnout,
      captureTurnIndex: game.state.lastCapture?.turnIndex ?? null,
      captureCount: game.state.lastCapture?.cells.length ?? 0,
      isOver: game.state.turn === 'over',
      result:
        game.state.turn !== 'over'
          ? null
          : game.state.player.score === game.state.bot.score
            ? 'draw'
            : game.state.player.score > game.state.bot.score
              ? 'win'
              : 'lose',
    },
    cosyMode,
  );

  // Pass-and-play hand-off curtain: when the turn flips between the two human
  // seats, cover the screen so the incoming player can't see the outgoing
  // player's rack. Shown on every turn change except the very first and the
  // game-over transition.
  const [showHandoff, setShowHandoff] = useState(false);
  const prevTurnRef = useRef(game.state.turn);
  useEffect(() => {
    if (!hotseat) return;
    if (game.state.turn !== prevTurnRef.current && game.state.turn !== 'over') {
      setShowHandoff(true);
    }
    prevTurnRef.current = game.state.turn;
  }, [hotseat, game.state.turn]);
  const juice = useWordCraftJuice();
  const { queueAchievement } = useAchievementQueue();
  const [sceneCtx, setSceneCtx] = useState<SceneCtx | null>(null);
  const ambientSparklesRef = useRef<ReturnType<typeof mountAmbientSparkles> | null>(null);

  // --- Telemetry plumbing ---
  // turnIdRef persists for the whole turn so every event tied to one turn
  // lands with the same key. Bumps on each successful commit / pass.
  const turnIdRef = useRef(`t-${Date.now()}-0`);
  const turnIndexRef = useRef(0);
  // Per-turn count of dispatch sites — fed into `inputMethod` heuristic on
  // turn_submitted so we know which gesture dominated the turn.
  const inputCountsRef = useRef<{ tap: number; drag: number; fastTap: number }>({ tap: 0, drag: 0, fastTap: 0 });
  const resetTurnTelemetry = useCallback(() => {
    turnIndexRef.current += 1;
    turnIdRef.current = `t-${Date.now()}-${turnIndexRef.current}`;
    inputCountsRef.current = { tap: 0, drag: 0, fastTap: 0 };
  }, []);

  // Drag-to-place: pointer-down on rack tile begins a drag; pointer-up over a
  // valid empty cell drops it via the placeTileOnBoard bypass action.
  const { drag, begin: beginTileDrag, consumeDropFlag } = useWordCraftDrag({
    onDrop: (tileId, r, c) => {
      // Off-axis detection: if axis is locked and this drop breaks the line,
      // emit telemetry so we can measure how often the heuristic mis-reads
      // intent. The actual placement still goes through (current reducer
      // doesn't enforce axis-line at drop time — validation runs on submit).
      const pending = game.state.pendingPlacements;
      const axisAtDrop = inferAxis(pending);
      if (axisAtDrop === 'h' && pending[0] && pending[0].row !== r) {
        trackWordCraftOffAxisDrop({ turnId: turnIdRef.current });
      } else if (axisAtDrop === 'v' && pending[0] && pending[0].col !== c) {
        trackWordCraftOffAxisDrop({ turnId: turnIdRef.current });
      }
      inputCountsRef.current.drag += 1;
      game.placeTileOnBoard(tileId, r, c);
    },
  });

  const axis = useMemo(() => inferAxis(game.state.pendingPlacements), [game.state.pendingPlacements]);

  // Fire axis_locked exactly once when pending tiles transition from 1→2
  // and form a valid line. Resets when pending shrinks back to <2.
  const axisLockEmittedRef = useRef(false);
  useEffect(() => {
    if (axis !== null && !axisLockEmittedRef.current) {
      axisLockEmittedRef.current = true;
      trackWordCraftAxisLocked({
        axis,
        turnNumber: turnIndexRef.current + 1,
        turnId: turnIdRef.current,
      });
    } else if (axis === null && axisLockEmittedRef.current) {
      axisLockEmittedRef.current = false;
    }
  }, [axis]);

  // Fast-tap: when the player has placed >=2 tiles in a line, a tap on a rack
  // tile auto-drops at the next empty cell along that axis. Eliminates per-tile
  // targeting for placements 3..7 of a turn.
  const handleFastTap = useCallback(
    (tile: { id: string }) => {
      const rackTile = game.activePlayer.rack.find((t) => t.id === tile.id);
      if (!rackTile) return;
      const result = resolveTap(rackTile, game.state.pendingPlacements, game.state.board);
      if ('placement' in result) {
        inputCountsRef.current.fastTap += 1;
        trackWordCraftFastTapUsed({
          turnId: turnIdRef.current,
          tilesPlaced: game.state.pendingPlacements.length + 1,
        });
        // Same arc juice as tap-place — flying tile keeps the gesture
        // physical even when the player isn't aiming.
        const fromEl = document.querySelector(`[data-rack-tile-id="${rackTile.id}"]`);
        const toEl = document.querySelector(`[data-board-cell="${result.placement.row},${result.placement.col}"]`);
        juice.arcTilePlace(fromEl, toEl, rackTile.letter, rackTile.value);
        game.placeTileOnBoard(rackTile.id, result.placement.row, result.placement.col);
      }
    },
    [game, juice],
  );

  // Wrap raw recall handlers so the strip / board cells share the same
  // telemetry surface but the analytics can disambiguate the source.
  const recallFromStrip = useCallback(
    (rackTileId: string) => {
      trackWordCraftPendingRecall({ turnId: turnIdRef.current, source: 'strip' });
      game.recallTile(rackTileId);
    },
    [game],
  );
  const recallFromBoard = useCallback(
    (rackTileId: string) => {
      trackWordCraftPendingRecall({ turnId: turnIdRef.current, source: 'board' });
      game.recallTile(rackTileId);
    },
    [game],
  );
  const recallAllPending = useCallback(() => {
    const count = game.state.pendingPlacements.length;
    if (count > 0) {
      trackWordCraftRecallAll({ turnId: turnIdRef.current, tilesRecalled: count });
    }
    game.recallAll();
  }, [game]);

  // Wrap submitMove so we emit turn_submitted with a derived inputMethod
  // before the reducer commits + clears pending state.
  const submitMoveWithTelemetry = useCallback(() => {
    const counts = inputCountsRef.current;
    const total = counts.tap + counts.drag + counts.fastTap;
    let inputMethod: WordCraftInputMethod = 'tap';
    if (total > 0) {
      const max = Math.max(counts.tap, counts.drag, counts.fastTap);
      const distinctNonZero = Number(counts.tap > 0) + Number(counts.drag > 0) + Number(counts.fastTap > 0);
      if (distinctNonZero > 1) inputMethod = 'mixed';
      else if (counts.fastTap === max) inputMethod = 'fast-tap';
      else if (counts.drag === max) inputMethod = 'drag';
      else inputMethod = 'tap';
    }
    const tilesPlaced = game.state.pendingPlacements.length;
    const previousHistoryLen = game.state.history.length;
    game.submitMove();
    // Fire telemetry only when the commit actually advanced history. We
    // schedule a microtask so we read post-dispatch state.
    queueMicrotask(() => {
      const newest = game.state.history[previousHistoryLen];
      if (newest && newest.score > 0) {
        trackWordCraftTurnSubmitted({
          turnId: turnIdRef.current,
          inputMethod,
          tilesPlaced,
          score: newest.score,
        });
        resetTurnTelemetry();
      }
    });
  }, [game, resetTurnTelemetry]);

  // Keyboard shortcuts and arrow-key reticle (declared AFTER the callbacks it consumes)
  const { reticle } = useWordCraftKeyboardShortcuts({
    turn: game.state.turn,
    pendingPlacements: game.state.pendingPlacements,
    burnout: game.state.burnout,
    playerRack: game.activePlayer.rack,
    dict,
    axis,
    boardSize: game.state.board.size,
    onRecallAll: recallAllPending,
    onSubmit: submitMoveWithTelemetry,
    onRecallOne: recallFromBoard,
    onFastTap: handleFastTap,
    onSelectTile: game.selectRackTile,
    onPlaceOnBoard: (r, c) => {
      inputCountsRef.current.tap += 1;
      game.placeOnBoard(r, c);
    },
  });

  // Celebrations
  const [celebration, setCelebration] = useState<{ kind: CelebrationKind; burstId: number; origin?: { x: number; y: number } }>({
    kind: null,
    burstId: 0,
  });

  // Score float state
  const [scoreFloat, setScoreFloat] = useState<{ score: number; overdrive: boolean; isBingo: boolean; encouragement: string; key: number } | null>(null);

  // Transient capture toast — fires when a turn flips opponent-claimed cells.
  // turnIndex is monotonic so a fresh capture always triggers re-render.
  const [captureToast, setCaptureToast] = useState<{ by: 'player' | 'bot'; count: number; bonus: number; key: number } | null>(null);
  const lastCaptureTurnRef = useRef<number>(-1);
  useEffect(() => {
    const cap = game.state.lastCapture;
    if (!cap) return;
    if (cap.turnIndex === lastCaptureTurnRef.current) return;
    lastCaptureTurnRef.current = cap.turnIndex;
    setCaptureToast({ by: cap.by, count: cap.cells.length, bonus: cap.bonus, key: cap.turnIndex });
    const timer = setTimeout(() => setCaptureToast(null), 1800);
    return () => clearTimeout(timer);
  }, [game.state.lastCapture]);

  // --- Juice: tile place ---
  const prevPendingIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const next = new Set(game.state.pendingPlacements.map((p) => p.rackTileId));
    for (const p of game.state.pendingPlacements) {
      if (!prevPendingIdsRef.current.has(p.rackTileId)) {
        const el = document.querySelector(`[data-tile-id="${p.rackTileId}"]`);
        juice.tilePlace(el);
        // Fire Pixi ripple at the cell where the tile was placed
        if (sceneCtx) {
          playTilePlaceRipple(sceneCtx, { row: p.row, col: p.col }).catch(() => {
            // Pixi animations can fail on low-end devices; silently continue
          });
        }
      }
    }
    prevPendingIdsRef.current = next;
  }, [game.state.pendingPlacements, juice, sceneCtx]);

  // --- Juice: rack select ---
  const prevSelectedRef = useRef<string | null>(null);
  useEffect(() => {
    const id = game.state.selectedRackTileId;
    if (id && id !== prevSelectedRef.current) {
      const el = document.querySelector(`[data-rack-tile-id="${id}"]`);
      juice.rackSelect(el);
    }
    prevSelectedRef.current = id;
  }, [game.state.selectedRackTileId, juice]);

  // --- History: score float + celebrations + achievements ---
  const prevHistoryLenRef = useRef(0);
  const overdriveCountRef = useRef(0);
  const firstWordAchievedRef = useRef(false);

  useEffect(() => {
    const len = game.state.history.length;
    if (len === prevHistoryLenRef.current) return;
    const newest = game.state.history[len - 1];
    prevHistoryLenRef.current = len;
    if (!newest || newest.score === 0) return;

    const popEl = document.querySelector(`[data-score-value="${newest.who}"]`);
    juice.scorePop(popEl, newest.score);

    const placedEls = newest.placedTileIds
      .map((id) => document.querySelector(`[data-tile-id="${id}"]`))
      .filter((n): n is Element => Boolean(n));

    if (newest.who === 'bot' && placedEls.length > 0) {
      juice.botReveal(placedEls);
      // Fire Pixi bot move reveal animation. Placed tiles are on the board
      // post-commit; scan by rackTileId rather than looking in history.
      if (sceneCtx) {
        const placements: { row: number; col: number }[] = [];
        const ids = new Set(newest.placedTileIds);
        for (let r = 0; r < game.state.board.size; r++) {
          for (let c = 0; c < game.state.board.size; c++) {
            const tile = game.state.board.cells[r][c].tile;
            if (tile && ids.has(tile.rackTileId)) placements.push({ row: r, col: c });
          }
        }
        playBotMoveReveal(sceneCtx, placements).catch(() => {
          // Pixi animations can fail on low-end devices; silently continue
        });
      }
      // Audio twin of the bot reveal — the opponent scoring was silent before.
      if (newest.score > 0) playOpponentScored();
    }
    if (newest.who === 'player' && placedEls.length > 0) {
      juice.playerCommitReveal(placedEls);
    }

    if (newest.who === 'player') {
      const isBingo = newest.placedTileIds.length >= 7;
      const wasOverdrive = game.state.overdrive === false && newest.score > 0; // overdrive was cashed
      const encIdx = Math.floor(Math.random() * ENCOURAGEMENT_COUNT);
      const encouragement = t(`wordcraft.encouragement.${encIdx}`);

      setScoreFloat({ score: newest.score, overdrive: false, isBingo, encouragement, key: len });

      // Fire tiered spectacle: tier resolver picks the FX bundle (ripple →
      // wave → path trace → word stamp → edge flash → aurora) per commit
      // size/streak. Cosy mode clamps huge/bingo down to "great" to keep
      // calm-mode players from being blasted by fullscreen flashes.
      if (sceneCtx) {
        const placements: { row: number; col: number; letter: string; value: number }[] = [];
        const ids = new Set(newest.placedTileIds);
        let premiumTriggered = false;
        let hasRareTile = false;
        for (let r = 0; r < game.state.board.size; r++) {
          for (let c = 0; c < game.state.board.size; c++) {
            const tile = game.state.board.cells[r][c].tile;
            if (tile && ids.has(tile.rackTileId)) {
              placements.push({ row: r, col: c, letter: tile.letter, value: tile.value });
              if (game.state.board.cells[r][c].premium) premiumTriggered = true;
              if (tile.value >= 8) hasRareTile = true;
            }
          }
        }
        const commitCtx = {
          scoreThisTurn: newest.score,
          tilesPlaced: newest.placedTileIds.length,
          bingo: isBingo,
          streak: game.state.streaks.player,
          hasRareTile,
          premiumTriggered,
          heatLevel: game.state.heat,
        };
        playSpectacleCommit(sceneCtx, {
          ctx: commitCtx,
          placements,
          word: newest.words[0] ?? '',
          cosyMode,
        }).catch(() => {
          // Pixi animations can fail on low-end devices; silently continue
        });
        // Audio twin of the Pixi spectacle — confirm + tier flourish + rare sparkle.
        playCommitSound(commitCtx);
      }

      // Achievement: first word
      if (!firstWordAchievedRef.current) {
        firstWordAchievedRef.current = true;
        queueAchievement({ key: 'wordcraft_first_word', icon: '🎉' });
      }

      // Achievement: bingo
      if (isBingo) {
        queueAchievement({ key: 'wordcraft_bingo', icon: '⭐' });
        const target = (placedEls[Math.floor(placedEls.length / 2)] as HTMLElement | undefined) ?? null;
        const rect = target?.getBoundingClientRect();
        setCelebration((prev) => ({
          kind: 'bingo',
          burstId: prev.burstId + 1,
          origin: rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : undefined,
        }));
      }

      // Achievement: overdrive cashed (wasOverdrive means we just exited overdrive via a word)
      if (wasOverdrive) {
        queueAchievement({ key: 'wordcraft_overdrive_cash', icon: '🔥' });
        setScoreFloat((prev) => prev ? { ...prev, overdrive: true } : prev);
      }
    }
  }, [game.state.history, game.state.overdrive, juice, t, queueAchievement, sceneCtx, game, cosyMode, playCommitSound, playOpponentScored]);

  // --- Overdrive enter ---
  const prevOverdriveRef = useRef(false);
  useEffect(() => {
    const cur = game.state.overdrive;
    if (cur && !prevOverdriveRef.current) {
      overdriveCountRef.current++;
      setCelebration((prev) => ({
        kind: 'overdrive',
        burstId: prev.burstId + 1,
        origin: undefined,
      }));
      queueAchievement({ key: 'wordcraft_overdrive_enter', icon: '⚡' });

      if (overdriveCountRef.current >= 3) {
        queueAchievement({ key: 'wordcraft_heat_streak', icon: '🏆', count: overdriveCountRef.current });
      }
    }
    prevOverdriveRef.current = cur;
  }, [game.state.overdrive, queueAchievement]);

  // --- Heat-state transition beat ---
  // Detects cold/warm/overdrive/burnout state crossings and fires the
  // corresponding Pixi scene + DOM stamp. Stacks ABOVE existing celebrations
  // so we keep the achievement toast/celebration overlay too.
  const [heatBeat, setHeatBeat] = useState<HeatBeat | null>(null);
  const prevHeatStateRef = useRef(classifyHeat({
    heat: game.state.heat,
    overdrive: game.state.overdrive,
    burnout: game.state.burnout,
  }));
  useEffect(() => {
    const current = classifyHeat({
      heat: game.state.heat,
      overdrive: game.state.overdrive,
      burnout: game.state.burnout,
    });
    const beat = detectHeatTransition(prevHeatStateRef.current, current);
    prevHeatStateRef.current = current;
    if (!beat) return;
    setHeatBeat(beat);
    if (sceneCtx) {
      import('@/lib/word-craft/pixi/scenes/heatBeat')
        .then(({ playHeatBeat }) => playHeatBeat(sceneCtx, beat))
        .catch(() => {
          // Pixi animations can fail on low-end devices; silently continue
        });
    }
  }, [game.state.heat, game.state.overdrive, game.state.burnout, sceneCtx]);

  // --- Burnout auto-skip after 1.5s ---
  const prevBurnoutRef = useRef(false);
  useEffect(() => {
    const cur = game.state.burnout;
    const wasAlreadyBurnt = prevBurnoutRef.current;
    prevBurnoutRef.current = cur;
    if (!cur || wasAlreadyBurnt) return;
    setCelebration((prev) => ({ kind: 'burnout', burstId: prev.burstId + 1 }));
    const timer = setTimeout(() => { game.burnoutSkip(); }, 1500);
    return () => clearTimeout(timer);
  }, [game, game.state.burnout, game.burnoutSkip]);

  // --- Pixi: Mount ambient sparkles on premium cells ---
  useEffect(() => {
    if (!sceneCtx) return;
    const cells: PremiumCellRef[] = [];
    for (let r = 0; r < game.state.board.size; r++) {
      for (let c = 0; c < game.state.board.size; c++) {
        const p = game.state.board.cells[r]?.[c]?.premium;
        if (p) cells.push({ row: r, col: c, kind: p });
      }
    }
    const handle = mountAmbientSparkles(sceneCtx, cells);
    ambientSparklesRef.current = handle;
    return () => handle.destroy();
  }, [sceneCtx, game.state.board]);

  // --- Linguist achievement ---
  useEffect(() => {
    const count = recordLocale(locale);
    if (count >= 3) {
      queueAchievement({ key: 'wordcraft_linguist', icon: '🌍' });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Game over ---
  const [newBest, setNewBest] = useState(false);
  const recordedBestRef = useRef(false);
  useEffect(() => {
    if (game.state.turn === 'over') {
      setCelebration((prev) => ({ kind: 'gameOver', burstId: prev.burstId + 1 }));
      // Fire Pixi game over burst
      if (sceneCtx) {
        playGameOverBurst(sceneCtx).catch(() => {
          // Pixi animations can fail on low-end devices; silently continue
        });
      }
      // Personal best (SP vs bot only — hotseat has two human seats, no "mine").
      if (!hotseat && !recordedBestRef.current) {
        recordedBestRef.current = true;
        const mode = territoryEnabled ? 'territory' : 'classic';
        const { isNewBest } = recordBest(mode, game.state.player.score);
        if (isNewBest) {
          setNewBest(true);
          playNewBest();
        }
      }
    } else {
      recordedBestRef.current = false;
      setNewBest(false);
    }
  }, [game.state.turn, sceneCtx, hotseat, territoryEnabled, game.state.player.score, playNewBest]);

  // --- Error shake ---
  const lastErrorRef = useRef<string | null>(null);
  useEffect(() => {
    const e = game.state.lastError;
    if (!e || e === lastErrorRef.current) {
      lastErrorRef.current = e;
      return;
    }
    lastErrorRef.current = e;
    const cellEls = game.state.pendingPlacements
      .map((p) => document.querySelector(`[data-tile-id="${p.rackTileId}"]`))
      .filter((n): n is Element => Boolean(n));
    juice.invalidShake(cellEls);
  }, [game.state.lastError, game.state.pendingPlacements, juice]);

  // Card (power-card Run) mode now has its own stable entry — ?mode=cards is
  // routed straight to RunPageClient by WordCraftClient, so PageClient no
  // longer hijacks the territory view behind a feature flag.

  if (authLoading) {
    return (
      <div className="flex-1 bg-neo-navy text-neo-white flex items-center justify-center">
        <PageLoader size="lg" text={t('common.loading')} />
      </div>
    );
  }

  const pendingIds = new Set(game.state.pendingPlacements.map((p) => p.rackTileId));

  // First-move flag drives center-star ping + rack glow.
  const isFirstMove = game.state.history.length === 0 && game.state.pendingPlacements.length === 0;
  // Mobile chrome budget: HeatMeter + the empty-pending placeholder eat
  // ~60 px of vertical that the 11×11 board needs back to keep cells
  // tappable. Render each only when it carries info.
  const showHeatMeter = game.state.heat > 0 || game.state.overdrive || game.state.burnout;
  const showPendingStrip = game.state.pendingPlacements.length > 0;
  // Whether the on-screen human may act now. Bot-mode: only on the player's
  // turn. Hot-seat: either seat's turn, but not while the hand-off curtain is
  // up or the game is over.
  const canInteract = hotseat
    ? game.state.turn !== 'over' && !showHandoff
    : game.state.turn === 'player';
  // The rack belonging to whoever is acting (player in bot-mode; the active
  // seat in hot-seat).
  const activeRack = game.activePlayer.rack;
  // True when player should pick a tile (no selection, no pending, dict ready, not burned out, their turn).
  const wantsPick =
    canInteract &&
    !!dict &&
    !game.state.burnout &&
    !game.state.selectedRackTileId &&
    game.state.pendingPlacements.length === 0;

  const errorMessage = (() => {
    const e = game.state.lastError;
    if (!e) return null;
    if (e === 'DICT_LOADING') return t('wordcraft.error.dictLoading');
    if (e.startsWith('INVALID_WORD:')) return t('wordcraft.error.invalidWord', { word: e.slice('INVALID_WORD:'.length) });
    if (e === 'FIRST_MOVE_MUST_COVER_CENTER') return t('wordcraft.error.mustCoverCenter');
    if (e === 'FIRST_MOVE_TOO_SHORT') return t('wordcraft.error.tooShort');
    if (e === 'NOT_LINEAR') return t('wordcraft.error.notLinear');
    if (e === 'NOT_CONTIGUOUS') return t('wordcraft.error.notContiguous');
    if (e === 'DISCONNECTED') return t('wordcraft.error.disconnected');
    if (e === 'OUT_OF_BOUNDS') return t('wordcraft.error.outOfBounds');
    if (e === 'NO_TILES') return t('wordcraft.error.noTiles');
    if (e === 'BAG_TOO_SMALL_TO_SWAP') return t('wordcraft.error.bagTooSmallToSwap');
    return e;
  })();

  return (
    <div
      className={cn(
        // No-scroll viewport contract: fill exactly the small viewport height,
        // hide overflow, lay everything out as flex column. Game must FIT.
        'flex flex-col w-full h-svh overflow-hidden relative',
        'bg-neo-navy texture-halftone',
        isRTL && 'rtl',
      )}
    >
      {/* Backdrop spotlight echoes the brand purple from the mode tile */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[220px] bg-gradient-to-b from-neo-purple/20 via-neo-pink/8 to-transparent"
      />
      <Header />
      <WordCraftCelebration kind={celebration.kind} burstId={celebration.burstId} origin={celebration.origin} />
      <WordCraftLiveRegion
        pending={game.state.pendingPlacements}
        axis={axis}
        labels={{
          placed: (l, r, c) => t('wordcraft.live.placed', { letter: l, row: r, col: c }),
          recalled: (l) => t('wordcraft.live.recalled', { letter: l }),
          axisLocked: (a) => (a === 'h' ? t('wordcraft.live.axisAcrossLocked') : t('wordcraft.live.axisDownLocked')),
          axisUnlocked: t('wordcraft.live.axisUnlocked'),
        }}
      />

      <main className="flex-1 min-h-0 px-3 py-1 max-w-[820px] mx-auto w-full flex flex-col gap-1 relative">
        {/* Topbar: back · title · BETA · How to play · loading */}
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => router.push(`/${language}`)} className="shrink-0 h-8 px-2">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <span
            aria-hidden
            className="inline-flex items-center justify-center w-7 h-7 rounded-neo bg-neo-purple text-white border-2 border-black shadow-hard-sm rotate-[-4deg]"
          >
            <Layers className="w-4 h-4" />
          </span>
          <h1 className="text-lg font-neo-display font-black text-neo-white tracking-tight">
            {t('wordcraft.title')}
          </h1>
          <span className="px-1.5 py-0.5 text-[9px] font-neo-display font-black uppercase tracking-widest bg-neo-yellow text-neo-navy rounded border-2 border-black shadow-hard-sm rotate-[3deg]">
            BETA
          </span>
          <div className="flex-1" />
          <WordCraftTutor
            isRTL={isRTL}
            labels={{
              title: t('wordcraft.tutor.title'),
              step1: t('wordcraft.tutor.step1'),
              step2: t('wordcraft.tutor.step2'),
              step3: t('wordcraft.tutor.step3'),
              tipFirst: t('wordcraft.tutor.tipFirst'),
              tipScore: t('wordcraft.tutor.tipScore'),
              dismiss: t('wordcraft.tutor.dismiss'),
              show: t('wordcraft.tutor.show'),
            }}
          />
        </div>

        {!dict ? (
          <div className="flex items-center gap-2 px-2 py-1 bg-neo-navy-light border-2 border-black rounded-neo shrink-0">
            <PageLoader size="sm" />
            <span className="text-xs text-neo-white">{t('wordcraft.loadingDict')}</span>
          </div>
        ) : null}

        <WordCraftScoreboard
          player={game.state.player}
          bot={game.state.bot}
          turn={game.state.turn}
          tilesRemaining={game.tilesRemaining}
          labels={{
            you: hotseat ? t('wordcraft.player1') : t('wordcraft.you'),
            bot: hotseat ? t('wordcraft.player2') : t('wordcraft.bot'),
            yourTurn: hotseat ? t('wordcraft.player1Turn') : t('wordcraft.yourTurn'),
            botTurn: hotseat ? t('wordcraft.player2Turn') : t('wordcraft.botTurn'),
            gameOver: t('wordcraft.gameOver'),
            bagRemaining: t('wordcraft.bagRemaining'),
          }}
        />

        {territoryEnabled ? (
          <WordCraftTerritoryStrip
            playerCount={countClaimed(game.state.board, 'player')}
            botCount={countClaimed(game.state.board, 'bot')}
            labels={{
              territoryLabel: t('wordcraft.territory.label'),
              yourTerritory: t('wordcraft.territory.yours'),
              botTerritory: t('wordcraft.territory.bots'),
              endgameBonusHint: t('wordcraft.territory.endgameHint'),
            }}
          />
        ) : null}

        {showHeatMeter ? (
          <HeatMeter
            heat={game.state.heat}
            overdrive={game.state.overdrive}
            burnout={game.state.burnout}
            label={t('wordcraft.heatLabel')}
          />
        ) : null}

        {/* Board fills the remaining flex space. Container-query sizing
            (`100cqmin` on a `container-type: size` parent) gives the largest
            square that fits both axes — beats `aspect-square h-full
            max-w-full` which is height-bound and wastes 100–140 px on tall
            portrait phones after chrome compression. */}
        <div
          className="flex-1 min-h-0 flex items-center justify-center"
          style={{ containerType: 'size' }}
        >
          <div className="relative aspect-square" style={{ width: '100cqmin', height: '100cqmin' }}>
            <WordCraftBoardSection
              board={game.state.board}
              pending={game.state.pendingPlacements}
              selectedRackTile={game.state.selectedRackTileId ? game.activePlayer.rack.find((t) => t.id === game.state.selectedRackTileId) ?? null : null}
              onCellTap={(cell) => {
                // Visualize tap-to-place: ghost tile flies from rack to cell.
                // Cures the "two-tap feels indirect" pain by showing motion.
                const selId = game.state.selectedRackTileId;
                const sel = selId ? game.activePlayer.rack.find((t) => t.id === selId) : null;
                if (sel) {
                  const fromEl = document.querySelector(`[data-rack-tile-id="${selId}"]`);
                  const toEl = document.querySelector(`[data-board-cell="${cell.row},${cell.col}"]`);
                  juice.arcTilePlace(fromEl, toEl, sel.letter, sel.value);
                }
                inputCountsRef.current.tap += 1;
                game.placeOnBoard(cell.row, cell.col);
              }}
              onCellDragOver={() => {}}
              onCellDrop={() => {}}
              onRecallPending={recallFromBoard}
              onSceneCtx={setSceneCtx}
              isDisabled={!canInteract}
              isFirstMove={isFirstMove}
              dragHoverCell={drag?.active ? drag.hoverCell : null}
              locale={locale}
              reticle={reticle}
              zoomLabel={t('wordcraft.zoomLabel')}
              zoomResetLabel={t('wordcraft.zoomReset')}
              premiumLabels={premiumLabels}
            />
            {scoreFloat ? (
              <ScoreFloat
                key={scoreFloat.key}
                score={scoreFloat.score}
                overdrive={scoreFloat.overdrive}
                isBingo={scoreFloat.isBingo}
                encouragement={scoreFloat.encouragement}
              />
            ) : null}
            <WordCraftHeatStamp beat={heatBeat} onDone={() => setHeatBeat(null)} />
            <WordCraftScorePreviewBadge board={game.state.board} placements={game.state.pendingPlacements} />
          </div>
        </div>

        {game.state.burnout ? (
          <div className="px-3 py-1 bg-neo-red/20 border-2 border-neo-red text-neo-red text-xs rounded-neo text-center font-neo-display shrink-0">
            {t('wordcraft.burnout')}
          </div>
        ) : null}

        {showPendingStrip ? (
          <WordCraftPendingStrip
            pending={game.state.pendingPlacements}
            axis={axis}
            onRecallOne={recallFromStrip}
            onRecallAll={recallAllPending}
            locale={locale}
            labels={{
              headerEmpty: t('wordcraft.pending.empty'),
              recallAll: t('wordcraft.pending.recallAll'),
              recallOne: t('wordcraft.pending.recallOne'),
              axisHorizontal: t('wordcraft.axis.horizontal'),
              axisVertical: t('wordcraft.axis.vertical'),
              axisFlipAria: t('wordcraft.axis.flipAria'),
            }}
          />
        ) : null}

        <WordCraftRack
          tiles={activeRack}
          selectedId={game.state.selectedRackTileId}
          pendingIds={pendingIds}
          onSelect={game.selectRackTile}
          onTileDragStart={(tile, e) => beginTileDrag(tile.id, tile.letter, tile.value, e)}
          consumeDropFlag={consumeDropFlag}
          onFastTap={handleFastTap}
          axisLocked={game.state.pendingPlacements.length >= 1}
          draggingTileId={drag?.active ? drag.tileId : null}
          disabled={!canInteract || !dict || game.state.burnout}
          ariaLabel={t('wordcraft.yourRack')}
          hintPick={wantsPick && isFirstMove}
          locale={locale}
        />

        <WordCraftControls
          canSubmit={game.state.pendingPlacements.length > 0 && !!dict && canInteract && !game.state.burnout}
          canRecall={game.state.pendingPlacements.length > 0}
          canSwap={activeRack.length > 0 && canInteract && !game.state.burnout}
          disabled={!canInteract || !dict || game.state.burnout}
          onSubmit={submitMoveWithTelemetry}
          onRecall={recallAllPending}
          onPass={() => {
            playPassSound();
            game.pass();
          }}
          onSwap={() => {
            const toReturn = activeRack.filter((tile) => !pendingIds.has(tile.id));
            playSwapSound();
            game.swap(toReturn);
          }}
          labels={{
            submit: t('wordcraft.submit'),
            recall: t('wordcraft.recall'),
            pass: t('wordcraft.pass'),
            swap: t('wordcraft.swap'),
          }}
        />

      </main>

      {/* Pass-and-play hand-off curtain — hides the outgoing seat's rack from
          the incoming human until they tap to start their turn. */}
      {hotseat && showHandoff ? (
        <WordCraftHandoff
          incomingName={game.state.turn === 'bot' ? t('wordcraft.player2') : t('wordcraft.player1')}
          onReady={() => setShowHandoff(false)}
          labels={{
            passTo: t('wordcraft.handoff.passTo'),
            tapReady: t('wordcraft.handoff.tapReady'),
            start: t('wordcraft.handoff.start'),
          }}
        />
      ) : null}

      {/* Drag ghost — follows pointer over the whole viewport */}
      <WordCraftDragGhost drag={drag} locale={locale} />

      {/* Floating toast — error doesn't reflow the layout, just overlays. */}
      {errorMessage ? (
        <div
          role="alert"
          className="absolute left-1/2 -translate-x-1/2 top-[calc(72px+8px)] z-40 max-w-[90%] px-3 py-2 bg-neo-red/95 border-2 border-black text-white text-sm rounded-neo shadow-hard-lg font-neo-body"
        >
          {errorMessage}
        </div>
      ) : null}

      {/* Capture toast — celebrates flipping opponent cells. Auto-dismiss 1.8s. */}
      {captureToast ? (
        <div
          key={captureToast.key}
          role="status"
          className={cn(
            'absolute left-1/2 -translate-x-1/2 top-[calc(72px+40px)] z-40 px-3 py-1.5 border-neo-thick border-black rounded-neo shadow-hard-lg font-neo-display font-black text-sm uppercase tracking-wider animate-neo-pop',
            captureToast.by === 'player' ? 'bg-neo-cyan text-neo-navy' : 'bg-neo-pink text-neo-white',
          )}
        >
          {captureToast.by === 'player'
            ? t('wordcraft.territory.captureYou', { count: captureToast.count, bonus: captureToast.bonus })
            : t('wordcraft.territory.captureBot', { count: captureToast.count, bonus: captureToast.bonus })}
        </div>
      ) : null}

      {/* Game-over banner: also floating, doesn't push layout */}
      {game.state.turn === 'over' ? (
        <WordCraftGameOverScene
          t={t}
          playerScore={game.state.player.score}
          botScore={game.state.bot.score}
          playerName={hotseat ? t('wordcraft.player1') : undefined}
          botName={hotseat ? t('wordcraft.player2') : undefined}
          isNewBest={newBest}
        />
      ) : null}
    </div>
  );
}
