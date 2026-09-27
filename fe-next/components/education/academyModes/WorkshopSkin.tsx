'use client';

/**
 * Workshop skin for the stock Word Craft game view (components/word-craft is
 * shared with the public mode, so it is re-dressed here instead of forked).
 *
 * A scoped, unlayered stylesheet under `[data-academy-workshop]`: unlayered
 * rules beat Tailwind v4's layered utilities without `!important`, and the
 * selectors key on the data attributes the board already renders
 * (data-board-cell / data-tile-state / data-claim / data-wc-board). The
 * game's own cyan-vs-pink ownership stays legible: ivory tiles are tinted and
 * banded in the owner's colour, because in Conquest that colour IS the score.
 * There are no bonus squares in Conquest, so none are painted.
 *
 * Lesson-word tiles: after a player move that builds a lesson word, the cells
 * that turned "placed" in that move get `data-wk-gold` (see markNewGoldCells)
 * and glow gold for the rest of the match.
 */

import { useEffect, type RefObject } from 'react';
import { motion } from 'framer-motion';
import { RIVAL_ART } from '@/lib/education/academyReactions';
import { buildableCells } from '@/lib/education/workshopBoardHints';

const S = '[data-academy-workshop]';
const CELL = `${S} [data-board-cell]`;

function css(reduce: boolean): string {
  return `
${S} div:has(> [data-wc-main]) { background: transparent; }
${S} div:has(> [data-wc-main]) > div[aria-hidden]:first-child { display: none; }
${S} [data-wc-board] {
  padding: 10px; gap: 3px; border: 0; border-radius: 16px;
  background:
    radial-gradient(ellipse at 50% 40%, rgba(255,190,110,0.18), transparent 70%),
    repeating-linear-gradient(90deg, #6e421f 0 9px, #7a4a23 9px 15px, #663d1d 15px 22px);
  box-shadow: 0 0 0 3px #000, 0 0 0 8px #a86b32, 0 0 0 11px #000, 9px 11px 0 11px #000, 0 0 70px 14px rgba(255,160,60,0.35);
}
${CELL} { border-radius: 6px; font-family: var(--font-fredoka, inherit); }
/* Empty squares = carved sockets in a wooden workbench: grain, a worn centre, a bevelled lip. */
${CELL}[data-tile-state="empty"] {
  background:
    radial-gradient(ellipse at 50% 30%, rgba(255,205,140,0.16), transparent 62%),
    repeating-linear-gradient(97deg, transparent 0 4px, rgba(0,0,0,0.16) 4px 5px, rgba(255,214,160,0.06) 5px 8px, transparent 8px 11px),
    linear-gradient(180deg, #5b3a1d 0%, #3d2611 100%);
  box-shadow: inset 0 3px 5px rgba(0,0,0,0.72), inset 0 -2px 0 rgba(255,214,160,0.2), inset 0 0 0 1px rgba(0,0,0,0.4);
}
${CELL}[data-tile-state="empty"]::before {
  content: ''; position: absolute; left: 50%; top: 50%; width: 16%; height: 16%;
  transform: translate(-50%, -50%) rotate(45deg); border-radius: 2px; pointer-events: none;
  background: linear-gradient(135deg, rgba(0,0,0,0.45), rgba(255,214,160,0.28));
}
/* Build here: empty squares touching a tile glow warm (JS marks them data-wk-near), with a slow shimmer. */
${CELL}[data-tile-state="empty"][data-wk-near] {
  background:
    radial-gradient(circle at 50% 50%, rgba(255,214,120,0.34), rgba(255,170,60,0.1) 58%, transparent 78%),
    repeating-linear-gradient(97deg, transparent 0 4px, rgba(0,0,0,0.14) 4px 5px, rgba(255,214,160,0.07) 5px 8px, transparent 8px 11px),
    linear-gradient(180deg, #6d4622 0%, #472b12 100%);
  box-shadow: inset 0 0 0 2px rgba(255,205,110,0.6), inset 0 3px 5px rgba(0,0,0,0.5);
}
${CELL}[data-tile-state="empty"][data-wk-near]::before { width: 22%; height: 22%; background: rgba(255,226,160,0.8); box-shadow: 0 0 8px rgba(255,200,90,0.9); }
${CELL}[data-tile-state="empty"][data-wk-near]::after {
  content: ''; position: absolute; inset: -2px; border-radius: 8px; pointer-events: none;
  box-shadow: 0 0 12px 2px rgba(255,190,70,0.75); opacity: 0.35;
  ${reduce ? '' : 'animation: wk-near 2.8s ease-in-out infinite;'}
}
${CELL}[data-wk-near="1"]::after { animation-delay: -0.55s; }
${CELL}[data-wk-near="2"]::after { animation-delay: -1.1s; }
${CELL}[data-wk-near="3"]::after { animation-delay: -1.65s; }
${CELL}[data-wk-near="4"]::after { animation-delay: -2.2s; }
${CELL}[data-tile-state="empty"][data-cell-invite="true"] {
  background: radial-gradient(circle at 50% 40%, #4d5a1a, #2c3310);
  box-shadow: inset 0 0 0 2px rgba(191,255,0,0.55), inset 0 3px 5px rgba(0,0,0,0.6);
}
${CELL}[data-tile-state="empty"][data-drag-target="true"] { background: #1f5e66; box-shadow: inset 0 0 0 3px #00ffff; }
${CELL}[data-tile-state="placed"], ${CELL}[data-tile-state="pending"] {
  color: #17110a;
  background: linear-gradient(180deg, #fffcf2 0%, #f3e4c4 100%);
  box-shadow: inset 0 0 0 2px #000, inset 0 -4px 0 rgba(120,76,28,0.35), 0 2px 0 #000;
}
${CELL}[data-claim="player"] { background: linear-gradient(180deg, #effeff 0%, #b9f4fb 100%); }
${CELL}[data-claim="bot"] { background: linear-gradient(180deg, #fff0f7 0%, #ffc4de 100%); }
${CELL}[data-claim]::after {
  content: ''; position: absolute; left: 2px; right: 2px; bottom: 2px; height: 22%;
  border-top: 2px solid #000; border-radius: 0 0 4px 4px; pointer-events: none;
}
${CELL}[data-claim="player"]::after { background: #00ffff; }
${CELL}[data-claim="bot"]::after { background: #ff1493; }
${CELL}[data-tile-state="pending"] {
  background: linear-gradient(180deg, #fbffe6 0%, #e4ff8c 100%);
  box-shadow: inset 0 0 0 2px #000, 0 0 0 2px #bfff00, 0 0 14px 2px rgba(191,255,0,0.7), 0 3px 0 #000;
  ${reduce ? '' : 'animation: wk-pop 280ms cubic-bezier(.3,1.6,.5,1) both;'}
}
${CELL}[data-wk-gold] {
  background: linear-gradient(180deg, #fff6c4 0%, #ffd23a 100%);
  box-shadow: inset 0 0 0 2px #000, 0 0 0 2px #ffe135, 0 0 16px 4px rgba(255,214,0,0.85);
  z-index: 5;
  ${reduce ? '' : 'animation: wk-gold 1.8s ease-in-out infinite;'}
}
${CELL} .wc-tile-glyph { font-weight: 900; text-shadow: 0 1px 0 rgba(255,255,255,0.6); position: relative; z-index: 1; }
/* Scoreboard, icon-first: two portraits, two big numbers, one tug-of-war rope. */
${S} div:has(> [data-score-value="bot"]) > :first-child {
  width: 52px !important; height: 52px !important; flex-shrink: 0; border-radius: 9999px; overflow: hidden;
  background: #2a2a4e url(${RIVAL_ART.idle}) 50% 8% / 150% no-repeat;
  border: 3px solid #ff1493; opacity: 1; filter: none; box-shadow: 3px 3px 0 #000;
}
${S} div:has(> [data-score-value="bot"]) > :first-child > * { visibility: hidden; }
${S} div:has(> [data-score-value="player"]) > :first-child {
  width: 52px !important; height: 52px !important; flex-shrink: 0; border-radius: 9999px;
  box-shadow: 0 0 0 3px #ffe135, 3px 3px 0 3px #000;
}
${S} div:has(> [data-score-value]) > span:last-child { display: none; }
${S} div:has(> div > [data-score-value="player"]) > div:nth-child(2) { display: none; }
${S} [data-score-value] { font-size: 46px; text-shadow: 3px 3px 0 #000; }
${S} [role="img"]:has(> .wc-bar-fill) {
  height: 20px; overflow: visible; border: 3px solid #000; border-radius: 9999px;
  background: linear-gradient(180deg, #ff5ab0, #ff1493 60%, #c20f72); box-shadow: 0 4px 0 #000;
}
${S} .wc-bar-fill {
  border-radius: 0; border-start-start-radius: 9999px; border-end-start-radius: 9999px; border-inline-end: 0 !important;
  background: linear-gradient(180deg, #8affff, #00ffff 60%, #00b8c9);
}
${S} .wc-bar-fill::after {
  content: ''; position: absolute; inset-inline-end: -13px; top: 50%; width: 26px; height: 26px; margin-top: -13px;
  border-radius: 9999px; border: 3px solid #000; box-shadow: 2px 2px 0 #000;
  background: radial-gradient(circle at 35% 30%, #fff6c4, #ffd23a 55%, #c98a00);
}
${S} [role="img"]:has(> .wc-bar-fill) > span[aria-hidden] { display: none; }
${S} span:has(> svg.lucide-crown) { display: none; }
${S} span:has(> [data-wc-sack]) > .font-neo-body { display: none; }
${S} [data-scoreboard-card] { font-size: 12px; }

/* Rack: seven thumb-size ivory tiles on a wooden tray — all visible at 390px, real bevel + drop. */
${S} [role="toolbar"]:has([data-rack-tile-id]) {
  min-height: 0 !important; overflow: visible; border: 3px solid #000; border-radius: 16px;
  background:
    linear-gradient(180deg, rgba(255,210,150,0.25), transparent 30%),
    repeating-linear-gradient(90deg, #7a4a23 0 11px, #6e421f 11px 19px, #845027 19px 27px);
  box-shadow: inset 0 -6px 0 rgba(0,0,0,0.35), 0 5px 0 #000;
}
${S} [role="toolbar"] > div:has(> [data-rack-tile-id]) { gap: 5px; padding: 10px 8px 14px; width: 100%; justify-content: center; }
${S} [data-rack-tile-id] {
  width: min(calc((min(100vw, 820px) - 76px) / 7), 68px); height: auto; aspect-ratio: 5 / 6;
  border: 2.5px solid #000; border-radius: 11px; color: #17110a;
  background: linear-gradient(180deg, #fffdf4 0%, #f6e8c8 55%, #ead3a2 100%);
  box-shadow: inset 0 2px 0 #fff, inset 0 -6px 0 #c79a5a, 0 4px 0 #000, 0 8px 12px rgba(0,0,0,0.45);
}
${S} [data-rack-tile-id][aria-pressed="true"] {
  background: linear-gradient(180deg, #f4ffc9 0%, #d8ff5c 60%, #a6d900 100%);
  box-shadow: inset 0 2px 0 #fff, inset 0 -6px 0 #7fa300, 0 6px 0 #000, 0 0 18px rgba(191,255,0,0.8);
}
${S} [data-rack-tile-id] .wc-tile-glyph { font-size: clamp(1.6rem, 7.4vw, 2.6rem); line-height: 1; margin-top: -4px; }
${S} [data-rack-tile-id] > span.absolute.bottom-1 { top: 4px; bottom: auto; inset-inline-end: 5px; font-size: 10px; line-height: 1; opacity: 0.7; }
${S} [data-rack-tile-id] > span[aria-hidden]:first-child:not(.text-neo-yellow) { display: none; }
@keyframes wk-pop { 0% { transform: scale(0.4) rotate(-10deg); } 60% { transform: scale(1.14) rotate(2deg); } 100% { transform: scale(1); } }
@keyframes wk-near { 0%, 100% { opacity: 0.25; } 50% { opacity: 0.95; } }
@keyframes wk-gold { 0%, 100% { filter: brightness(1); } 50% { filter: brightness(1.18); } }
`;
}

export function WorkshopBoardSkin({ reduce }: { reduce: boolean }) {
  // Rendered only after PLAY (client-side), so no SSR text-escaping concerns.
  return <style>{css(reduce)}</style>;
}

/**
 * Keeps `data-wk-near` on the empty cells a word can hook onto. Observes the
 * board's tile states (and remounts: dictionary load, play again), batched to
 * one frame. Only our own attribute is written, which the observer ignores.
 */
export function useBuildableMarks(rootRef: RefObject<HTMLElement | null>, active: boolean): void {
  useEffect(() => {
    const root = rootRef.current;
    if (!active || !root || typeof MutationObserver === 'undefined') return;
    let frame = 0;
    const apply = () => {
      frame = 0;
      // The zoom shell is also [data-wc-board]; the grid itself carries the size.
      const board = root.querySelector<HTMLElement>('[data-board-size]');
      if (!board) return;
      const cells = board.querySelectorAll<HTMLElement>('[data-board-cell]');
      const size = Number(board.getAttribute('data-board-size')) || Math.round(Math.sqrt(cells.length));
      const near = buildableCells(placedCellKeys(board), size);
      cells.forEach((el) => {
        const k = el.getAttribute('data-board-cell') ?? '';
        if (near.has(k)) {
          const [r, c] = k.split(',').map(Number);
          const v = String((r * 2 + c) % 5);
          if (el.getAttribute('data-wk-near') !== v) el.setAttribute('data-wk-near', v);
        } else if (el.hasAttribute('data-wk-near')) el.removeAttribute('data-wk-near');
      });
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(apply);
    };
    const obs = new MutationObserver(schedule);
    obs.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-tile-state'] });
    schedule();
    return () => {
      obs.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [rootRef, active]);
}

/** Keys ("r,c") of every committed tile currently on the board. */
export function placedCellKeys(root: ParentNode | null): Set<string> {
  const keys = new Set<string>();
  root?.querySelectorAll('[data-board-cell][data-tile-state="placed"]').forEach((el) => {
    const k = el.getAttribute('data-board-cell');
    if (k) keys.add(k);
  });
  return keys;
}

/**
 * Marks the cells that became placed since `before` as lesson-word gold and
 * returns their on-screen centres (for the particle burst).
 */
export function markNewGoldCells(root: ParentNode | null, before: Set<string>): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  root?.querySelectorAll<HTMLElement>('[data-board-cell][data-tile-state="placed"]').forEach((el) => {
    const k = el.getAttribute('data-board-cell');
    if (!k || before.has(k)) return;
    el.setAttribute('data-wk-gold', 'true');
    const r = el.getBoundingClientRect();
    out.push({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
  });
  return out;
}

/** One-shot gold sparks over freshly built lesson-word tiles. */
export function GoldSparks({ points, burstId }: { points: { x: number; y: number }[]; burstId: number }) {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[70]">
      {points.flatMap((p, pi) =>
        Array.from({ length: 6 }, (_, i) => {
          const a = (i / 6) * Math.PI * 2 + pi;
          return (
            <motion.span
              key={`${burstId}-${pi}-${i}`}
              className="absolute h-2.5 w-2.5 rounded-full bg-neo-yellow"
              style={{ left: p.x - 5, top: p.y - 5, boxShadow: '0 0 10px 3px rgba(255,214,0,0.9)' }}
              initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
              animate={{ x: Math.cos(a) * 46, y: Math.sin(a) * 46, scale: 0.2, opacity: 0 }}
              transition={{ duration: 0.75, ease: 'easeOut' }}
            />
          );
        }),
      )}
    </div>
  );
}
