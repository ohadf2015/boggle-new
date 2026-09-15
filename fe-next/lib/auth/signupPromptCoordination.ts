/**
 * Coordination between the post-game growth signup prompt (SignupPromptHost /
 * soft-sheet) and competing auth surfaces (Google One Tap, Results AuthModal).
 *
 * t_da22db9a: after soft-sheet #978 the prompt→completed cliff deepened. Root
 * causes dug up here (not a soft-sheet redo):
 * 1. Results still mounted a second useSignupPrompt and could open blocking
 *    AuthModal while Host showed soft-sheet (race on session latch).
 * 2. After cookie consent (#1046), One Tap and soft-sheet both fire in the
 *    same window → stacked auth → reflex dismiss without signup_completed.
 * 3. Soft-sheet z-50 lost to PracticeResults / SP sticky bottom CTAs (also
 *    z-50, later in DOM) so OAuth was covered on the primary mobile path.
 *
 * No new PostHog event names — existing growth:* funnel only.
 */

import { getGuestStats } from '@/utils/guestManager';

/** Once-per-session latch shared by useSignupPrompt mounts. */
export const SIGNUP_PROMPT_SHOWN_KEY = 'boggle_sp_signup_shown';

/** Window event: soft-sheet / dialog prompt visibility for One Tap cancel. */
export const SIGNUP_PROMPT_ACTIVE_EVENT = 'lexiclash:signup-prompt-active';

export type SignupPromptActiveDetail = { active: boolean };

export function emitSignupPromptActive(active: boolean): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<SignupPromptActiveDetail>(SIGNUP_PROMPT_ACTIVE_EVENT, {
      detail: { active },
    }),
  );
}

/**
 * True when the post-game signup funnel should own auth UX this session —
 * skip / cancel Google One Tap so it does not stack on the soft-sheet.
 */
export function shouldSuppressOneTapForSignupFunnel(
  getGames: () => number = () => getGuestStats().games || 0,
): boolean {
  if (typeof window === 'undefined') return false;
  if (sessionStorage.getItem(SIGNUP_PROMPT_SHOWN_KEY)) return true;
  // Guest already completed a game: soft-sheet / Host owns conversion.
  // One Tap on the results screen after consent was the #1046 residual stack.
  return getGames() >= 1;
}
