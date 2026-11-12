'use client';

import type { ReactNode } from 'react';
import { UserPlus, Check } from 'lucide-react';
import { h2hLine } from '@/lib/friends/home/crewModel';
import type { CrewPerson } from '@/lib/friends/home/types';

type T = (key: string, params?: Record<string, string | number>) => string;

interface Props {
  people: readonly CrewPerson[];
  t: T;
  renderAvatar: (person: CrewPerson) => ReactNode;
  onAdd: (userId: string) => void;
  sent: ReadonlySet<string>;
  busy: string | null;
}

/** Players you just played, each one tap away from a friend request. */
export function RecentOpponentsList({ people, t, renderAvatar, onAdd, sent, busy }: Props) {
  return (
    <div data-testid="recent-opponents">
      <p className="text-sm font-bold">{t('friends.recent.title')}</p>
      <ul className="mt-2 flex flex-col gap-2">
        {people.map((p) => {
          const line = h2hLine(p.wins, p.losses);
          const isSent = sent.has(p.userId);
          return (
            <li key={p.userId} className="flex items-center gap-3 rounded-xl border-[3px] border-black bg-neo-cream px-2.5 py-2 text-black">
              {renderAvatar(p)}
              <div className="min-w-0 flex-1">
                <p className="truncate font-neo-display text-sm font-bold">{p.name ?? t('friends.aPlayer')}</p>
                <p className="truncate text-xs font-medium">
                  <bdi dir="auto">{t(line.key, line.params)}</bdi>
                </p>
              </div>
              {isSent ? (
                <span className="flex items-center gap-1 text-xs font-bold">
                  <Check className="h-4 w-4" strokeWidth={3} aria-hidden="true" />
                  {t('friends.recent.sent')}
                </span>
              ) : (
                <button
                  type="button"
                  disabled={busy === p.userId}
                  onClick={() => onAdd(p.userId)}
                  aria-label={t('friends.recent.addName', { name: p.name ?? t('friends.aPlayer') })}
                  className="flex items-center gap-1 rounded-lg border-[3px] border-black bg-neo-lime px-2.5 py-1.5 font-neo-display text-xs font-bold text-black shadow-hard-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-pressed disabled:opacity-60"
                >
                  <UserPlus className="h-4 w-4" strokeWidth={2.75} aria-hidden="true" />
                  {t('friends.recent.add')}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
