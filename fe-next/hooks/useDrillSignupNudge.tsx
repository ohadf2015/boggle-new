import React, { useState, useCallback } from 'react';
import FirstWinSignupModal from '@/components/auth/FirstWinSignupModal';

interface UseDrillSignupNudgeReturn {
  /** Call when a drill result came back needsAuth (guest played, not saved). */
  promptSignup: () => void;
  /** Render this in the drill page — the "sign up to save your progress" modal. */
  signupNudge: React.ReactElement;
}

/**
 * Shared sign-up nudge for the 5 drill pages.
 *
 * A guest can play a drill, but the submit returns 401 and the score is lost.
 * Instead of silently dropping it, each drill calls promptSignup() on
 * saveResult.needsAuth and renders signupNudge — turning the dead-end into a
 * "create an account to keep your brain-training progress" moment.
 */
export function useDrillSignupNudge(): UseDrillSignupNudgeReturn {
  const [open, setOpen] = useState(false);
  const promptSignup = useCallback(() => setOpen(true), []);
  const signupNudge = (
    <FirstWinSignupModal isOpen={open} onClose={() => setOpen(false)} variant="firstWin" />
  );
  return { promptSignup, signupNudge };
}
