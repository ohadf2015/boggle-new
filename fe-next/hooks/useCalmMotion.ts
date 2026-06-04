import useReducedMotion from '@/hooks/useReducedMotion';
import { useCosyMode } from '@/contexts/AccessibilityContext';

/**
 * useCalmMotion — the canonical gate for PERPETUAL decorative motion.
 *
 * Returns true when motion should be calmed: the OS `prefers-reduced-motion`
 * flag is set, OR in-app Cosy / Calm Mode is on. This closes a real blind spot:
 * `useReducedMotion()` reads only the OS media query, but Cozy Mode is an
 * in-app onboarding toggle whose (often effect-averse) audience rarely sets the
 * OS flag — so infinite loops gated on the OS hook alone ran forever for exactly
 * the people who chose calm.
 *
 * Use this to gate looping, ambient, peripheral motion (glow / shimmer / float /
 * pulse on `repeat: Infinity`). Do NOT use it to gate one-shot celebration
 * TRIGGERS that already self-calm through the confetti → quiet-feedback path
 * (`fireConfetti` etc. emit `QUIET_FEEDBACK_EVENT` under calm) — folding cozy in
 * there would suppress the dignified calm acknowledgement entirely. For those,
 * keep gating on the OS-only `useReducedMotion()`.
 */
export function useCalmMotion(): boolean {
  const osReducedMotion = useReducedMotion();
  const cosyMode = useCosyMode();
  return osReducedMotion || cosyMode;
}

export default useCalmMotion;
