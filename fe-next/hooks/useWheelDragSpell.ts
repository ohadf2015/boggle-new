import { useCallback, useEffect, useRef, type MutableRefObject } from 'react';

/**
 * Shared wheel drag-to-spell input — the single source of truth for the
 * pointer-drag algorithm used by BOTH the live `WordWheelGame`
 * (`components/daily/WordWheelGame.tsx`) and the practice wheel sandbox
 * (`components/practice/PracticeWheelSandbox.tsx`).
 *
 * Behaviour (kept identical across both call sites):
 *  - Drag engages only once the pointer moves to a DIFFERENT letter than the
 *    one it started on, so a single tap stays a tap (the button's native
 *    onClick still fires) and double-tap-to-submit keeps working.
 *  - Letters are added additively; already-used indices are skipped.
 *  - Releasing an engaged drag with `>= minLength` letters auto-submits.
 *
 * The caller owns the `draggingRef` / `pointerPosRef` (they're also fed to the
 * decorative `WordWheelPixiRing` and, in the live game, to `useHoldToSubmit`),
 * so the hook takes them as inputs rather than owning them — this avoids a
 * hook-ordering cycle with the hold-to-submit hook.
 */
export interface UseWheelDragSpellOptions {
  /** Shared "a drag is in progress" flag (also read by the Pixi ring). */
  draggingRef: MutableRefObject<boolean>;
  /** Shared latest pointer position (also read by the Pixi ring). */
  pointerPosRef: MutableRefObject<{ x: number; y: number } | null>;
  /** Minimum built length required for a drag-release to auto-submit. */
  minLength?: number;
  /** Whether a wheel index is already part of the built word. */
  isIndexUsed: (index: number) => boolean;
  /** Append a wheel letter to the built word. `el` is provided for effects. */
  addLetter: (index: number, letter: string, el: HTMLButtonElement) => void;
  /** Current built-word length, read fresh at pointer-up. */
  getBuiltLength: () => number;
  /** Submit the built word (drag-release auto-submit). */
  submit: () => void;
  /**
   * Fired once when a drag transitions idle → engaged, with the start index.
   * Return `false` to suppress the hook's default "add the start letter"
   * (the live game uses this to avoid double-adding an eager-added hold letter).
   */
  onEngage?: (startIndex: number) => boolean | void;
  /** Fired immediately before a drag-release submit (e.g. mark last-was-drag). */
  onBeforeDragSubmit?: () => void;
  /** Cancel any pending idle auto-submit before a drag-release submit. */
  cancelPendingSubmit?: () => void;
  /**
   * A letter that sits between other letters (the wheel hub). A straight swipe
   * from one outer letter to the opposite one crosses it, so the drag only takes
   * it after the pointer rests on it, turns inside it, or is released on it.
   */
  hubIndex?: number;
}

/** Shortest pause on the hub that counts as resting there. */
export const HUB_REST_MIN_MS = 120;
const HUB_TURN_DEG = 35;
const GAP_SAMPLES = 9;

interface Pt { x: number; y: number }

interface PendingHub {
  entry: Pt;
  heading: Pt;
  maxGap: number;
  timer: ReturnType<typeof setTimeout>;
}

const median = (xs: number[]) => {
  const sorted = [...xs].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};

/**
 * A rest is a pause clearly longer than this drag's own rhythm between pointer
 * events: ~16 ms for a finger, but a scripted or starved pointer can be far
 * sparser, and a fixed dwell would then mistake every crossing for a rest.
 */
const restThreshold = (gaps: number[]) =>
  Math.max(HUB_REST_MIN_MS, (gaps.length ? median(gaps) : 40) * 1.6 + 60);

const angleBetween = (a: Pt, b: Pt) => {
  const la = Math.hypot(a.x, a.y);
  const lb = Math.hypot(b.x, b.y);
  if (la === 0 || lb === 0) return 0;
  const cos = Math.max(-1, Math.min(1, (a.x * b.x + a.y * b.y) / (la * lb)));
  return (Math.acos(cos) * 180) / Math.PI;
};

export interface WheelDragSpellHandlers {
  handlePointerDown: (e: React.PointerEvent) => void;
  handlePointerMove: (e: React.PointerEvent) => void;
  handlePointerUp: () => void;
}

export function useWheelDragSpell(
  options: UseWheelDragSpellOptions,
): WheelDragSpellHandlers {
  // Latest options in a ref so the returned handlers stay referentially stable
  // (callers spread them onto a div every render).
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const lastDragIdxRef = useRef<number | null>(null);
  const dragStartIdxRef = useRef<number | null>(null);
  const dragEngagedRef = useRef(false);
  const lastPtRef = useRef<Pt | null>(null);
  const pendingHubRef = useRef<PendingHub | null>(null);
  const lastMoveAtRef = useRef<number | null>(null);
  const gapsRef = useRef<number[]>([]);

  useEffect(() => () => {
    if (pendingHubRef.current) clearTimeout(pendingHubRef.current.timer);
  }, []);

  const resolveHub = useCallback((take: boolean) => {
    const pending = pendingHubRef.current;
    if (!pending) return;
    clearTimeout(pending.timer);
    pendingHubRef.current = null;
    const o = optionsRef.current;
    const hub = o.hubIndex;
    if (!take || hub === undefined || o.isIndexUsed(hub)) return;
    const btn = document.querySelector<HTMLButtonElement>(`[data-wheel-index="${hub}"]`);
    if (!btn) return;
    lastDragIdxRef.current = hub;
    o.addLetter(hub, btn.dataset.wheelLetter || '', btn);
  }, []);

  const armHubTimer = useCallback((pending: PendingHub) => {
    clearTimeout(pending.timer);
    pending.timer = setTimeout(() => resolveHub(true), restThreshold(gapsRef.current));
  }, [resolveHub]);

  const tryDragHit = useCallback((clientX: number, clientY: number, gap: number | null) => {
    const o = optionsRef.current;
    const el = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
    const btn = el?.closest<HTMLButtonElement>('[data-wheel-letter]');
    const hitIdx = btn ? Number(btn.dataset.wheelIndex) : null;
    const pending = pendingHubRef.current;
    if (pending) {
      if (gap !== null) pending.maxGap = Math.max(pending.maxGap, gap);
      if (hitIdx === o.hubIndex) {
        armHubTimer(pending);
        return;
      }
      const exit = { x: clientX - pending.entry.x, y: clientY - pending.entry.y };
      const rested = pending.maxGap >= restThreshold(gapsRef.current);
      resolveHub(rested || angleBetween(pending.heading, exit) >= HUB_TURN_DEG);
    } else if (gap !== null) {
      gapsRef.current = [...gapsRef.current, gap].slice(-GAP_SAMPLES);
    }
    if (!btn || hitIdx === null) return;
    const idx = hitIdx;
    if (idx === lastDragIdxRef.current) return;
    if (!dragEngagedRef.current) {
      const startIdx = dragStartIdxRef.current;
      if (startIdx === null || idx === startIdx) return;
      dragEngagedRef.current = true;
      lastDragIdxRef.current = startIdx;
      const shouldAddStart = o.onEngage ? o.onEngage(startIdx) !== false : true;
      const startBtn = document.querySelector<HTMLButtonElement>(
        `[data-wheel-index="${startIdx}"]`,
      );
      if (shouldAddStart && startBtn && !o.isIndexUsed(startIdx)) {
        o.addLetter(startIdx, startBtn.dataset.wheelLetter || '', startBtn);
      }
    }
    if (optionsRef.current.isIndexUsed(idx)) return;
    if (idx === o.hubIndex) {
      const prev = lastPtRef.current ?? { x: clientX, y: clientY };
      const fresh: PendingHub = {
        entry: { x: clientX, y: clientY },
        heading: { x: clientX - prev.x, y: clientY - prev.y },
        maxGap: 0,
        timer: setTimeout(() => {}, 0),
      };
      pendingHubRef.current = fresh;
      armHubTimer(fresh);
      return;
    }
    lastDragIdxRef.current = idx;
    o.addLetter(idx, btn.dataset.wheelLetter || '', btn);
  }, [resolveHub, armHubTimer]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const o = optionsRef.current;
    o.draggingRef.current = true;
    dragEngagedRef.current = false;
    lastDragIdxRef.current = null;
    resolveHub(false);
    lastPtRef.current = { x: e.clientX, y: e.clientY };
    lastMoveAtRef.current = Date.now();
    gapsRef.current = [];
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    const btn = el?.closest<HTMLButtonElement>('[data-wheel-letter]');
    dragStartIdxRef.current = btn ? Number(btn.dataset.wheelIndex) : null;
  }, [resolveHub]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const o = optionsRef.current;
    o.pointerPosRef.current = { x: e.clientX, y: e.clientY };
    if (!o.draggingRef.current) return;
    const now = Date.now();
    const gap = lastMoveAtRef.current === null ? null : now - lastMoveAtRef.current;
    lastMoveAtRef.current = now;
    tryDragHit(e.clientX, e.clientY, gap);
    lastPtRef.current = { x: e.clientX, y: e.clientY };
  }, [tryDragHit]);

  const handlePointerUp = useCallback(() => {
    const o = optionsRef.current;
    o.pointerPosRef.current = null;
    const wasEngaged = dragEngagedRef.current;
    resolveHub(wasEngaged);
    o.draggingRef.current = false;
    lastDragIdxRef.current = null;
    dragStartIdxRef.current = null;
    dragEngagedRef.current = false;
    if (wasEngaged && o.getBuiltLength() >= (o.minLength ?? 3)) {
      o.cancelPendingSubmit?.();
      o.onBeforeDragSubmit?.();
      o.submit();
    }
  }, [resolveHub]);

  return { handlePointerDown, handlePointerMove, handlePointerUp };
}
