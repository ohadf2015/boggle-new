'use client';

/**
 * SignupPromptHost — global mount for first-win / multi-game signup prompt.
 *
 * Why: useSignupPrompt was previously mounted only on Practice + ResultsPage,
 * so MP/blast/daily/adventure/connections/word-wheel/brain winners never saw
 * the modal. PostHog 30d: 36 first-win users, 2 prompt impressions = 5.5%.
 * Mounting at provider level fires the prompt regardless of which surface
 * delivered the win — the hook gates on localStorage stats.
 *
 * MP routes are excluded; useMultiplayerSignupNudge owns that flow with its
 * own bottom-sheet UX.
 *
 * t_4833c3cd: honor frictionVariant so soft-sheet vs blocking Dialog is
 * driven by signup-prompt-friction-v1 (default soft-sheet).
 */

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useSignupPrompt } from '@/components/singleplayer/results/hooks/useSignupPrompt';

const FirstWinSignupModal = dynamic(() => import('@/components/auth/FirstWinSignupModal'), {
  ssr: false,
});

function isMultiplayerRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  return /\/multiplayer(\/|$|\?)/.test(pathname);
}

export function SignupPromptHost() {
  const pathname = usePathname();
  const { isAuthenticated, user, loading: authLoading } = useAuth();

  const { showSignupModal, dismissSignupModal, isFirstWin, frictionVariant } = useSignupPrompt({
    isAuthenticated,
    hasUser: !!user,
    authLoading,
    disabled: isMultiplayerRoute(pathname),
  });

  return (
    <FirstWinSignupModal
      isOpen={showSignupModal}
      onClose={dismissSignupModal}
      // Honor the hook's first-win classification. This used to be hardcoded
      // to "multiGames", so first-time winners — the largest prompt population
      // under the default after-first-win variant — got generic copy and no
      // celebration. PostHog 14d ordered path: prompt 145 → completed 3.
      variant={isFirstWin ? 'firstWin' : 'multiGames'}
      surface={frictionVariant === 'control' ? 'dialog' : 'sheet'}
    />
  );
}

export default SignupPromptHost;
