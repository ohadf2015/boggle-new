import { useEffect, useRef } from 'react';
import { subscribeForegroundResume } from '@/lib/native/foregroundResume';
import { getDeadzoneThreshold } from '@/utils/consts';
import {
  vibrateBacktrack,
  vibrateCellDrag,
  vibrateCellTap,
  vibrateClickSelect,
  vibrateUndo,
  vibrateWordSubmit,
} from '@/components/grid/hapticFeedback';
import { createBoardPainter, type BoardPainter } from './boardPainter';
import { clearFx, releaseFx } from './boardFx';
import {
  hitTest,
  isNeighbour,
  keyOf,
  PRESS_HIT_RADIUS,
  samplesBetween,
  stepPath,
  type CellRef,
  type Point,
} from './selectionPath';

export type SubmitMethod = 'drag' | 'click' | 'kb';

export interface BoardSelectionOptions {
  interactive: boolean;
  onSubmit?: (path: CellRef[], method: SubmitMethod) => void;
  onPathChange?: (path: CellRef[]) => void;
  onSingleTap?: (cell: CellRef) => void;
  /** Sound hook: fires once per letter added, with the new word length. */
  onStep?: (length: number) => void;
  canEnter?: (cell: CellRef, pathLength: number) => boolean;
  adjacent?: (a: CellRef, b: CellRef) => boolean;
  /** Desktop only: a 3+ letter selection left untouched this long submits. */
  autoSubmitIdleMs?: number;
  /** With a live combo, a touch finger resting on 3+ letters chains the word after 500ms. */
  comboLevel?: number;
  fireRoundActive?: boolean;
}

export interface BoardSelectionApi {
  getPath: () => CellRef[];
  setPath: (path: CellRef[]) => void;
  submit: (method: SubmitMethod) => void;
  isPressing: () => boolean;
  getMode: () => Mode;
  painter: () => BoardPainter | null;
}

type Mode = 'idle' | 'press' | 'drag' | 'click';

const COMBO_CHAIN_MS = 500;

/**
 * One selection engine for every letter board. Pointer events (mouse, touch
 * and pen alike) are read natively; the path lives in a ref and is painted
 * straight onto the DOM, so React never renders on a pointer move.
 */
export function useBoardSelection(
  containerRef: React.RefObject<HTMLElement | null>,
  options: BoardSelectionOptions,
): React.RefObject<BoardSelectionApi | null> {
  const optsRef = useRef(options);
  useEffect(() => {
    optsRef.current = options;
  });
  const apiRef = useRef<BoardSelectionApi | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const root = container?.querySelector<HTMLElement>('[role="grid"]');
    if (!container || !root) return undefined;
    const painter = createBoardPainter(container);
    const doc = root.ownerDocument;
    const win = doc.defaultView ?? window;

    let path: CellRef[] = [];
    let mode: Mode = 'idle';
    let pressing = false;
    let pointerId = -1;
    let isTouch = false;
    let start: Point = { x: 0, y: 0 };
    let last: Point | null = null;
    let pendingTail: Point | null = null;
    let raf = 0;
    let idleTimer = 0;
    let comboTimer = 0;

    const o = () => optsRef.current;
    const canEnter = (c: CellRef, len: number) => o().canEnter?.(c, len) ?? true;
    const adjacent = (a: CellRef, b: CellRef) => (o().adjacent ?? isNeighbour)(a, b);

    const clearTimers = () => {
      win.clearTimeout(idleTimer);
      win.clearTimeout(comboTimer);
      idleTimer = 0;
      comboTimer = 0;
    };

    function armTimers() {
      clearTimers();
      const { autoSubmitIdleMs, comboLevel = 0 } = o();
      if (path.length < 3) return;
      if (!isTouch && autoSubmitIdleMs != null) {
        idleTimer = win.setTimeout(() => submit(mode === 'click' ? 'click' : 'drag'), autoSubmitIdleMs);
      }
      if (isTouch && pressing && comboLevel > 0) {
        comboTimer = win.setTimeout(() => submit('drag'), COMBO_CHAIN_MS);
      }
    }

    function setPath(next: CellRef[], opts: { keepPreview?: boolean; silent?: boolean } = {}) {
      path = next;
      painter.setPath(next, opts);
      if (!opts.silent) o().onPathChange?.(next);
      armTimers();
    }

    function endGesture() {
      pressing = false;
      if (pointerId >= 0) {
        try { root!.releasePointerCapture?.(pointerId); } catch { /* not captured */ }
      }
      pointerId = -1;
      last = null;
      painter.setPointer(null);
    }

    function submit(method: SubmitMethod) {
      clearTimers();
      const word = path;
      if (!word.length) return;
      endGesture();
      mode = 'idle';
      painter.setMode('idle');
      o().onSubmit?.(word, method);
      vibrateWordSubmit(word.length, o().comboLevel ?? 0, o().fireRoundActive ?? false);
      releaseFx(container!, word, painter.geometry());
      setPath([], { keepPreview: true });
    }

    function clear() {
      clearTimers();
      endGesture();
      mode = 'idle';
      painter.setMode('idle');
      if (path.length) setPath([]);
    }

    function add(next: CellRef[], change: 'add' | 'back') {
      setPath(next);
      if (change === 'add') {
        vibrateCellDrag(o().fireRoundActive ?? false);
        o().onStep?.(next.length);
      } else {
        vibrateBacktrack(o().fireRoundActive ?? false);
      }
    }

    function track(p: Point) {
      const geo = painter.geometry();
      if (!geo || !last) return;
      for (const s of samplesBetween(last, p, Math.max(4, geo.cell / 5))) {
        const hit = hitTest(geo, s.x, s.y);
        if (!hit) continue;
        const r = stepPath(path, hit, { canEnter, adjacent });
        if (r.change !== 'none') add(r.path, r.change);
      }
      last = p;
    }

    function flushTail() {
      raf = 0;
      if (pressing && pendingTail) painter.setPointer(pendingTail);
    }

    function cellFromEvent(e: PointerEvent): CellRef | null {
      const el = (e.target as Element | null)?.closest?.<HTMLElement>('[data-tile]');
      if (el && root!.contains(el) && el.dataset.letter) {
        return { row: Number(el.dataset.row), col: Number(el.dataset.col), letter: el.dataset.letter };
      }
      const geo = painter.geometry() ?? painter.measure();
      return geo ? hitTest(geo, e.clientX, e.clientY, PRESS_HIT_RADIUS) : null;
    }

    function clickTile(cell: CellRef): boolean {
      const key = keyOf(cell.row, cell.col);
      const lastCell = path[path.length - 1];
      if (lastCell && keyOf(lastCell.row, lastCell.col) === key && path.length >= 2) {
        submit('click');
        return true;
      }
      const idx = path.findIndex((c) => keyOf(c.row, c.col) === key);
      if (idx >= 0) {
        if (idx < path.length - 1) {
          setPath(path.slice(0, idx + 1));
          vibrateBacktrack(o().fireRoundActive ?? false);
        }
        return true;
      }
      if (lastCell && adjacent(lastCell, cell) && canEnter(cell, path.length)) {
        setPath([...path, cell]);
        vibrateClickSelect();
        o().onStep?.(path.length);
        return true;
      }
      return false;
    }

    const onDown = (e: PointerEvent) => {
      if (!o().interactive || e.button === 2) return;
      const cell = cellFromEvent(e);
      if (!cell) return;
      if (e.cancelable) e.preventDefault();
      if (doc.activeElement !== root) root.focus({ preventScroll: true });
      isTouch = e.pointerType === 'touch';
      pointerId = e.pointerId;
      try { root.setPointerCapture?.(e.pointerId); } catch { /* synthetic pointer */ }
      painter.measure();
      start = { x: e.clientX, y: e.clientY };
      last = start;
      pressing = true;

      if (mode === 'click' && path.length && !isTouch) {
        if (clickTile(cell)) return;
      }
      clearFx(container);
      if (!canEnter(cell, 0)) {
        pressing = false;
        return;
      }
      mode = 'press';
      painter.setMode('press');
      setPath([cell]);
      vibrateCellTap(o().fireRoundActive ?? false);
      o().onStep?.(1);
    };

    const onMove = (e: PointerEvent) => {
      if (!pressing || e.pointerId !== pointerId) return;
      const p = { x: e.clientX, y: e.clientY };
      if (mode !== 'drag' && Math.hypot(p.x - start.x, p.y - start.y) >= getDeadzoneThreshold()) {
        const head = path[path.length - 1];
        const onHead = head && hitTest(painter.geometry()!, start.x, start.y, PRESS_HIT_RADIUS);
        if (mode === 'press' || (mode === 'click' && onHead && keyOf(onHead.row, onHead.col) === keyOf(head.row, head.col))) {
          mode = 'drag';
          painter.setMode('drag');
        }
      }
      if (mode === 'drag') track(p);
      pendingTail = p;
      if (!raf) raf = win.requestAnimationFrame(flushTail);
    };

    const onUp = (e: PointerEvent) => {
      if (!pressing || (e.pointerId !== pointerId && pointerId >= 0)) return;
      const wasMode = mode;
      endGesture();
      if (!o().interactive) {
        clear();
        return;
      }
      if (wasMode === 'drag') {
        submit('drag');
      } else if (wasMode === 'press') {
        if (isTouch) {
          const cell = path[0];
          if (cell) o().onSingleTap?.(cell);
          clear();
        } else {
          mode = 'click';
          painter.setMode('click');
          armTimers();
        }
      } else {
        armTimers();
      }
    };

    const onContextMenu = (e: Event) => {
      if (!o().interactive) return;
      e.preventDefault();
      if (path.length) {
        setPath(path.slice(0, -1));
        vibrateUndo(o().fireRoundActive ?? false);
        if (!path.length) {
          mode = 'idle';
          painter.setMode('idle');
        }
      }
    };

    const onOutside = (e: PointerEvent) => {
      if (container.contains(e.target as Node)) return;
      if (mode === 'click' && path.length) submit('click');
    };

    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mode === 'click') clear();
    };

    // An ad Activity / app switch can hide the WebView mid-swipe: no pointerup
    // ever arrives, `pressing` stays true and the dropped tail rAF leaves `raf`
    // non-zero, so the board ignores every later swipe until a restart. On
    // resume, abandon the half-finished gesture (never auto-submit it).
    const stopResume = subscribeForegroundResume(() => {
      if (raf) { win.cancelAnimationFrame(raf); raf = 0; }
      if (!pressing) return;
      endGesture();
      clear();
    });

    root.addEventListener('pointerdown', onDown);
    root.addEventListener('pointermove', onMove);
    root.addEventListener('pointerup', onUp);
    root.addEventListener('pointercancel', onUp);
    root.addEventListener('lostpointercapture', onUp);
    root.addEventListener('contextmenu', onContextMenu);
    doc.addEventListener('pointerdown', onOutside, true);
    win.addEventListener('keydown', onEscape);

    apiRef.current = {
      getPath: () => path,
      setPath: (next) => {
        clearFx(container);
        mode = next.length ? 'click' : 'idle';
        painter.setMode(mode);
        setPath(next);
      },
      submit,
      isPressing: () => pressing,
      getMode: () => mode,
      painter: () => painter,
    };

    return () => {
      stopResume();
      clearTimers();
      if (raf) win.cancelAnimationFrame(raf);
      root.removeEventListener('pointerdown', onDown);
      root.removeEventListener('pointermove', onMove);
      root.removeEventListener('pointerup', onUp);
      root.removeEventListener('pointercancel', onUp);
      root.removeEventListener('lostpointercapture', onUp);
      root.removeEventListener('contextmenu', onContextMenu);
      doc.removeEventListener('pointerdown', onOutside, true);
      win.removeEventListener('keydown', onEscape);
      apiRef.current = null;
    };
  }, [containerRef]);

  return apiRef;
}
