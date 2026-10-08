'use client';

import { useEffect, useState } from 'react';
import { Flame } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { ClassHubState } from '@/lib/education/classroomHub';

interface Props {
  classroomId: string;
  reducedMotion: boolean;
}

type Load = { status: 'loading' } | { status: 'ready'; hub: ClassHubState } | { status: 'error' };

/**
 * The class streak flame and the "ask your teacher for a rematch" button.
 * The rematch is a yes/no ask: no text field, so nothing a child types reaches
 * a teacher through this door.
 */
export function ClassStrip({ classroomId, reducedMotion }: Props) {
  const { t } = useLanguage();
  const [load, setLoad] = useState<Load>({ status: 'loading' });
  const [asking, setAsking] = useState(false);
  const [askFailed, setAskFailed] = useState(false);
  const [askedNow, setAskedNow] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/education/classroom/${classroomId}/hub`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`hub ${res.status}`);
        return (await res.json()) as ClassHubState;
      })
      .then((hub) => { if (!cancelled) setLoad({ status: 'ready', hub }); })
      .catch(() => { if (!cancelled) setLoad({ status: 'error' }); });
    return () => { cancelled = true; };
  }, [classroomId]);

  if (load.status === 'loading') return null;
  if (load.status === 'error') {
    return <p role="alert" className="font-neo-body text-xs font-bold text-neo-black/70">{t('common.error')}</p>;
  }

  const { hub } = load;
  const asked = hub.rematchRequestedToday || askedNow;

  const ask = async () => {
    setAsking(true);
    setAskFailed(false);
    try {
      const res = await fetch(`/api/education/classroom/${classroomId}/rematch`, { method: 'POST' });
      if (!res.ok) throw new Error(`rematch ${res.status}`);
      setAskedNow(true);
    } catch {
      setAskFailed(true);
    } finally {
      setAsking(false);
    }
  };

  return (
    <section className="mb-3 flex flex-col gap-2 rounded-neo border-3 border-neo-black bg-neo-white p-3 text-neo-black shadow-hard-sm">
      <div className="flex items-center gap-3">
        <Flame
          aria-hidden="true"
          className={`h-7 w-7 shrink-0 ${hub.streak > 0 ? 'text-neo-pink' : 'text-neo-black/30'} ${
            hub.streak > 0 && !reducedMotion ? 'motion-safe:animate-pulse' : ''
          }`}
        />
        <div className="min-w-0">
          <p className="font-neo-display text-sm font-black uppercase">{t('student.classStrip.title')}</p>
          <p className="font-neo-body text-sm font-bold">
            {hub.streak > 0
              ? t('student.classStrip.streakDays', { count: hub.streak })
              : t('student.classStrip.noStreakYet')}
          </p>
          <p className="font-neo-body text-xs text-neo-black/70">
            {hub.playedToday ? t('student.classStrip.playedToday') : t('student.classStrip.notPlayedToday')}
          </p>
        </div>
      </div>

      {asked ? (
        <p className="font-neo-body text-sm font-bold">{t('student.classStrip.askedToday')}</p>
      ) : (
        <button
          type="button"
          onClick={ask}
          disabled={asking}
          className="min-h-[44px] rounded-neo border-3 border-black bg-neo-lime px-4 py-2 font-neo-display text-sm font-black text-neo-black shadow-hard-sm transition-all hover:shadow-hard-pressed active:translate-x-[2px] active:translate-y-[2px] disabled:opacity-60"
        >
          {t('student.classStrip.askRematch')}
        </button>
      )}

      {askFailed && (
        <p role="alert" className="font-neo-body text-xs font-bold text-neo-pink">
          {t('student.classStrip.askFailed')}
        </p>
      )}
    </section>
  );
}
