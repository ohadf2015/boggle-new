'use client';

import Link from 'next/link';
import { Users } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useFriendsActivity } from '@/hooks/useFriendsActivity';
import { FriendActivityRow } from './FriendActivityRow';

export function FriendsActivityFeed() {
  const { t, language } = useLanguage();
  const { isAuthenticated } = useAuth();
  const { events, loading } = useFriendsActivity();

  if (!isAuthenticated) return null;

  // Loading skeleton
  if (loading) {
    return (
      <div className="bg-neo-navy-light border-3 border-neo-black shadow-hard rounded-neo p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-5 h-5 rounded bg-neo-cyan/30 animate-pulse" />
          <div className="h-4 w-28 bg-neo-white/10 rounded animate-pulse" />
        </div>
        <div className="space-y-1">
          {[0, 1, 2].map((i) => (
            <div key={`skel-${i}`} className="flex items-center gap-2 h-12 px-2">
              <div className="w-6 h-6 rounded-full bg-neo-white/10 animate-pulse shrink-0" />
              <div className="flex-1 space-y-1">
                <div className="h-3 w-20 bg-neo-white/10 rounded animate-pulse" />
                <div className="h-2.5 w-32 bg-neo-white/8 rounded animate-pulse" />
              </div>
              <div className="h-2.5 w-8 bg-neo-white/8 rounded animate-pulse shrink-0" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (events.length === 0) {
    return (
      <div className="bg-neo-navy-light border-3 border-neo-black shadow-hard rounded-neo p-4">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-5 h-5 text-neo-cyan" />
          <h2 className="font-black text-neo-white uppercase text-sm">
            {t('friendsActivity.title')}
          </h2>
        </div>
        <p className="text-neo-white text-xs text-center py-3">
          {t('friendsActivity.empty')}
        </p>
        <Link
          href={`/${language}/friends`}
          className="block text-center text-neo-cyan font-bold text-xs hover:text-neo-white transition-colors"
        >
          {t('friendsActivity.addFriends')}
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-neo-navy-light border-3 border-neo-black shadow-hard rounded-neo p-4">
      <div className="flex items-center gap-2 mb-2">
        <Users className="w-5 h-5 text-neo-cyan" />
        <h2 className="font-black text-neo-white uppercase text-sm">
          {t('friendsActivity.title')}
        </h2>
      </div>
      <div>
        {events.slice(0, 4).map((event) => (
          <FriendActivityRow key={`${event.friendId}-${event.mode}`} event={event} />
        ))}
      </div>
    </div>
  );
}
