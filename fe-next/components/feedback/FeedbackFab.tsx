'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { MessageSquarePlus } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

const ReportBugModal = dynamic(
  () => import('./ReportBugModal').then((m) => m.ReportBugModal),
  { ssr: false }
);

/**
 * FeedbackFab — floating feedback launcher with collision-aware positioning.
 *
 * Design contract (per founder): NEVER cover critical UI — mobile bottom tabs,
 * AdMob anchored banners, in-game controls. It achieves that by:
 *
 * 1. CSS-var baseline: sits above `--bottom-nav-height` (GlobalBottomNav) and
 *    `--admob-banner-height` (anchored ad), both maintained app-wide.
 * 2. Dynamic occlusion scan: on route change / resize it measures any OTHER
 *    fixed/sticky bar glued to the viewport bottom (cookie banners, chat docks,
 *    in-game HUD strips) and lifts itself above the tallest one. No per-app
 *    config needed — it adapts to whatever is actually on screen.
 * 3. Draggable: a vertical drag along the screen edge repositions it; the
 *    offset persists in localStorage so a player can park it anywhere.
 * 4. Auto-hide: disappears while the on-screen keyboard is open and whenever a
 *    modal dialog is up (radix sets data-state="open" on role="dialog").
 * 5. Subtle at rest (70% opacity), full color on hover/focus/drag.
 *
 * Perf: renders nothing until browser idle; the modal code-split loads on
 * first open; z-40 keeps it under every dialog (z-90).
 */

const FAB_SIZE = 44;
const EDGE_GAP = 12;
const DRAG_THRESHOLD_PX = 6;
const STORAGE_KEY = 'lc_feedback_fab_offset';
/** Ignore bottom bars taller than this — those are keyboards/sheets, not nav. */
const MAX_BAR_HEIGHT = 160;
/** Minimum width (fraction of viewport) for an element to count as a bottom bar. */
const MIN_BAR_WIDTH_RATIO = 0.5;

/** Measure the tallest fixed/sticky bar glued to the bottom of the viewport. */
function scanBottomOcclusion(): number {
  if (typeof document === 'undefined') return 0;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let max = 0;
  const all = document.body.getElementsByTagName('*');
  for (let i = 0; i < all.length; i++) {
    const el = all[i] as HTMLElement;
    if (el.getAttribute('data-feedback-fab') === 'true') continue;
    const style = window.getComputedStyle(el);
    if (style.position !== 'fixed' && style.position !== 'sticky') continue;
    if (style.display === 'none' || style.visibility === 'hidden') continue;
    const rect = el.getBoundingClientRect();
    if (rect.height < 24 || rect.height > MAX_BAR_HEIGHT) continue;
    if (rect.width < vw * MIN_BAR_WIDTH_RATIO) continue;
    // "Glued to the bottom": its bottom edge is within 2px of the viewport floor.
    if (Math.abs(rect.bottom - vh) > 2) continue;
    max = Math.max(max, rect.height);
  }
  return max;
}

export default function FeedbackFab() {
  const { t } = useLanguage();
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [occlusion, setOcclusion] = useState(0);
  const [hidden, setHidden] = useState(false);
  const [dragOffset, setDragOffset] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);

  const fabRef = useRef<HTMLButtonElement>(null);
  const dragState = useRef<{ startY: number; startOffset: number; moved: boolean } | null>(null);

  // Defer to browser idle so the FAB never competes with LCP/hydration.
  useEffect(() => {
    const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    if (ric) {
      const id = ric(() => setReady(true), { timeout: 2000 });
      return () => (window as unknown as { cancelIdleCallback?: (n: number) => void }).cancelIdleCallback?.(id);
    }
    const id = window.setTimeout(() => setReady(true), 1200);
    return () => window.clearTimeout(id);
  }, []);

  // Restore the player's parked position.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const n = parseFloat(raw);
        if (!Number.isNaN(n) && n >= 0 && n <= 2000) setDragOffset(n);
      }
    } catch { /* private mode etc. */ }
  }, []);

  // Occlusion scan: on mount, route changes (popstate + MutationObserver-lite),
  // resize, and whenever the DOM swaps major UI (bottom nav mount/unmount).
  useEffect(() => {
    if (!ready) return;
    let raf = 0;
    const runScan = () => setOcclusion(scanBottomOcclusion());
    const rescan = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(runScan);
    };
    runScan(); // first scan synchronously — correct position on first paint
    window.addEventListener('resize', rescan);
    window.addEventListener('popstate', rescan);
    // Bottom bars mount/unmount without resize (nav hides in-game, banners
    // appear after ads load) — observe only direct body/layout mutations,
    // throttled through rAF so gameplay DOM churn never triggers scans.
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        const target = m.target as HTMLElement;
        if (target?.closest?.('[data-feedback-fab="true"]')) continue;
        rescan();
        break;
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: false });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', rescan);
      window.removeEventListener('popstate', rescan);
      observer.disconnect();
    };
  }, [ready]);

  // Auto-hide: on-screen keyboard (visualViewport shrink) or any open dialog.
  useEffect(() => {
    if (!ready) return;
    const evaluate = () => {
      const vv = window.visualViewport;
      const keyboardOpen = !!vv && vv.height < window.innerHeight * 0.75;
      const dialogOpen = !!document.querySelector('[role="dialog"][data-state="open"]');
      setHidden(keyboardOpen || dialogOpen);
    };
    evaluate();
    const vv = window.visualViewport;
    vv?.addEventListener('resize', evaluate);
    const observer = new MutationObserver(evaluate);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-state'] });
    return () => {
      vv?.removeEventListener('resize', evaluate);
      observer.disconnect();
    };
  }, [ready]);

  const clampOffset = useCallback((px: number) => {
    const maxLift = window.innerHeight - FAB_SIZE - EDGE_GAP * 2;
    return Math.min(Math.max(px, 0), Math.max(maxLift, 0));
  }, []);

  // Vertical edge-drag with click/drag disambiguation.
  const onPointerDown = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    dragState.current = { startY: e.clientY, startOffset: dragOffset ?? 0, moved: false };
    fabRef.current?.setPointerCapture?.(e.pointerId);
  }, [dragOffset]);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    const state = dragState.current;
    if (!state) return;
    const dy = state.startY - e.clientY; // dragging up = positive lift
    if (!state.moved && Math.abs(dy) < DRAG_THRESHOLD_PX) return;
    state.moved = true;
    setDragging(true);
    setDragOffset(clampOffset(state.startOffset + dy));
  }, [clampOffset]);

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    const state = dragState.current;
    dragState.current = null;
    fabRef.current?.releasePointerCapture?.(e.pointerId);
    if (!state?.moved) {
      setOpen(true); // treat as click
      return;
    }
    setDragging(false);
    setDragOffset((current) => {
      try { localStorage.setItem(STORAGE_KEY, String(current ?? 0)); } catch { /* noop */ }
      return current;
    });
  }, []);

  if (!ready) return null;

  return (
    <>
      <button
        ref={fabRef}
        type="button"
        data-feedback-fab="true"
        data-occlusion={occlusion}
        aria-label={t('bugReport.fabLabel', 'Send feedback')}
        title={t('bugReport.fabLabel', 'Send feedback')}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => { dragState.current = null; setDragging(false); }}
        style={{
          // Baseline: above bottom nav + anchored ad (CSS vars maintained app-wide),
          // then above anything else the dynamic scan finds glued to the floor,
          // then the player's parked drag offset.
          bottom: `calc(var(--bottom-nav-height, 0px) + var(--admob-banner-height, 0px) + ${EDGE_GAP + occlusion + (dragOffset ?? 0)}px)`,
          transition: dragging ? 'none' : 'bottom 200ms ease, opacity 200ms ease, transform 150ms ease',
        }}
        className={cn(
          'fixed z-40 end-3 h-11 w-11 rounded-full border-3 border-neo-black shadow-hard-sm',
          'flex items-center justify-center touch-none select-none',
          'bg-neo-yellow text-neo-black hover:bg-neo-lime',
          'opacity-70 hover:opacity-100 focus-visible:opacity-100',
          dragging && 'opacity-100 scale-110 cursor-grabbing',
          hidden && 'pointer-events-none opacity-0 scale-75'
        )}
      >
        <MessageSquarePlus className="h-5 w-5" aria-hidden="true" />
      </button>
      {open && <ReportBugModal isOpen={open} onClose={() => setOpen(false)} />}
    </>
  );
}
