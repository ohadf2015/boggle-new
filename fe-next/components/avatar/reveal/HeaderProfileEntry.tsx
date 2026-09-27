'use client';

import { useSyncExternalStore } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import { clearUnseenUnlock, hasUnseenUnlock, subscribeReveal } from '@/lib/avatar/revealTrigger';
import ProfileEntryButton from './ProfileEntryButton';

const serverFalse = () => false;

/**
 * Header avatar → own profile. Only 0.17% of players ever opened a profile;
 * the only path was buried in the side drawer. Authed players only: shown
 * after auth resolves (hidden is the pessimistic state for UI *added* for
 * members) and never on CrazyGames, where the profile navigates off-mode.
 */
export default function HeaderProfileEntry() {
  const { isAuthenticated, loading, user, profile } = useAuth();
  const { t, language } = useLanguage();
  const { isOnCrazyGamesPlatform, isLoading: cgLoading } = useCrazyGames();
  const hasNew = useSyncExternalStore(subscribeReveal, hasUnseenUnlock, serverFalse);

  if (!isAuthenticated || loading || cgLoading || isOnCrazyGamesPlatform) return null;
  const level = profile?.current_level ?? null;

  return (
    <ProfileEntryButton
      href={`/${language}/profile?from=header`}
      label={level != null ? `${t('revealUnlock.profileEntry')} · ${t('revealUnlock.levelShort', { level })}` : t('revealUnlock.profileEntry')}
      avatarConfig={profile?.avatar_config ?? null}
      userId={user?.id ?? profile?.id}
      level={level}
      hasNew={hasNew}
      onClick={clearUnseenUnlock}
    />
  );
}
