'use client';

import Link from 'next/link';
import { useState } from 'react';
import { RivalPingButton } from '@/components/rivals/RivalPingButton';
import { pingErrorKey } from '@/lib/rivals/pingClient';
import type { RivalPingErrorCode } from '@/lib/rivals/pings';
import { crewAction, crewStatus, h2hLine, statusLine } from '@/lib/friends/home/crewModel';
import type { CrewPerson } from '@/lib/friends/home/types';
import type { FriendPresence } from '@/shared/types/friends';
import { CrewAvatarSlot } from './CrewAvatarSlot';

type T = (key: string, params?: Record<string, string | number>) => string;

const DOT: Record<string, string> = {
  in_lobby: 'bg-neo-lime',
  playing: 'bg-neo-yellow',
  online: 'bg-neo-lime',
  offline: 'bg-neo-white',
};

const ACTION =
  'shrink-0 rounded-lg border-[3px] border-black px-3 py-1.5 font-neo-display text-xs font-bold text-black shadow-hard-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-pressed lg:text-sm';

interface Props {
  person: CrewPerson;
  presence: FriendPresence | undefined;
  now: number;
  lang: string;
  t: T;
}

export function CrewRow({ person, presence, now, lang, t }: Props) {
  const status = crewStatus(person, presence, now);
  const action = crewAction(status, presence);
  const line = statusLine(status, person.lastSeenAt, now);
  const record = h2hLine(person.wins, person.losses);
  const [refusal, setRefusal] = useState<RivalPingErrorCode | null>(null);
  const name = person.name ?? t('friends.aPlayer');
  const statusText = line.when ? t(line.key, { when: t(line.when.key, line.when.params) }) : t(line.key, line.params);

  return (
    <li
      data-testid="crew-row"
      data-user={person.userId}
      className="flex h-16 items-center gap-3 rounded-xl border-[3px] border-black bg-neo-cream px-2.5 text-black"
    >
      <div className="relative">
        <CrewAvatarSlot slotKey={`crew-${person.userId}`} userId={person.userId} customAvatar={person.customAvatar} avatarImage={person.avatarImage} />
        <span className={`absolute -end-0.5 -bottom-0.5 h-3.5 w-3.5 rounded-full border-2 border-black ${DOT[status]}`} aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-neo-display text-sm font-bold lg:text-base">{name}</p>
        {refusal ? (
          <p role="status" className="truncate text-xs font-bold">{t(pingErrorKey(refusal))}</p>
        ) : (
          <p className="truncate text-xs font-medium">
            <span>{statusText}</span>
            <span aria-hidden="true"> · </span>
            <bdi dir="auto">{t(record.key, record.params)}</bdi>
          </p>
        )}
      </div>
      {action.kind === 'join' && (
        <Link href={`/${lang}/multiplayer?room=${encodeURIComponent(action.code)}`} className={`${ACTION} bg-neo-lime`}>
          {t('homePlay.crew.join')}
        </Link>
      )}
      {action.kind === 'invite' && (
        <Link href={`/${lang}/multiplayer?invite=${encodeURIComponent(person.userId)}`} className={`${ACTION} bg-neo-cyan`}>
          {t('homePlay.crew.invite')}
        </Link>
      )}
      {action.kind === 'ping' && (
        <RivalPingButton compact targetUserId={person.userId} targetName={name} context={action.situation} onRefused={setRefusal} />
      )}
    </li>
  );
}
