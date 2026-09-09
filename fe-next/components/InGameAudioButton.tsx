'use client';

import React, { memo, useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { useNavigation } from '@/contexts/NavigationContext';
import { useTvFullscreenListener } from '@/hooks/useTvFullscreenListener';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMasterMute } from '@/hooks/useMasterMute';

/**
 * InGameAudioButton — global, always-available mute control during gameplay.
 *
 * The full MusicControls dropdown lives in the global header, which AutoHideHeader
 * removes during active play — so almost every game mode (single player, blast,
 * wordcraft, brain drills, adventure, multiplayer...) had no on-screen way to mute.
 *
 * Mounted ONCE in the locale layout (next to GlobalBottomNav, inside the providers
 * where NavigationContext lives). It appears only during active gameplay
 * (isInGame), and never during a passive TV broadcast (isTvFullscreen). A FAB at a
 * single global node covers every game without touching each screen, and sitting
 * inside the reserved top-header band keeps it clear of most in-game HUDs.
 *
 * Never hides another button: some screens keep a visible header during gameplay
 * and park an action (exit, boost, menu) in the same top corner this FAB claims.
 * Two layers keep that from ever overlapping:
 *   1. Screens with their own in-header mute control register it
 *      (useRegisterHeaderAudioControl) and this FAB stands down entirely.
 *   2. Anything else — an obstruction guard probes the FAB's corner with
 *      elementsFromPoint after layout settles; if another interactive element
 *      sits under it, the FAB nudges below it, and stands down if the corner
 *      stays blocked (bounded nudges). Measurement-based, so it works for LTR
 *      and RTL without per-screen whitelists.
 *
 * Mute only (the user asked for mute/unmute). Master-mute parity with MusicControls
 * via resolveMasterMuteClick: silence wins when unlocked, the enable tap is never
 * swallowed when locked.
 */

/** FAB is w-10 h-10 (40px); probe its vertical centre. */
const FAB_SIZE = 40;
/** Visual gap between the FAB and the header chrome it nudged below. */
const NUDGE_GAP = 8;
/** Max nudges before standing down — a corner that never clears is a broken screen. */
const MAX_NUDGES = 5;

const INTERACTIVE_SELECTOR =
  'button, a, [role="button"], input, select, textarea, [tabindex]:not([tabindex="-1"])';

const InGameAudioButton: React.FC = memo(() => {
  const { isInGame, headerAudioControlActive } = useNavigation();
  const isTvFullscreen = useTvFullscreenListener();
  const { language } = useLanguage();
  const isRTL = language === 'he';
  const { allMuted, toggle, label, title } = useMasterMute();
  const btnRef = useRef<HTMLButtonElement>(null);
  const [offsetY, setOffsetY] = useState(0);
  const [cornerBlocked, setCornerBlocked] = useState(false);

  // Passive broadcast view has no player to mute for — leave it untouched.
  // Stand down when a visible screen header already hosts a mute control
  // (e.g. the MP lobby header) so we never show two mute buttons at once.
  const visible = isInGame && !isTvFullscreen && !headerAudioControlActive;

  useEffect(() => {
    if (!visible) {
      setOffsetY(0);
      setCornerBlocked(false);
      return;
    }
    const el = btnRef.current;
    const doc = el?.ownerDocument;
    const win = doc?.defaultView;
    if (!el || !doc || !win || typeof doc.elementsFromPoint !== 'function') return;
    const HTMLElementCtor = win.HTMLElement;

    const findBlocker = (cy: number): HTMLElement | null => {
      const cx = el.getBoundingClientRect().left + FAB_SIZE / 2;
      const hits = doc.elementsFromPoint(cx, cy);
      for (const hit of hits) {
        if (!(hit instanceof HTMLElementCtor)) continue;
        if (hit === el || el.contains(hit)) continue;
        if (!hit.closest(INTERACTIVE_SELECTOR)) continue;
        const style = win.getComputedStyle(hit);
        if (style.visibility === 'hidden' || style.display === 'none') continue;
        return hit;
      }
      return null;
    };

    const compute = (): void => {
      // Computed `top` resolves the max(safe-area) expression to px and is
      // unaffected by the nudge margin — no state needed to find the corner.
      const naturalTop = parseFloat(win.getComputedStyle(el).top) || 0;
      let top = naturalTop;
      let blocked = false;
      for (let i = 0; i <= MAX_NUDGES; i += 1) {
        const blocker = findBlocker(top + FAB_SIZE / 2);
        if (!blocker) {
          blocked = false;
          break;
        }
        if (i === MAX_NUDGES) {
          blocked = true;
          break;
        }
        top = Math.max(top + FAB_SIZE + NUDGE_GAP, blocker.getBoundingClientRect().bottom + NUDGE_GAP);
      }
      if (blocked) {
        setCornerBlocked(true);
        setOffsetY(0);
      } else {
        setCornerBlocked(false);
        setOffsetY(Math.max(0, Math.round(top - naturalTop)));
      }
    };

    compute();
    // Re-probe after layout settles (fonts, hydration, late headers) — a single
    // mount-time probe races the game screen rendering beneath the layout FAB.
    const retry = win.setTimeout(compute, 350);
    const retryLate = win.setTimeout(compute, 1200);
    win.addEventListener('resize', compute);
    return () => {
      win.clearTimeout(retry);
      win.clearTimeout(retryLate);
      win.removeEventListener('resize', compute);
    };
  }, [visible]);

  if (!visible || cornerBlocked) return null;

  return (
    <button
      ref={btnRef}
      type="button"
      onClick={toggle}
      aria-label={label}
      aria-pressed={!allMuted}
      title={title}
      style={offsetY > 0 ? { marginTop: offsetY } : undefined}
      className={[
        'fixed z-[70] top-[max(0.5rem,env(safe-area-inset-top))]',
        isRTL
          ? 'left-[max(0.5rem,env(safe-area-inset-left))]'
          : 'right-[max(0.5rem,env(safe-area-inset-right))]',
        'flex items-center justify-center w-10 h-10 min-w-[40px] min-h-[40px]',
        'rounded-full border-2 border-neo-cream/20 bg-neo-black/55 text-neo-white',
        'backdrop-blur-sm shadow-hard-sm',
        'hover:bg-neo-black/75 active:scale-95 transition-all duration-150',
      ].join(' ')}
    >
      {allMuted
        ? <VolumeX className="w-[18px] h-[18px]" strokeWidth={2.5} aria-hidden="true" />
        : <Volume2 className="w-[18px] h-[18px]" strokeWidth={2.5} aria-hidden="true" />}
    </button>
  );
});

InGameAudioButton.displayName = 'InGameAudioButton';

export default InGameAudioButton;
