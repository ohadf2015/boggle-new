'use client';

import { useEffect, useState } from 'react';
import { TriangleAlert } from 'lucide-react';
import { fetchWithAuth } from '@/utils/authFetch';
import logger from '@/utils/logger';
import { pluralKey } from '@/lib/i18n/pluralKey';

const LATE_JOINS = { one: 'eduLive.lobby.lateJoinsOne', other: 'eduLive.lobby.lateJoins' };

/**
 * On the host lobby: students who hit the ended code in the last 10 minutes.
 * Reads recentCount, which survives a new live game — the HQ tally is cleared
 * the moment a room is open, which is exactly when the teacher needs this line.
 */
export function LobbyLateJoinNotice({
  classroomId,
  t,
  language,
}: {
  classroomId: string | null;
  t: (key: string, params?: Record<string, string | number>) => string;
  language: string;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!classroomId) return;
    let alive = true;
    setCount(0);
    fetchWithAuth(`/api/education/classroom/${classroomId}/ended-code-tries`)
      .then((res) => (res.ok ? res.json() : null))
      .then((body: { recentCount?: number } | null) => {
        if (alive) setCount(typeof body?.recentCount === 'number' ? body.recentCount : 0);
      })
      .catch((err) => logger.warn('lobby late-join read threw:', err));
    return () => {
      alive = false;
    };
  }, [classroomId]);

  if (!classroomId || count < 1) return null;

  return (
    <p
      data-testid="lobby-late-joins"
      role="status"
      className="flex items-center gap-2 rounded-neo border-[3px] border-neo-black bg-neo-yellow px-3 py-2 font-neo-display text-sm font-black text-neo-black"
    >
      <TriangleAlert className="size-5 shrink-0" strokeWidth={2.5} aria-hidden />
      <span>{t(pluralKey(LATE_JOINS, count, language), { count })}</span>
    </p>
  );
}
