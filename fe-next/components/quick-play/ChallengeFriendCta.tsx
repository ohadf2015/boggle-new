'use client';

/**
 * ChallengeFriendCta — the loop closer for a shared "beat my board" link.
 *
 * The recipient just saw the VS card against the challenger (the value peak).
 * Until now the flow dead-ended there: the challenger id never reached the
 * results screen, so "add the person who challenged me" was impossible and
 * friend_added stayed at 0 for the whole rival-card cohort.
 *
 * One tap, never gating the fun: signed-in players get the standard add /
 * accept / chat action; guests get the sign-in-to-add chip. Renders nothing
 * for child-tier players or when the challenger is the viewer themselves.
 */
import { useEffect } from 'react';
import posthog from '@/lib/analytics/lazyPosthog';
import { useLanguage } from '@/contexts/LanguageContext';
import { ResultsFriendStatusProvider } from '@/components/results/ResultsFriendStatus';
import { useFriendStatus } from '@/components/friends/FriendStatusContext';
import { FriendQuickAction } from '@/components/friends/FriendQuickAction';
import { MpGuestAddPromptProvider, MpRowFriendAction } from '@/components/multiplayer/results/MpGuestAddChip';
import { useSocialCapabilities } from '@/hooks/useSocialCapabilities';

export const CHALLENGE_FRIEND_SURFACE = 'quick_challenge_results';

type T = (key: string, params?: Record<string, string | number>) => string;

export interface ChallengeFriendCtaProps {
  /** The challenger's user id (row-based challenge links only). */
  userId: string;
  name: string;
}

export function ChallengeFriendCta({ userId, name }: ChallengeFriendCtaProps) {
  return (
    <ResultsFriendStatusProvider>
      <VisibilityGate userId={userId} name={name} />
    </ResultsFriendStatusProvider>
  );
}

/** Decides whether the moment applies before any impression is counted. */
function VisibilityGate({ userId, name }: ChallengeFriendCtaProps) {
  const ctx = useFriendStatus();
  const { tier } = useSocialCapabilities();
  if (tier === 'child') return null;
  if (ctx?.isAuthenticated && ctx.relationFor(userId) === 'self') return null;
  return <CtaCard userId={userId} name={name} />;
}

function CtaCard({ userId, name }: ChallengeFriendCtaProps) {
  const { t } = useLanguage();
  const ctx = useFriendStatus();

  useEffect(() => {
    posthog.capture('challenge_friend_cta_shown', { surface: CHALLENGE_FRIEND_SURFACE });
  }, []);

  return (
    <div
      data-testid="challenge-friend-cta"
      className="flex w-full items-center justify-between gap-3 rounded-2xl border-[3px] border-neo-black bg-neo-navy-elevated px-4 py-3 shadow-hard"
    >
      <p dir="auto" className="min-w-0 font-neo-display text-sm font-black text-neo-cream">
        {t('quickPlay.solo.addChallengerCta', { name })}
      </p>
      {ctx?.isAuthenticated ? (
        <FriendQuickAction userId={userId} name={name} surface={CHALLENGE_FRIEND_SURFACE} />
      ) : (
        <MpGuestAddPromptProvider value>
          <MpRowFriendAction userId={userId} name={name} surface={CHALLENGE_FRIEND_SURFACE} t={t as T} />
        </MpGuestAddPromptProvider>
      )}
    </div>
  );
}

export default ChallengeFriendCta;
