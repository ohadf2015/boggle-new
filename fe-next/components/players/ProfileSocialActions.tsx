'use client';

import React from 'react';
import Link from 'next/link';
import { Swords } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { FriendQuickAction } from '@/components/friends/FriendQuickAction';
import { FriendStatusProvider, useFriendStatus } from '@/components/friends/FriendStatusContext';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { playerChallengeHref } from './challengeHref';

interface ProfileSocialActionsProps {
  userId: string;
  name: string;
  /** Analytics surface, e.g. 'player_profile', 'public_profile'. */
  surface: string;
  className?: string;
}

/** Challenge + add friend for someone else's profile page. Callers hide it on the viewer's own profile. */
export function ProfileSocialActions(props: ProfileSocialActionsProps) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? (
    <FriendStatusProvider>
      <Actions {...props} signedIn />
    </FriendStatusProvider>
  ) : (
    <Actions {...props} signedIn={false} />
  );
}

function Actions({ userId, name, surface, className, signedIn }: ProfileSocialActionsProps & { signedIn: boolean }) {
  const { t, language } = useLanguage();
  const isFriend = useFriendStatus()?.relationFor(userId) === 'friend';

  return (
    <div className={cn('flex items-stretch gap-2', className)}>
      <Link
        href={playerChallengeHref(language, userId, isFriend)}
        data-testid="profile-challenge"
        onClick={() => trackGrowthEvent('profile_challenge_clicked', { surface })}
        className={cn(
          'flex-1 inline-flex items-center justify-center gap-1.5 h-11 px-4 rounded-neo',
          'border-3 border-neo-black bg-neo-orange text-neo-black shadow-hard-sm',
          'font-neo-display font-black text-sm uppercase',
          'motion-safe:hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none transition-[transform,box-shadow]',
        )}
      >
        <Swords aria-hidden className="w-4 h-4" strokeWidth={2.75} />
        {t('profile.challenge')}
      </Link>
      {signedIn && <FriendQuickAction userId={userId} name={name} surface={surface} className="h-11 min-w-11 px-3" />}
    </div>
  );
}

export default ProfileSocialActions;
