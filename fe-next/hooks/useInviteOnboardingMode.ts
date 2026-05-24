'use client';

import { useCallback, useRef, useState } from 'react';
import type { useRouter } from 'next/navigation';
import {
  getPendingRoomInvite,
  consumePendingRoomInvite,
  markOnboardingComplete,
} from '@/utils/onboardingStorage';
import { trackInviteConsumed } from '@/utils/growthTracking';

export type FlowStep =
  | 'returningUser'
  | 'language'
  | 'calmMode'
  | 'tutorial'
  | 'profile'
  | 'inviteTutorial';

// Base flow. The 'calmMode' vibe-choice step is ADMIN-ONLY during soft launch —
// OnboardingFlow injects it after 'returningUser' for admins (see displaySteps).
// Invite flow stays minimal (no calmMode) to get friends into the room fast.
export const STEPS: FlowStep[] = ['language', 'returningUser', 'tutorial', 'profile'];
export const INVITE_STEPS: FlowStep[] = ['language', 'profile', 'inviteTutorial'];

interface InviteContext {
  code: string;
  hostName?: string;
}

interface UseInviteOnboardingModeArgs {
  language: string;
  router: ReturnType<typeof useRouter>;
  onComplete: () => void;
  isNavigating: boolean;
  setIsNavigating: (v: boolean) => void;
  getPlayerName: () => string;
  getNameEdited: () => boolean;
  emitCompleted: (extras?: Record<string, unknown>) => void;
}

interface UseInviteOnboardingModeResult {
  isInviteMode: boolean;
  inviteAtMount: InviteContext | null;
  activeSteps: FlowStep[];
  handleInviteTeaserComplete: () => void;
}

/**
 * Captures pending MP-room invite at mount and derives the active onboarding
 * step path. Snapshots the invite into a ref so the UI keeps showing the host
 * banner even if the user dismisses/consumes the invite mid-flow.
 */
export function useInviteOnboardingMode(
  args: UseInviteOnboardingModeArgs,
): UseInviteOnboardingModeResult {
  const { language, router, onComplete, isNavigating, setIsNavigating, getPlayerName, getNameEdited, emitCompleted } = args;

  const inviteAtMountRef = useRef<InviteContext | null>(null);
  const [isInviteMode] = useState(() => {
    const inv = getPendingRoomInvite();
    if (inv) inviteAtMountRef.current = { code: inv.code, hostName: inv.hostName };
    return !!inv;
  });

  const activeSteps = isInviteMode ? INVITE_STEPS : STEPS;

  const handleInviteTeaserComplete = useCallback(() => {
    if (isNavigating) return;
    setIsNavigating(true);
    markOnboardingComplete({
      avatarId: 'custom',
      displayName: getPlayerName() || 'Player',
      selectedMode: 'multi',
      nameEdited: getNameEdited(),
    });
    const roomCode = consumePendingRoomInvite();
    // Track invite completion event
    const landedTs = Number(sessionStorage.getItem('invite_landed_ts') || '0');
    const totalSeconds = landedTs ? Math.round((Date.now() - landedTs) / 1000) : 0;
    trackInviteConsumed({
      roomCode: roomCode || '',
      path: 'tutorial',
      totalSeconds,
    });
    router.push(`/${language}/multiplayer?room=${roomCode}`);
    emitCompleted({ via: 'invite_tutorial' });
    onComplete();
  }, [isNavigating, language, router, onComplete, setIsNavigating, getPlayerName, getNameEdited, emitCompleted]);

  return {
    isInviteMode,
    inviteAtMount: inviteAtMountRef.current,
    activeSteps,
    handleInviteTeaserComplete,
  };
}
