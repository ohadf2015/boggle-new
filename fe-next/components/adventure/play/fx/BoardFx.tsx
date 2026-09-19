'use client';

/**
 * Board wrapper + the word-hit juice layer.
 *  - Landed word: tiles burst, letters fly into the target (enemy / score meter), tiered
 *    damage number + praise banner on impact, target recoil, screen shake scaled to damage.
 *  - Rejected word: the traced tiles wobble red with a short reason.
 *  - Hint: the hinted tiles glow and pulse until the word is found.
 * Everything finishes within 1.2s so play never stalls.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import type { HitEvent } from '../events';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { cn } from '@/lib/utils';
import { Lightbulb } from 'lucide-react';
import { bannerKey, failReasonKey, hitPower, hitTier, impactLook, shakePx } from './hitTier';
import type { Cell } from './hintPath';
import WordCast, { type Box, type CastData } from './WordCast';
import { castRow, castTiming, recoilKeyframes } from './castPath';
import { createPortal } from 'react-dom';
import HitMark, { type HitMarkData } from './HitMark';
import { markSpot } from './markSpot';

interface Props {
  children: ReactNode;
  lastHit: HitEvent | null;
  /** Tiles the last hit used (traced or solved), in order. */
  hitPath?: Cell[];
  /** Shake when the board is hit by an enemy effect. */
  shaking: boolean;
  /** Where letters fly: the stage slot (a `[data-adv-hit-target]` inside it wins). */
  targetRef?: RefObject<HTMLElement | null>;
  /** The whole level screen — shaken on impact. */
  screenRef?: RefObject<HTMLElement | null>;
  /** Enemy/boss HP (null on non-combat levels). 0 at impact → K.O. banner. */
  targetHp?: number | null;
  /** Tiles to glow for the active hint. */
  hintCells?: Cell[];
  /** False once the level stops (result / draft): the last-hit sticker goes. */
  active?: boolean;
}

const TOTAL_MS = 1200;
/** A 6+ letter word longer than every earlier one this level earns the longest-word ribbon. */
const BEST_MIN = 6;
const FAIL_MS = 900;
const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function tileBox(root: HTMLElement | null, { row, col }: Cell): Box | null {
  const el = root?.querySelector<HTMLElement>(`[data-row="${row}"][data-col="${col}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height };
}

/** Arrow segments between consecutive hint tiles, trimmed off the letters so they stay readable. */
function hintSegments(boxes: Box[]) {
  return boxes.slice(1).map((b, i) => {
    const a = boxes[i];
    const x0 = a.x + a.w / 2, y0 = a.y + a.h / 2, x1 = b.x + b.w / 2, y1 = b.y + b.h / 2;
    const d = Math.hypot(x1 - x0, y1 - y0) || 1;
    const ux = (x1 - x0) / d, uy = (y1 - y0) / d;
    const r = a.w * 0.28;
    return { x1: x0 + ux * r, y1: y0 + uy * r, x2: x1 - ux * (r + 6), y2: y1 - uy * (r + 6) };
  });
}

/** The hit target's sprite (the img itself or the first img inside it), for the impact afterimage. */
function foeSprite(el: HTMLElement | null): CastData['foe'] {
  const img = el instanceof HTMLImageElement ? el : el?.querySelector('img') ?? null;
  const src = img?.currentSrc || img?.src;
  if (!img || !src) return null;
  const r = img.getBoundingClientRect();
  if (r.width < 8 || r.height < 8) return null;
  const cs = getComputedStyle(img);
  return { box: { x: r.left, y: r.top, w: r.width, h: r.height }, src, fit: cs.objectFit || 'contain', pos: cs.objectPosition || '50% 50%' };
}

function targetEl(ref: RefObject<HTMLElement | null> | undefined, combat: boolean): HTMLElement | null {
  const slot = ref?.current ?? null;
  // An explicit marker wins; on combat levels the enemy/boss portrait; else the stage itself.
  return slot?.querySelector<HTMLElement>('[data-adv-hit-target]')
    ?? (combat ? slot?.querySelector<HTMLElement>('[data-testid="enemy-stage"] img') ?? slot?.querySelector<HTMLElement>('img') : null)
    ?? slot;
}

export default function BoardFx({ children, lastHit, hitPath = [], shaking, targetRef, screenRef, targetHp = null, hintCells = [], active = true }: Props) {
  const { t } = useLanguageSafe();
  const sfx = useSoundEffects();
  const boardRef = useRef<HTMLDivElement>(null);
  const [cast, setCast] = useState<CastData | null>(null);
  const [impacted, setImpacted] = useState(false);
  const [fail, setFail] = useState<{ id: number; boxes: Box[]; reason: string } | null>(null);
  const [hintBoxes, setHintBoxes] = useState<Box[]>([]);
  const [mark, setMark] = useState<HitMarkData | null>(null);
  const hpRef = useRef(targetHp);
  hpRef.current = targetHp;
  const seen = useRef<number | null>(null);
  const pathRef = useRef(hitPath);
  pathRef.current = hitPath;
  const bestLen = useRef(0);

  /** Tile boxes relative to the board wrapper (for in-board overlays). */
  const localBoxes = useCallback((cells: Cell[]): Box[] => {
    const root = boardRef.current;
    if (!root) return [];
    const o = root.getBoundingClientRect();
    return cells.map((c) => tileBox(root, c)).filter((b): b is Box => !!b).map((b) => ({ ...b, x: b.x - o.left, y: b.y - o.top }));
  }, []);

  const impact = useCallback((data: CastData) => {
    setImpacted(true);
    const ko = data.combat && hpRef.current === 0;
    if (ko) setCast((c) => (c && c.id === data.id ? { ...c, ko: true, bannerKey: bannerKey(data.tier, '', true) } : c));
    // The hit stays stamped on the target until the next word lands.
    const tRect = targetEl(targetRef, data.combat)?.getBoundingClientRect();
    setMark({
      id: data.id, pts: data.pts, tier: data.tier, combat: data.combat,
      bannerKey: ko ? bannerKey(data.tier, '', true) : data.bannerKey,
      spot: tRect ? markSpot(tRect, window.innerWidth) : { x: data.target.x, y: data.target.y + 30 },
    });
    if (data.combat) sfx.playBossHitSound?.();
    if (data.tier === 'big') sfx.playLongWordBonusSound?.();
    if (data.tier === 'crit' || ko) sfx.playLegendaryWordSound?.();
    if (reducedMotion()) return;
    const look = impactLook(data.power, data.tier);
    const amp = shakePx(data.pts) * (1 + data.power * 0.6);
    screenRef?.current?.animate?.(
      [0, amp, -amp, amp * 0.6, -amp * 0.4, 0].map((x, i) => ({ transform: `translate(${x}px, ${i % 2 ? -x * 0.4 : x * 0.3}px)` })),
      { duration: 200 + Math.round(data.power * 140), easing: 'ease-out' },
    );
    // Hit-flash + knockback, then a hurt pulse and a slow wobbling settle that lasts the whole decay.
    const recoil = recoilKeyframes(data.knock, look.knockPx, data.power);
    targetEl(targetRef, data.combat)?.animate?.(recoil.frames, { duration: recoil.duration, easing: 'ease-out' });
  }, [sfx, screenRef, targetRef]);

  // React to each new hit exactly once.
  useLayoutEffect(() => {
    if (!lastHit || seen.current === lastHit.id) return;
    seen.current = lastHit.id;
    const cells = pathRef.current;
    if (lastHit.result !== 'ok') {
      setFail({ id: lastHit.id, boxes: localBoxes(cells), reason: t(failReasonKey(lastHit.result) ?? '') });
      return;
    }
    const tEl = targetEl(targetRef, hpRef.current !== null);
    const tr = tEl?.getBoundingClientRect();
    const target = tr ? { x: tr.left + tr.width / 2, y: tr.top + tr.height / 2 } : { x: window.innerWidth / 2, y: 120 };
    const chars = Array.from(lastHit.word.toUpperCase());
    const boxes = cells.map((c, i) => ({ ch: chars[i] ?? '', box: tileBox(boardRef.current, c) }))
      .filter((l): l is { ch: string; box: Box } => !!l.box);
    // The letters snap into one word hanging just above the board (room for the praise bubble
    // above it, clear of the foe's HP readout), then bolts of it fly into the target.
    const boardTop = boardRef.current?.getBoundingClientRect().top ?? target.y + 120;
    const tileW = boxes[0]?.box.w ?? 60;
    const rowSize = castRow(boxes.length, tileW, window.innerWidth, 0)[0]?.size ?? tileW;
    const rowY = Math.round(Math.max((boardTop + target.y) / 2 + 10, boardTop - rowSize / 2 - 8));
    const row = castRow(boxes.length, tileW, window.innerWidth, rowY,
      getComputedStyle(boardRef.current ?? document.documentElement).direction === 'rtl');
    const letters = boxes.map((l, i) => ({ ...l, slot: row[i] }));
    const { stagger, boltStagger, landMs, flightMs, impactMs, snapMs, diveAt, holdMs } = castTiming(letters.length, reducedMotion());
    const tier = hitTier(lastHit.word, lastHit.pts);
    const wordLen = chars.length;
    const best = wordLen >= BEST_MIN && wordLen > bestLen.current;
    bestLen.current = Math.max(bestLen.current, wordLen);
    // Knockback direction: from the word's centre on the board toward the target.
    const ox = boxes.reduce((a, l) => a + l.box.x + l.box.w / 2, 0) / Math.max(1, boxes.length) || target.x;
    const oy = boxes.reduce((a, l) => a + l.box.y + l.box.h / 2, 0) / Math.max(1, boxes.length) || target.y + 1;
    const dist = Math.hypot(target.x - ox, target.y - oy) || 1;
    const data: CastData = {
      id: lastHit.id, letters, target, tier, pts: lastHit.pts,
      power: hitPower(lastHit.word, lastHit.pts),
      knock: { kx: (target.x - ox) / dist, ky: (target.y - oy) / dist },
      bannerKey: lastHit.praiseKey ?? bannerKey(tier, lastHit.word, false),
      deed: !!lastHit.praiseKey,
      combat: hpRef.current !== null,
      impactMs: letters.length === 0 ? 0 : impactMs,
      stagger, boltStagger, landMs, flightMs, snapMs, diveAt, holdMs, best,
    };
    data.foe = foeSprite(tEl);
    setImpacted(false);
    setCast(data);
  }, [lastHit, localBoxes, t, targetRef]);

  // Impact, then clear — all inside TOTAL_MS.
  useEffect(() => {
    if (!cast) return;
    const a = setTimeout(() => impact(cast), cast.impactMs);
    const b = setTimeout(() => setCast((c) => (c?.id === cast.id ? null : c)), Math.min(TOTAL_MS, cast.holdMs + 40));
    return () => { clearTimeout(a); clearTimeout(b); };
    // Only a new cast (id) re-arms the timers; the K.O. banner swap must not.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cast?.id]);

  useEffect(() => { if (!active) setMark(null); }, [active]);

  useEffect(() => {
    if (!fail) return;
    const id = setTimeout(() => setFail((f) => (f?.id === fail.id ? null : f)), FAIL_MS);
    return () => clearTimeout(id);
  }, [fail]);

  // Hint glow follows the tiles through resizes / rotation.
  const hintKey = hintCells.map((c) => `${c.row}-${c.col}`).join('|');
  useEffect(() => {
    const cells = hintKey ? hintKey.split('|').map((k) => { const [row, col] = k.split('-').map(Number); return { row, col }; }) : [];
    // Viewport coords: the hint is portalled above the enemy-attack popups (AttackFlight z-58).
    const measure = () => setHintBoxes(cells.map((c) => tileBox(boardRef.current, c)).filter((b): b is Box => !!b));
    measure();
    if (!cells.length) return;
    const raf = requestAnimationFrame(measure);
    const late = setTimeout(measure, 450);
    const ro = typeof ResizeObserver === 'function' && boardRef.current ? new ResizeObserver(measure) : null;
    if (ro && boardRef.current) ro.observe(boardRef.current);
    window.addEventListener('resize', measure);
    return () => { cancelAnimationFrame(raf); clearTimeout(late); ro?.disconnect(); window.removeEventListener('resize', measure); };
  }, [hintKey]);

  return (
    <div ref={boardRef} className={cn('relative w-full max-w-[420px]', shaking && 'animate-[adv-shake_0.35s_ease-in-out]')}>
      {children}
      <div className="pointer-events-none absolute inset-0 z-20" aria-hidden>
        {fail?.boxes.map((b, i) => (
          <span key={`${fail.id}-${i}`} className="adv-fail-tile" style={{ left: b.x, top: b.y, width: b.w, height: b.h }} />
        ))}
      </div>
      {fail && fail.reason && (
        <div key={fail.id} role="status"
          className="adv-fail-chip pointer-events-none absolute left-1/2 -top-3 z-30 -translate-x-1/2 whitespace-nowrap rounded-lg border-[3px] border-black bg-[#ff3b5c] px-3 py-1 font-neo-display text-base font-bold text-black shadow-[3px_3px_0_#000]">
          {fail.reason}
        </div>
      )}
      {hintBoxes.length > 0 && typeof document !== 'undefined' && createPortal(
        <div className="pointer-events-none fixed inset-0 z-[62]" aria-hidden data-testid="adv-hint-layer">
          {/* Gold dashed "marching" rings + a bulb on the first tile + an arrow to the next:
              never the pink ring + numbered badge a player's own selection uses. */}
          {hintBoxes.length > 1 && (
            <svg className="adv-hint-arrow" data-testid="adv-hint-arrow" width="100%" height="100%" style={{ position: 'fixed', inset: 0, overflow: 'visible' }}>
              <defs>
                <marker id="adv-hint-head" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
                  <path d="M0 0 L10 5 L0 10 z" fill="#facc15" stroke="#000" strokeWidth="1.5" />
                </marker>
              </defs>
              {hintSegments(hintBoxes).map((sg, i) => (
                <g key={i}>
                  <line x1={sg.x1} y1={sg.y1} x2={sg.x2} y2={sg.y2} stroke="#000" strokeWidth="11" strokeLinecap="round" />
                  <line x1={sg.x1} y1={sg.y1} x2={sg.x2} y2={sg.y2} stroke="#facc15" strokeWidth="6" strokeLinecap="round" markerEnd="url(#adv-hint-head)" />
                </g>
              ))}
            </svg>
          )}
          {hintBoxes.map((b, i) => (
            <span key={`h${i}`} className="adv-hint-tile" data-testid="adv-hint-tile" style={{ position: 'fixed', left: b.x - 4, top: b.y - 4, width: b.w + 8, height: b.h + 8, animationDelay: `${i * 120}ms` }}>
              {i === 0 && (
                <span className="adv-hint-bulb" data-testid="adv-hint-bulb"><Lightbulb className="w-4 h-4" strokeWidth={3} /></span>
              )}
            </span>
          ))}
        </div>,
        document.body,
      )}
      {cast && <WordCast cast={cast} impacted={impacted} />}
      {mark && active && <HitMark mark={mark} />}
    </div>
  );
}
