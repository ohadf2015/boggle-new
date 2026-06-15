import React, { useEffect, useState, useRef } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { useSoundEffects } from '../contexts/SoundEffectsContext';
import { prefersStaticFullscreenOverlay } from '../lib/native/webViewLayerFlash';

const RING_SIZE_STYLE = { width: 120, height: 120 } as const;
const GO_TEXT_SHADOW_STYLE = { textShadow: '2px 2px 0px rgba(255,255,255,0.3)' } as const;

interface GoRipplesAnimationProps {
  onComplete?: () => void;
  /** Translation function for hints */
  t?: (key: string) => string;
}

// Module-level latch: blocks a duplicate mount within DUP_GUARD_MS of the last
// completed countdown. MP `showStartAnimation` can race toggle false→true via
// dual handlers (pendingGameStart effect + socket listener) when server retries
// arrive without a stable messageId, causing GoRipples to remount and replay
// 3-2-1-GO. Latch makes the second mount a no-op that immediately reports done.
const DUP_GUARD_MS = 4000;
let lastCompletedAt = 0;

/** Test-only reset to clear the latch between test cases. */
export function __resetGoRipplesDupGuard(): void {
  lastCompletedAt = 0;
}

/**
 * Minimal & calm pre-game countdown with smooth animations
 * Clean 3-2-1-GO with soft cyan glow - easy on the eyes
 */
const GoRipplesAnimation: React.FC<GoRipplesAnimationProps> = ({ onComplete, t }) => {
  // Lazy-init reads `Date.now()` only at first mount — keeps the render pure
  // for the React Compiler while still latching the dup-guard verdict.
  const [isDuplicate] = useState(() => Date.now() - lastCompletedAt < DUP_GUARD_MS);
  const [isVisible, setIsVisible] = useState(!isDuplicate);
  const [count, setCount] = useState(3);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const { playCountdownBeep } = useSoundEffects();

  // Store onComplete in a ref to avoid timer reset when parent re-renders
  // This fixes the bug where countdown gets stuck at 3 due to parent re-renders
  // (e.g., from socket timeUpdate events) creating new callback references
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Duplicate mount: skip everything, fire onComplete on next tick so the
  // parent unmounts us cleanly without a second 3-2-1-GO sequence playing.
  useEffect(() => {
    if (!isDuplicate) return;
    const id = setTimeout(() => onCompleteRef.current?.(), 0);
    return () => clearTimeout(id);
  }, [isDuplicate]);

  // Play beep for each countdown number
  useEffect(() => {
    if (count > 0) {
      playCountdownBeep(count);
    }
  }, [count, playCountdownBeep]);

  // Countdown logic - uses ref for onComplete to avoid dependency on callback reference
  useEffect(() => {
    if (count > 0) {
      const timer = setTimeout(() => setCount(count - 1), 1000);
      return () => clearTimeout(timer);
    } else if (count === 0) {
      // Show "GO!" briefly then fade out smoothly
      const fadeTimer = setTimeout(() => {
        setIsFadingOut(true);
      }, 700);

      const completeTimer = setTimeout(() => {
        setIsVisible(false);
        lastCompletedAt = Date.now();
        onCompleteRef.current?.();
      }, 1000);

      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(completeTimer);
      };
    }
    return undefined;
  }, [count]);

  if (!isVisible) return null;

  const isGo = count === 0;

  // Native (Android WebView) / mobile: render the full-screen overlay STATICALLY.
  // The framer-motion variant below animates opacity on `fixed inset-0` nodes,
  // which promotes a fresh full-screen GPU compositor layer that paints one
  // uninitialised (white) frame before compositing — the reported "fanfare
  // flashes" on the native app. A static overlay paints in the normal document
  // layer (no promotion, no flash). Countdown timing + sound are unchanged; only
  // the bounded countdown box keeps a fade (it tweens AFTER content has painted,
  // so it never shows the white backing). See `webViewLayerFlash` for the why.
  if (prefersStaticFullscreenOverlay()) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none overflow-hidden">
        {/* Opaque-from-first-paint backdrop — never a promoted layer. */}
        <div className="absolute inset-0 bg-neo-navy/60" />

        <div
          className={`relative px-10 py-5 border-4 border-neo-black rounded-neo transition-opacity duration-300 ${
            isGo ? 'bg-neo-lime' : 'bg-neo-cyan'
          } ${isFadingOut ? 'opacity-0' : 'opacity-100'}`}
          style={{
            boxShadow: isGo
              ? '6px 6px 0px var(--neo-black), 0 0 30px rgba(191, 255, 0, 0.4)'
              : '6px 6px 0px var(--neo-black), 0 0 25px rgba(0, 255, 255, 0.3)',
          }}
        >
          <span
            className={`relative z-10 font-black text-neo-black ${
              isGo ? 'text-6xl sm:text-8xl' : 'text-5xl sm:text-7xl'
            }`}
            style={GO_TEXT_SHADOW_STYLE}
          >
            {count > 0 ? count : (t?.('countdown.go') || 'GO!')}
          </span>
        </div>

        {count > 0 && !isFadingOut && (
          <p className="absolute bottom-[25%] text-center text-neo-white text-base sm:text-lg font-black px-6 py-2 bg-neo-black/60 rounded-neo">
            {t?.('countdown.hint') || 'Swipe letters to form words!'}
          </p>
        )}
      </div>
    );
  }

  return (
    <m.div
      className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none overflow-hidden"
      initial={{ opacity: 1 }}
      animate={{ opacity: isFadingOut ? 0 : 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {/* Soft background overlay for focus */}
      <m.div
        className="absolute inset-0 bg-neo-navy/60"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      />

      {/* Single subtle expanding ring for GO */}
      <AnimatePresence>
        {isGo && (
          <m.div
            initial={{ scale: 0.5, opacity: 0.6 }}
            animate={{ scale: 2.5, opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="absolute rounded-full border-2 border-neo-cyan/50"
            style={RING_SIZE_STYLE}
          />
        )}
      </AnimatePresence>

      {/* Main countdown/GO text */}
      <AnimatePresence mode="wait">
        <m.div
          key={count}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{
            duration: 0.25,
            ease: [0.25, 0.46, 0.45, 0.94] // Smooth ease-out
          }}
          className={`relative px-10 py-5 border-4 border-neo-black rounded-neo ${
            isGo ? 'bg-neo-lime' : 'bg-neo-cyan'
          }`}
          style={{
            boxShadow: isGo
              ? '6px 6px 0px var(--neo-black), 0 0 30px rgba(191, 255, 0, 0.4)'
              : '6px 6px 0px var(--neo-black), 0 0 25px rgba(0, 255, 255, 0.3)'
          }}
        >
          {/* Subtle inner glow */}
          <m.div
            className="absolute inset-0 rounded-neo"
            animate={{
              opacity: [0.1, 0.25, 0.1],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            style={{
              background: isGo
                ? 'radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 60%)'
                : 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 60%)',
            }}
          />

          <span
            className={`relative z-10 font-black text-neo-black ${
              isGo ? 'text-6xl sm:text-8xl' : 'text-5xl sm:text-7xl'
            }`}
            style={GO_TEXT_SHADOW_STYLE}
          >
            {count > 0 ? count : (t?.('countdown.go') || 'GO!')}
          </span>
        </m.div>
      </AnimatePresence>

      {/* Quick tip hint during countdown */}
      <AnimatePresence>
        {count > 0 && !isFadingOut && (
          <m.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ delay: 0.3, duration: 0.3 }}
            className="absolute bottom-[25%] text-center text-neo-white text-base sm:text-lg font-black px-6 py-2 bg-neo-black/40 rounded-neo backdrop-blur-xs"
          >
            {t?.('countdown.hint') || 'Swipe letters to form words!'}
          </m.p>
        )}
      </AnimatePresence>
    </m.div>
  );
};

export default GoRipplesAnimation;
