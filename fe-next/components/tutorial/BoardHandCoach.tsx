'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { m } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import {
  DIRECTIONS_TUTORIAL_VERSION,
  hasSeenDirectionsTutorial,
  markDirectionsTutorialSeen,
} from '@/lib/tutorial/directionsTutorialStore';

export interface CoachCell {
  row: number;
  col: number;
}

export interface BoardHandCoachProps {
  /** The real board element. Cells are found by their data-row/data-col tags. */
  gridEl: HTMLElement | null;
  rows: number;
  cols: number;
  /**
   * A path the game already knows is a real word (single player supplies one via
   * useFirstPlayTutorial). Optional — the coach falls back to a fixed gesture.
   */
  path?: CoachCell[] | null;
  enabled?: boolean;
}

/** How long one full trace of the path takes, and how many times it repeats. */
const TRACE_SECONDS = 2.2;
const REPEAT_DELAY_SECONDS = 0.6;
const LOOPS = 3;

/**
 * Hard ceiling on how long the hand may stay on screen.
 *
 * The animation is finite, but a timer is what actually guarantees the coach
 * leaves: a player using the keyboard, or one who taps chrome instead of the
 * board, would otherwise never trigger the interaction-based dismissal. Replacing
 * a ten-second lockout with a permanent animation over the play area would be a
 * worse bug than the one being fixed.
 */
const MAX_VISIBLE_MS = (TRACE_SECONDS * LOOPS + REPEAT_DELAY_SECONDS * (LOOPS - 1)) * 1000 + 400;

/**
 * Pick what the hand should trace.
 *
 * A supplied path is always preferred — it is a real word on the real board.
 * Otherwise we trace a fixed corner shape: straight down, then DIAGONALLY back
 * up. The diagonal is the point — it is the one rule new players do not guess,
 * and a demo without one teaches nothing they wouldn't have tried anyway. The
 * shape fits any board at least 2×2.
 *
 * We deliberately do NOT solve the board for a demo word: that would pull in the
 * trie requirement (a depth-15 DFS without one hangs in production and in vitest)
 * to teach a gesture that needs no valid word at all.
 */
export function resolveCoachPath(
  path: CoachCell[] | null | undefined,
  rows: number,
  cols: number,
): CoachCell[] {
  if (path && path.length >= 2) return path;
  if (rows < 2 || cols < 2) return [];
  return [
    { row: 0, col: 0 },
    { row: 1, col: 0 },
    { row: 0, col: 1 },
  ];
}

interface Point {
  x: number;
  y: number;
}

/**
 * BoardHandCoach — an animated hand that traces a path across the REAL board.
 *
 * This replaces `DirectionsTutorialOverlay`, which taught the same lesson on a
 * separate 3×3 mock board inside a modal that froze the game clock and disabled
 * its own "continue" button for ten seconds. New players were literally forbidden
 * from proceeding, and what they were shown was not the board they were about to
 * play. This shows the lesson in place, blocks nothing, and yields the instant a
 * player touches a tile.
 */
export default function BoardHandCoach({
  gridEl,
  rows,
  cols,
  path,
  enabled = true,
}: BoardHandCoachProps) {
  const { t, dir } = useLanguage();
  const reduced = usePrefersReducedMotion();
  const [visible, setVisible] = useState(false);
  // The cells to trace, frozen at show time. `path` is live-bound to the board's
  // highlightedPath, which also carries keyboard trails and reveal hints — left
  // reactive, a hand mid-trace would jump to whatever the player just typed.
  const [cells, setCells] = useState<CoachCell[] | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const centersRef = useRef<Map<string, Point>>(new Map());
  const [measureTick, setMeasureTick] = useState(0);

  // Read `path` through a ref so the show-once effect below depends only on
  // `enabled`/`gridEl`. Otherwise every highlightedPath change (each keyboard
  // trail, each hint) would re-run it.
  const pathRef = useRef(path);
  pathRef.current = path;

  // Decide once, on the client, whether this player has met the board before.
  // Persist at SHOW time rather than dismiss time — a reload before the player
  // dismisses would otherwise re-pop it forever (the player-style-modal lesson,
  // Class 1 in .claude/rules/60-recurring-pitfalls.md).
  useEffect(() => {
    if (!enabled || !gridEl) return;
    if (typeof window === 'undefined') return;
    let storage: Storage | null = null;
    try {
      storage = window.localStorage;
    } catch {
      return;
    }
    if (!storage) return;
    if (hasSeenDirectionsTutorial(DIRECTIONS_TUTORIAL_VERSION, storage)) return;
    markDirectionsTutorialSeen(DIRECTIONS_TUTORIAL_VERSION, storage);
    setCells(resolveCoachPath(pathRef.current, rows, cols));
    setVisible(true);
    // rows/cols are fixed for a given board; a re-run would hit the
    // already-seen guard above and no-op anyway.
  }, [enabled, gridEl, rows, cols]);

  // Same measurement GridConnectorOverlay uses: cell centres relative to the
  // grid, cached, re-read only on resize. No per-frame layout reads.
  const measure = useCallback(() => {
    if (!gridEl) return;
    const gridRect = gridEl.getBoundingClientRect();
    setSize({ w: gridEl.offsetWidth, h: gridEl.offsetHeight });
    const map = new Map<string, Point>();
    gridEl.querySelectorAll<HTMLElement>('[data-row][data-col]').forEach((el) => {
      const r = el.getBoundingClientRect();
      map.set(`${el.dataset.row}-${el.dataset.col}`, {
        x: r.left - gridRect.left + r.width / 2,
        y: r.top - gridRect.top + r.height / 2,
      });
    });
    centersRef.current = map;
    setMeasureTick((n) => n + 1);
  }, [gridEl]);

  useEffect(() => {
    if (!visible || !gridEl) return;
    measure();
    const raf = requestAnimationFrame(measure);
    const ro = new ResizeObserver(measure);
    ro.observe(gridEl);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [visible, gridEl, measure]);

  // The player taking over is the success case, not an interruption. Listen on
  // the window (not just the board) and include the keyboard, so a desktop
  // player who types instead of dragging also dismisses it.
  useEffect(() => {
    if (!visible) return;
    const dismiss = () => setVisible(false);
    window.addEventListener('pointerdown', dismiss);
    window.addEventListener('touchstart', dismiss);
    window.addEventListener('keydown', dismiss);
    // ...and a hard ceiling, because a player may do none of those things.
    const timer = window.setTimeout(dismiss, MAX_VISIBLE_MS);
    return () => {
      window.removeEventListener('pointerdown', dismiss);
      window.removeEventListener('touchstart', dismiss);
      window.removeEventListener('keydown', dismiss);
      window.clearTimeout(timer);
    };
  }, [visible]);

  const points = useMemo<Point[]>(() => {
    void measureTick; // explicit invalidation signal for the centres ref
    const centers = centersRef.current;
    return (cells ?? [])
      .map((c) => centers.get(`${c.row}-${c.col}`))
      .filter((p): p is Point => p != null);
  }, [cells, measureTick]);

  // Guard on `cells`, not on the measured `points`: cells are decided
  // deterministically at show time, whereas an unmeasured board would make this
  // vanish silently and look identical to "nothing to teach" (Class 4).
  if (!visible || !gridEl || !cells || cells.length < 2) return null;

  const polyline = points.map((p) => `${p.x},${p.y}`).join(' ');
  const start = points[0] ?? { x: 0, y: 0 };
  // Finite. See MAX_VISIBLE_MS — the coach demonstrates and then gets out.
  const loop = reduced ? 0 : LOOPS - 1;

  return (
    <div
      data-testid="board-hand-coach"
      // Demonstrates, never blocks: every pointer event belongs to the board.
      className="pointer-events-none absolute inset-0 z-30"
      aria-hidden
      dir={dir}
    >
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox={`0 0 ${size.w || 1} ${size.h || 1}`}
        preserveAspectRatio="none"
      >
        {polyline && (
          <polyline
            points={polyline}
            fill="none"
            stroke="#BFFF00"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.55"
            strokeDasharray="6 8"
          />
        )}
      </svg>

      {/* The hand itself — travels through each cell centre in turn. */}
      <m.div
        className="absolute"
        style={{ left: 0, top: 0 }}
        initial={{ x: start.x, y: start.y, opacity: 0 }}
        animate={{
          x: points.map((p) => p.x),
          y: points.map((p) => p.y),
          opacity: [0, 1, 1, 1],
        }}
        transition={{
          duration: reduced ? 0 : TRACE_SECONDS,
          repeat: loop,
          repeatDelay: REPEAT_DELAY_SECONDS,
          repeatType: 'loop',
          ease: 'easeInOut',
          times: points.length > 1 ? points.map((_, i) => i / (points.length - 1)) : undefined,
        }}
        onAnimationComplete={() => {
          if (reduced) setVisible(false);
        }}
      >
        <HandGlyph />
      </m.div>

      {/* One line of instruction. Not a lesson, a label.
          Kept INSIDE the board box: this is the coach's only words, and a
          negative offset would put it at the mercy of whatever the parent
          layout does with overflow. */}
      <div className="absolute inset-x-0 bottom-1 flex justify-center">
        <span className="rounded-neo border-2 border-black bg-neo-navy/90 px-3 py-1 font-neo-body text-xs font-bold text-neo-white shadow-hard-sm">
          {t('boardCoach.dragToConnect')}
        </span>
      </div>
    </div>
  );
}

/** Small pointing hand, anchored so the fingertip sits on the traced point. */
function HandGlyph() {
  return (
    <svg
      width="34"
      height="42"
      viewBox="0 0 34 42"
      className="-translate-x-1 -translate-y-1 drop-shadow-[2px_2px_0_rgba(0,0,0,0.6)]"
    >
      <circle cx="8" cy="7" r="7" fill="#BFFF00" opacity="0.35" />
      <path
        d="M8 6c0-2 3-2 3 0v9l5-2c2-.7 3.4 1.4 2.4 3l-4.6 7c-1.2 1.8-3 3-5.6 3H6c-2.6 0-4.4-1.6-5-4L0 17c-.5-2 2.2-3.2 3.2-1.3L5 19V6z"
        transform="translate(6 6)"
        fill="#FFFEF0"
        stroke="#000"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
