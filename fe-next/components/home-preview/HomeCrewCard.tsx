'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import { Users, Link2, Check, RotateCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useFriendsHome } from '@/hooks/friends/useFriendsHome';
import { useFriends } from '@/hooks/useFriends';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { homeCrew, SUGGEST_BELOW } from '@/lib/friends/home/crewModel';
import { RecentOpponentsList } from '@/components/friends/RecentOpponentsList';
import { useCrewAdd } from '@/components/friends/useCrewAdd';
import { CrewAvatarSlot } from './CrewAvatarSlot';
import { CrewRow } from './CrewRow';

type T = (key: string, params?: Record<string, string | number>) => string;

const SOURCE = 'home_crew';
const BUTTON =
  'rounded-lg border-[3px] border-black px-3 py-1.5 font-neo-display text-xs font-bold shadow-hard-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-pressed disabled:opacity-60 lg:text-sm';

/** The signed-in player's real crew: requests, friends with presence and rivalry, and people to add. */
export function HomeCrewCard({ lang, t }: { lang: string; t: T }) {
  const { user, profile } = useAuth();
  const enabled = !!user;
  const { data, error, loading: fetching, refresh } = useFriendsHome(enabled);
  const loading = fetching || !enabled;
  const { acceptRequest } = useFriends();
  const { add, sent, busy } = useCrewAdd(SOURCE);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const now = Date.now();
  const presence = useMemo(() => new Map((data?.presence ?? []).map((p) => [p.userId, p])), [data]);
  const { shown, more } = data ? homeCrew(data.friends, presence, now) : { shown: [], more: [] };
  const [expanded, setExpanded] = useState(false);
  const friends = expanded ? [...shown, ...more] : shown;

  const accept = useCallback(
    async (requestId: string) => {
      setAccepting(requestId);
      try {
        const res = await acceptRequest(requestId);
        if (res.success) {
          trackGrowthEvent('friend_request_accepted', { source: SOURCE, surface: SOURCE });
          await refresh();
        }
      } finally {
        setAccepting(null);
      }
    },
    [acceptRequest, refresh],
  );

  const copyInvite = useCallback(async () => {
    if (!profile?.username) return;
    const link = `${window.location.origin}/${lang}/friends?ref=${encodeURIComponent(profile.username)}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [profile, lang]);

  const showSuggestions = !!data && data.canAddFriends && data.friendCount < SUGGEST_BELOW;

  return (
    <section
      aria-labelledby="hp-crew-title"
      className="relative flex h-full min-h-[22rem] flex-col gap-3 rounded-3xl border-[3px] border-black bg-neo-pink p-4 text-black shadow-hard-lg lg:min-h-[26rem] lg:gap-4 lg:p-8"
      data-testid="hp-crew"
    >
      <div>
        <p className="flex items-center gap-1.5 font-neo-display text-xs font-bold tracking-widest uppercase lg:text-sm">
          <Users className="h-4 w-4" strokeWidth={2.75} aria-hidden="true" />
          {t('homePlay.crew.eyebrow')}
        </p>
        <h2 id="hp-crew-title" className="mt-1 font-neo-display text-xl font-bold leading-tight lg:text-4xl">
          {t('homePlay.crew.title')}
        </h2>
        <p className="mt-1 text-sm font-medium lg:text-base">{t('homePlay.crew.line')}</p>
      </div>

      {loading && (
        <ul data-testid="crew-skeleton" className="flex flex-col gap-2" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <li key={i} className="h-16 animate-pulse rounded-xl border-[3px] border-black bg-neo-cream/60" />
          ))}
        </ul>
      )}

      {error && !data && (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
          <p className="text-sm font-bold">{t('homePlay.crew.error')}</p>
          <button type="button" onClick={() => void refresh()} className={`${BUTTON} flex items-center gap-1 bg-neo-cream text-black`}>
            <RotateCw className="h-4 w-4" strokeWidth={2.75} aria-hidden="true" />
            {t('homePlay.crew.retry')}
          </button>
        </div>
      )}

      {data && data.canAddFriends && data.incoming.first.length > 0 && (
        <ul className="flex flex-col gap-2">
          {data.incoming.first.map((r) => (
            <li key={r.requestId} className="flex h-16 items-center gap-3 rounded-xl border-[3px] border-black bg-neo-yellow px-2.5">
              <CrewAvatarSlot slotKey={`crew-req-${r.userId}`} userId={r.userId} customAvatar={r.customAvatar} avatarImage={r.avatarImage} />
              <p className="min-w-0 flex-1 truncate text-sm font-bold">{t('homePlay.crew.wantsToBeFriends', { name: r.name ?? t('friends.aPlayer') })}</p>
              <button type="button" disabled={accepting === r.requestId} onClick={() => void accept(r.requestId)} className={`${BUTTON} bg-neo-lime text-black`}>
                {t('friends.acceptRequest')}
              </button>
            </li>
          ))}
          {data.incoming.count > data.incoming.first.length && (
            <li className="text-xs font-bold">
              {t('homePlay.crew.moreRequests', { count: data.incoming.count - data.incoming.first.length })}
            </li>
          )}
        </ul>
      )}

      {friends.length > 0 && (
        <ul className="flex flex-col gap-2">
          {friends.map((f) => (
            <CrewRow key={f.userId} person={f} presence={presence.get(f.userId)} now={now} lang={lang} t={t} />
          ))}
        </ul>
      )}

      {!expanded && more.length > 0 && (
        <button type="button" onClick={() => setExpanded(true)} className={`${BUTTON} self-start bg-neo-cream text-black`}>
          {t('homePlay.crew.seeMore', { count: more.length })}
        </button>
      )}

      {data && friends.length === 0 && !showSuggestions && <p className="text-sm font-medium">{t('homePlay.crew.empty')}</p>}

      {showSuggestions && data.suggestions.length > 0 && (
        <RecentOpponentsList
          people={data.suggestions}
          t={t}
          renderAvatar={(p) => <CrewAvatarSlot slotKey={`crew-sug-${p.userId}`} userId={p.userId} customAvatar={p.customAvatar} avatarImage={p.avatarImage} pixelSize={40} />}
          onAdd={(id) => void add(id)}
          sent={sent}
          busy={busy}
        />
      )}

      <div className="mt-auto flex flex-wrap items-center gap-2.5">
        {showSuggestions && profile?.username && (
          <button type="button" onClick={() => void copyInvite()} className={`${BUTTON} flex flex-1 items-center justify-center gap-1.5 bg-neo-cream text-black`}>
            {copied ? <Check className="h-4 w-4" strokeWidth={3} aria-hidden="true" /> : <Link2 className="h-4 w-4" strokeWidth={2.75} aria-hidden="true" />}
            {copied ? t('friends.linkCopied') : t('friends.copyInviteLink')}
          </button>
        )}
        <Link href={`/${lang}/friends`} className={`${BUTTON} flex-1 bg-black text-center text-neo-pink`}>
          {t('homePlay.crew.allFriends')}
        </Link>
      </div>
    </section>
  );
}
