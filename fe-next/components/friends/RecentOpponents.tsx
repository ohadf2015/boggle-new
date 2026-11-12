'use client';

import Avatar from '@/components/Avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useFriendsHome } from '@/hooks/friends/useFriendsHome';
import { RecentOpponentsList } from './RecentOpponentsList';
import { useCrewAdd } from './useCrewAdd';

/** Recent opponents to add as friends; renders nothing when there is no one to suggest. */
export function RecentOpponents({ source }: { source: string }) {
  const { isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const { data } = useFriendsHome(!!isAuthenticated, { suggestions: true });
  const { add, sent, busy } = useCrewAdd(source);

  if (!isAuthenticated || !data?.canAddFriends || data.suggestions.length === 0) return null;
  const tt = t as (key: string, params?: Record<string, string | number>) => string;

  return (
    <RecentOpponentsList
      people={data.suggestions}
      t={tt}
      renderAvatar={(p) => <Avatar userId={p.userId} customAvatar={p.customAvatar ?? undefined} avatarImage={p.avatarImage ?? undefined} size="sm" />}
      onAdd={(id) => void add(id)}
      sent={sent}
      busy={busy}
    />
  );
}
