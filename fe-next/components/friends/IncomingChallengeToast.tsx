'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import Avatar from '@/components/Avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { resolveDisplayName } from '@/lib/displayName';
import { useInGameSurface } from '@/lib/inGameSurface';
import { subscribeToNotifications } from '@/lib/supabaseRealtimeNotifications';
import { useSocketOptional } from '@/utils/SocketContext';
import type { FriendChallenge } from '@/utils/friendsTypes';
import { getPendingChallenges } from '@/utils/friendsHeadToHead';
import { acceptChallenge } from './challengeActions';
import { useChallengeOutcomes } from './useChallengeOutcomes';

/** A live invite is worth a pop-up only while the room is likely still open; older ones wait on /friends. */
const LIVE_WINDOW_MS = 30 * 60 * 1000;
const DISMISSED_KEY = 'lexiclash:challenge-toast-dismissed';
/** Matches backend pushNotificationTriggers FRIEND_CHALLENGE_ENTITY on the invite's in-app row. */
const FRIEND_CHALLENGE_ENTITY = 'friend_challenge';
const DEFERRED_ACCEPT_KEY = 'lexiclash:challenge-accept-deferred';

const action =
  'inline-flex min-h-[44px] flex-1 items-center justify-center rounded-lg border-2 border-neo-black px-3 font-black text-neo-black shadow-hard-sm transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-60';

function readDismissed(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(DISMISSED_KEY) ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}

function writeDismissed(ids: Set<string>) {
  try {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids].slice(-50)));
  } catch {
    /* storage blocked: the card simply returns next visit */
  }
}

function takeDeferredAccept(): string | null {
  try {
    const id = sessionStorage.getItem(DEFERRED_ACCEPT_KEY);
    sessionStorage.removeItem(DEFERRED_ACCEPT_KEY);
    return id;
  } catch {
    return null;
  }
}

function isLive(c: FriendChallenge, now: number) {
  return c.status === 'pending' && now - new Date(c.createdAt).getTime() < LIVE_WINDOW_MS;
}

/** Friend challenges on any page: Join/Not now for the invitee, routing (or a Join card mid-round) for the challenger. */
// Limit: the challenger hears accepted/declined/result only on pages with a socket (game routes); elsewhere, push only.
export function IncomingChallengeToast() {
  const { isAuthenticated, profile } = useAuth();
  const me = isAuthenticated ? profile?.id ?? null : null;
  if (!me) return null;
  return <ChallengeCards me={me} />;
}

function ChallengeCards({ me }: { me: string }) {
  const { t, language } = useLanguage();
  const router = useRouter();
  const pathname = usePathname() ?? '';
  const inGame = useInGameSurface();
  const [pendingChallenges, setPendingChallenges] = useState<FriendChallenge[]>([]);
  const socketContext = useSocketOptional();
  const socket = socketContext?.isConnected ? socketContext.socket : null;
  const [dismissed, setDismissed] = useState(readDismissed);
  const [busy, setBusy] = useState(false);

  const goToRoom = useCallback(
    (roomCode: string) => router.push(`/${language}/multiplayer?room=${encodeURIComponent(roomCode)}`),
    [router, language],
  );
  const inMultiplayer = pathname.includes('/multiplayer');
  const { ready, clearReady } = useChallengeOutcomes({
    socket,
    me,
    t,
    where: () => ({ inGame, inMultiplayer }),
    goToRoom,
  });

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  const incoming = useMemo(
    () => pendingChallenges.find((c) => !dismissed.has(c.id) && isLive(c, now)) ?? null,
    [pendingChallenges, dismissed, now],
  );

  const dismiss = (id: string) => {
    const next = new Set(dismissed).add(id);
    writeDismissed(next);
    setDismissed(next);
  };

  // One fetch on mount plus one per realtime invite row: no polling on every page.
  const load = useCallback(async () => {
    const list = await getPendingChallenges(me).catch(() => null);
    if (list) setPendingChallenges(list);
  }, [me]);
  useEffect(() => {
    void load();
  }, [load]);

  useEffect(
    () =>
      subscribeToNotifications(
        me,
        (n) => {
          if (n.related_entity_type === FRIEND_CHALLENGE_ENTITY) void load();
        },
        undefined,
        'friend-challenges',
      ),
    [me, load],
  );

  useEffect(() => {
    if (!socket) return;
    const id = takeDeferredAccept();
    if (!id) return;
    void acceptChallenge(socket, id).then((roomCode) => {
      if (!roomCode) toast.error(t('friends.challenges.acceptFailed'));
    });
  }, [socket, t]);

  const join = async (c: FriendChallenge) => {
    // No socket off the game routes, and a REST accept never reaches the challenger: let the room page accept.
    if (!socket) {
      try {
        sessionStorage.setItem(DEFERRED_ACCEPT_KEY, c.id);
      } catch {
        /* storage blocked: still join the room */
      }
      dismiss(c.id);
      goToRoom(c.challengeCode);
      return;
    }
    setBusy(true);
    const roomCode = await acceptChallenge(socket, c.id);
    setBusy(false);
    if (!roomCode) {
      toast.error(t('friends.challenges.acceptFailed'));
      return;
    }
    dismiss(c.id);
    goToRoom(roomCode);
  };

  if (ready) {
    return (
      <Card label={t('friends.challenges.friendAccepted', { name: ready.name })} onClose={clearReady} closeLabel={t('friends.challenges.toast.close')}>
        <button
          type="button"
          onClick={() => {
            clearReady();
            goToRoom(ready.roomCode);
          }}
          className={`${action} bg-neo-lime`}
        >
          {t('friends.challenges.toast.join')}
        </button>
      </Card>
    );
  }

  if (!incoming || inGame) return null;
  const name = resolveDisplayName([incoming.challengerDisplayName, incoming.challengerUsername], t('friends.aPlayer'));

  return (
    <Card
      label={t('friends.challenges.toast.title', { name })}
      onClose={() => dismiss(incoming.id)}
      closeLabel={t('friends.challenges.toast.close')}
      avatar={
        <Avatar
          avatarImage={incoming.challengerAvatarImage}
          customAvatar={incoming.challengerCustomAvatar}
          userId={incoming.challengerId}
          size="sm"
        />
      }
    >
      <button type="button" onClick={() => dismiss(incoming.id)} className={`${action} bg-neo-white`}>
        {t('friends.challenges.toast.notNow')}
      </button>
      <button type="button" disabled={busy} onClick={() => join(incoming)} className={`${action} bg-neo-lime`}>
        {t('friends.challenges.acceptAndPlay')}
      </button>
    </Card>
  );
}

function Card({
  label,
  avatar,
  onClose,
  closeLabel,
  children,
}: {
  label: string;
  avatar?: React.ReactNode;
  onClose: () => void;
  closeLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="incoming-challenge-toast"
      className="pointer-events-none fixed inset-x-0 top-0 z-[91] flex justify-center px-4 pt-[max(env(safe-area-inset-top),0.75rem)]"
    >
      <div className="pointer-events-auto w-full max-w-sm rounded-2xl border-[3px] border-neo-black bg-neo-cyan p-3 shadow-hard-lg">
        <div className="flex items-center gap-3">
          {avatar && <div className="shrink-0 rounded-full border-2 border-neo-black bg-neo-white">{avatar}</div>}
          <p dir="auto" className="min-w-0 flex-1 font-neo-display text-base font-bold leading-tight text-neo-black">
            <span aria-hidden="true" className="me-1">⚔️</span>
            {label}
          </p>
          <button
            type="button"
            aria-label={closeLabel}
            onClick={onClose}
            className="-me-1 -mt-1 inline-flex min-h-[44px] min-w-[44px] items-center justify-center text-xl font-black text-neo-black"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>
        <div className="mt-3 flex gap-2">{children}</div>
      </div>
    </div>
  );
}

export default IncomingChallengeToast;
