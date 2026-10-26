'use client';

/** Joins run through the shared entry state so auto-join, host room creation and name submit match /multiplayer. */
import Link from 'next/link';
import ClassroomJoinNamePrompt from '@/components/multiplayer/ClassroomJoinNamePrompt';
import { useMultiplayerFlowState } from '@/components/multiplayer/useMultiplayerFlowState';
import type { MultiplayerFlowProps } from '@/components/multiplayer/MultiplayerFlow';
import { getStoredUsername } from '@/utils/profileStorage';
import { cn } from '@/lib/utils';
import { EDU_MASCOT } from '@/lib/education/mascotArt';
import { MAX_PLAYERS_PER_ROOM } from '@/shared/constants/gameConstants';
import { LIVE_KEYFRAMES, PRESS, PRIMARY_BUTTON, type Translate } from './eduLiveStyles';

interface EduLiveEntryProps {
  entry: MultiplayerFlowProps;
  /** The room code straight off the URL — known on the first render, unlike session state. */
  urlRoom: string | null;
  isHost: boolean;
  /** Seated as a watcher because every seat in the room is taken. */
  isSpectator?: boolean;
  language: string;
  t: Translate;
}

function Frame({ testId, mascot, children }: { testId: string; mascot: string; children: React.ReactNode }) {
  return (
    <div data-testid={testId} className="flex min-h-0 flex-1 items-center justify-center bg-neo-navy px-4 py-8 text-neo-cream">
      <style>{LIVE_KEYFRAMES}</style>
      <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-neo-lg border-4 border-neo-cream bg-neo-navy-light p-6 text-center shadow-hard-lg">
        {/* eslint-disable-next-line @next/next/no-img-element -- mascot art map path, decorative */}
        <img src={mascot} alt="" aria-hidden="true" className="size-28 select-none motion-safe:animate-[edu-live-bob_2.4s_ease-in-out_infinite]" />
        {children}
      </div>
    </div>
  );
}

function ActiveEntry({ entry, isHost, t }: Omit<EduLiveEntryProps, 'urlRoom' | 'language' | 'isSpectator'>) {
  const flow = useMultiplayerFlowState(entry);
  const room = entry.prefilledRoom ?? '';

  if (flow.entryView === 'classroom-name' && room) {
    return (
      <div data-testid="edu-live-name" className="flex min-h-0 flex-1 flex-col bg-neo-navy">
        <ClassroomJoinNamePrompt roomCode={room} onSubmit={flow.handleClassroomNameSubmit} initialName={getStoredUsername() || ''} disabled={entry.isJoining} />
      </div>
    );
  }

  if (entry.waitingForTeacher) {
    return (
      <Frame testId="edu-live-waiting-teacher" mascot={EDU_MASCOT.tip}>
        <h1 className="font-neo-display text-2xl font-black">{t('eduLiveRoom.entry.waitingTeacher')}</h1>
        <p className="font-neo-body text-base font-bold text-neo-cream/80">{t('eduLiveRoom.entry.waitingTeacherHint')}</p>
        <span aria-hidden="true" className="h-2 w-full overflow-hidden rounded-full bg-neo-navy">
          <span className="block h-full w-1/3 animate-pulse rounded-full bg-neo-cyan motion-reduce:animate-none" />
        </span>
      </Frame>
    );
  }

  return (
    <Frame testId="edu-live-connecting" mascot={EDU_MASCOT.gameStart}>
      <p role="status" aria-live="polite" className="font-neo-display text-xl font-black">
        {t(isHost ? 'eduLiveRoom.entry.openingRoom' : 'eduLiveRoom.entry.connecting')}
      </p>
      <div aria-hidden="true" className="flex w-full flex-col gap-2">
        <span className="h-10 w-full animate-pulse rounded-neo bg-neo-navy motion-reduce:animate-none" />
        <span className="mx-auto h-4 w-2/3 animate-pulse rounded-full bg-neo-navy motion-reduce:animate-none" />
      </div>
    </Frame>
  );
}

export default function EduLiveEntry({ entry, urlRoom, isHost, isSpectator = false, language, t }: EduLiveEntryProps) {
  if (isSpectator && !isHost) {
    return (
      <Frame testId="edu-live-room-full" mascot={EDU_MASCOT.tip}>
        <h1 role="status" aria-live="polite" className="font-neo-display text-2xl font-black">{t('eduLiveRoom.entry.roomFullTitle')}</h1>
        <p className="font-neo-body text-base font-bold text-neo-cream/80">{t('eduLiveRoom.entry.roomFullHint', { max: MAX_PLAYERS_PER_ROOM })}</p>
      </Frame>
    );
  }
  if (!urlRoom && !entry.prefilledRoom) {
    const href = isHost ? `/${language}/teacher` : `/${language}/join`;
    return (
      <Frame testId="edu-live-no-room" mascot={EDU_MASCOT.empty}>
        <h1 className="font-neo-display text-2xl font-black">{t('eduLiveRoom.entry.noRoomTitle')}</h1>
        <p className="font-neo-body text-base font-bold text-neo-cream/80">
          {t(isHost ? 'eduLiveRoom.entry.noRoomHost' : 'eduLiveRoom.entry.noRoomStudent')}
        </p>
        <Link href={href} data-testid="edu-live-no-room-cta" className={cn(PRIMARY_BUTTON, PRESS, 'min-h-12 w-full px-5 text-lg')}>
          {t(isHost ? 'eduLiveRoom.entry.toTeacher' : 'eduLiveRoom.entry.enterCode')}
        </Link>
      </Frame>
    );
  }
  return <ActiveEntry entry={entry} isHost={isHost} t={t} />;
}
