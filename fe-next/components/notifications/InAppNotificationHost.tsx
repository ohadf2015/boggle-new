'use client';

/**
 * Global in-app banners for social events that already send a push (friend
 * request, gift, tower wreck, rival ping, async challenge, …). The server
 * emits `notify:inApp` to `user:<id>` (and writes a history row that Realtime
 * can deliver on pages without a socket). Game invites stay on
 * IncomingChallengeToast so they keep Join/Not now + room routing.
 */
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { subscribeToNotifications, type RealtimeNotification } from '@/lib/supabaseRealtimeNotifications';
import { acceptFriendRequest } from '@/utils/friends';
import { useSocketOptional } from '@/utils/SocketContext';
import { LIVE_NOTICE_EVENT, type LiveNotice } from '@/shared/liveNotice';

/** Types already given a dedicated in-app surface, or self-generated celebrations. */
const SKIP_TYPES = new Set([
  'game_invite',
  'direct_message',
  'challenge_accepted',
  'challenge_declined',
  'challenge_result',
  'achievement',
  'level_up',
  'daily_challenge',
]);

const FRIEND_CHALLENGE_ENTITY = 'friend_challenge';

const action =
  'inline-flex min-h-[44px] flex-1 items-center justify-center rounded-lg border-2 border-neo-black px-3 font-black text-neo-black shadow-hard-sm transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-60';

type Banner = {
  id: string;
  type: string;
  title: string;
  body: string;
  deepLink?: string;
  requestId?: string;
};

function fromLive(n: LiveNotice): Banner | null {
  if (!n?.type || SKIP_TYPES.has(n.type)) return null;
  return {
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    deepLink: n.deepLink,
    requestId: n.requestId,
  };
}

function fromRealtime(n: RealtimeNotification): Banner | null {
  if (n.related_entity_type === FRIEND_CHALLENGE_ENTITY) return null;
  // History rows store the coarse category (social/gift/…) in notification_type.
  // Prefer action_url + title, and skip rows IncomingChallengeToast already shows.
  if (!n.title) return null;
  const typeGuess = n.notification_type === 'gift' ? 'gift_received' : n.notification_type;
  if (SKIP_TYPES.has(typeGuess)) return null;
  return {
    id: n.id,
    type: typeGuess,
    title: n.title,
    body: n.body,
    deepLink: n.action_url ?? undefined,
  };
}

function fromFriendRequest(data: { requestId?: string; fromUserId?: string; fromName?: string }, t: (k: string, p?: Record<string, string>) => string): Banner | null {
  if (!data?.requestId && !data?.fromUserId) return null;
  const name = data.fromName || t('friends.aPlayer');
  return {
    id: data.requestId || `friend-request:${data.fromUserId}`,
    type: 'friend_request',
    title: t('friends.requestReceivedToast', { name }),
    body: '',
    deepLink: '/friends?tab=requests',
    requestId: data.requestId,
  };
}

export function InAppNotificationHost() {
  const { isAuthenticated, profile } = useAuth();
  const me = isAuthenticated ? profile?.id ?? null : null;
  if (!me) return null;
  return <Host me={me} />;
}

function Host({ me }: { me: string }) {
  const { t, language } = useLanguage();
  const router = useRouter();
  const socketContext = useSocketOptional();
  const socket = socketContext?.isConnected ? socketContext.socket : null;
  const [banner, setBanner] = useState<Banner | null>(null);
  const [busy, setBusy] = useState(false);
  const seen = useState(() => new Set<string>())[0];

  const show = useCallback((next: Banner | null) => {
    if (!next || seen.has(next.id)) return;
    seen.add(next.id);
    setBanner((current) => current ?? next);
  }, [seen]);

  useEffect(() => {
    if (!socket) return;
    const onNotice = (data: LiveNotice) => show(fromLive(data));
    const onRequest = (data: { requestId?: string; fromUserId?: string; fromName?: string }) => {
      show(fromFriendRequest(data, t as (k: string, p?: Record<string, string>) => string));
    };
    socket.on(LIVE_NOTICE_EVENT, onNotice);
    socket.on('friends:requestReceived', onRequest);
    return () => {
      socket.off(LIVE_NOTICE_EVENT, onNotice);
      socket.off('friends:requestReceived', onRequest);
    };
  }, [socket, show, t]);

  useEffect(() => {
    return subscribeToNotifications(me, (n) => show(fromRealtime(n)), undefined, 'in-app-notice-host');
  }, [me, show]);

  const dismiss = () => setBanner(null);

  const open = () => {
    const href = banner?.deepLink;
    dismiss();
    if (!href) return;
    const path = href.startsWith('/') ? `/${language}${href}` : href;
    router.push(path);
  };

  const accept = async () => {
    if (!banner?.requestId) {
      open();
      return;
    }
    setBusy(true);
    const res = await acceptFriendRequest(banner.requestId).catch(() => ({ success: false }));
    setBusy(false);
    dismiss();
    if (res && 'success' in res && res.success === false) return;
    router.push(`/${language}/friends?tab=friends`);
  };

  if (!banner) return null;
  const canAccept = banner.type === 'friend_request';

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="in-app-notice"
      data-notice-type={banner.type}
      className="pointer-events-none fixed inset-x-0 top-0 z-[90] flex justify-center px-4 pt-[max(env(safe-area-inset-top),0.75rem)]"
    >
      <div className="pointer-events-auto w-full max-w-sm rounded-2xl border-[3px] border-neo-black bg-neo-pink p-3 shadow-hard-lg">
        <div className="flex items-start gap-3">
          <p dir="auto" className="min-w-0 flex-1 font-neo-display text-base font-bold leading-tight text-neo-black">
            {banner.title}
            {banner.body ? <span className="mt-0.5 block font-neo-body text-sm font-semibold">{banner.body}</span> : null}
          </p>
          <button
            type="button"
            aria-label={t('friends.challenges.toast.close')}
            onClick={dismiss}
            className="-me-1 -mt-1 inline-flex min-h-[44px] min-w-[44px] items-center justify-center text-xl font-black text-neo-black"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={dismiss} className={`${action} bg-neo-white`}>
            {t('friends.challenges.toast.notNow')}
          </button>
          {canAccept ? (
            <button type="button" disabled={busy} onClick={() => void accept()} className={`${action} bg-neo-lime`}>
              {t('friends.acceptRequest')}
            </button>
          ) : (
            <button type="button" onClick={open} className={`${action} bg-neo-lime`}>
              {t('friends.open')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default InAppNotificationHost;
