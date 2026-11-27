'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import type { HolidayKey } from '@/lib/holidays/calendar';
import { holidayApi } from './holidayApi';
import { captureHolidayInvite, tableCodeFrom } from './holidayShare';

const AuthModal = dynamic(() => import('@/components/auth/AuthModal'), { ssr: false });

type State = 'idle' | 'joining' | 'joined' | 'full' | 'not_found' | 'closed' | 'in_other_table' | 'error';

export default function HolidayTableJoinPrompt({ holiday }: { holiday: HolidayKey }) {
  const { t } = useLanguage();
  const { user, loading } = useAuth();
  const [code, setCode] = useState<string | null>(null);
  const [state, setState] = useState<State>('idle');
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    captureHolidayInvite(window.location.search);
    setCode(tableCodeFrom(window.location.search));
  }, []);

  if (!code || loading) return null;

  const join = async () => {
    setState('joining');
    try {
      const r = await holidayApi.tableAction('join', { code });
      setState(r.status === 'ok' ? 'joined' : r.status);
    } catch {
      setState('error');
    }
  };

  const message: Partial<Record<State, string>> = {
    joined: t('holiday.table.joined', 'You’re at the table! Play today’s daily to add to the group goal.'),
    full: t('holiday.table.full', 'This table is full (8 players).'),
    not_found: t('holiday.table.notFound', 'That table link doesn’t work anymore.'),
    closed: t('holiday.table.closed', 'This holiday table has closed.'),
    in_other_table: t('holiday.table.inOther', 'You already sit at another table. Leave it first to join this one.'),
    error: t('holiday.table.error', 'Couldn’t join right now. Try again.'),
  };

  return (
    <div data-testid="holiday-table-join" className="mt-3 rounded-xl border-2 border-black bg-neo-navy p-2">
      <div className="flex items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/holidays/table-${holiday}.webp`} alt="" width={160} height={120} className="h-12 w-auto" />
        <p className="flex-1 text-xs font-bold">
          {message[state] ?? t('holiday.table.invited', 'A friend saved you a seat at their holiday table.')}
        </p>
      </div>
      {(state === 'idle' || state === 'error') && (
        <button
          type="button"
          onClick={user ? join : () => setAuthOpen(true)}
          className="mt-2 w-full rounded-xl border-[3px] border-black bg-neo-holiday-gold px-3 py-2 font-neo-display text-sm font-bold text-neo-navy shadow-hard-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-pressed"
        >
          {user ? t('holiday.table.join', 'Take my seat') : t('holiday.table.signInToJoin', 'Sign in to take your seat')}
        </button>
      )}
      {!user && <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} initialMode="signup" />}
    </div>
  );
}
