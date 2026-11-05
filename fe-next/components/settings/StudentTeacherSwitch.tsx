'use client';

import { useState } from 'react';
import Link from 'next/link';
import { GraduationCap } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

const K = 'settings.becomeTeacher';

/**
 * Header email signups are created as students. A teacher who then opens a
 * second account never plays on the first one. This switch promotes the
 * confirmed account they already have. The API refuses guests and unconfirmed
 * emails; the button is hidden for anyone who is already a teacher.
 */
export function StudentTeacherSwitch({ isDarkMode }: { isDarkMode: boolean }) {
  const { t, language } = useLanguage();
  const { user, profile, refreshProfile } = useAuth();
  const [status, setStatus] = useState<'idle' | 'working' | 'done' | 'unconfirmed' | 'error'>('idle');

  const role = profile?.user_role;
  const already = role === 'teacher' || role === 'admin' || profile?.is_admin === true;
  if (!user || user.is_anonymous || !user.email || !profile || already) return null;
  if (role && role !== 'student') return null;

  const onSwitch = async () => {
    if (status === 'working') return;
    setStatus('working');
    try {
      const res = await fetch('/api/account/role', { method: 'POST' });
      const body = (await res.json().catch(() => ({}))) as { ok?: boolean; code?: string };
      if (res.ok && body.ok) {
        await refreshProfile();
        setStatus('done');
        return;
      }
      setStatus(body.code === 'UNCONFIRMED' ? 'unconfirmed' : 'error');
    } catch {
      setStatus('error');
    }
  };

  return (
    <section
      data-testid="student-teacher-switch"
      className={cn(
        'rounded-neo border-3 border-neo-black p-4',
        isDarkMode ? 'bg-neo-navy-light' : 'bg-white',
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border-2 border-neo-black bg-neo-lime text-neo-navy">
          <GraduationCap className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className={cn('font-bold', isDarkMode ? 'text-white' : 'text-neo-black')}>
            {t(`${K}.title`, "I'm a teacher")}
          </h2>
          <p className={cn('mt-1 text-sm', isDarkMode ? 'text-gray-300' : 'text-gray-600')}>
            {t(`${K}.body`, 'Header signups start as students. Switch this account so you can open a class — no second login.')}
          </p>
          {status !== 'done' ? (
            <button
              type="button"
              data-testid="student-teacher-switch-cta"
              onClick={onSwitch}
              disabled={status === 'working'}
              className="mt-3 min-h-11 rounded-neo border-3 border-neo-black bg-neo-lime px-4 font-neo-display text-sm font-black text-neo-navy shadow-hard-sm disabled:opacity-60"
            >
              {status === 'working' ? t(`${K}.working`, 'Switching…') : t(`${K}.cta`, 'Switch to teacher')}
            </button>
          ) : (
            <Link
              href={`/${language}/teacher`}
              className="mt-3 inline-flex min-h-11 items-center font-bold text-neo-cyan underline decoration-2 underline-offset-4"
            >
              {t(`${K}.done`, "You're a teacher. Open your classroom.")}
            </Link>
          )}
          {status === 'unconfirmed' && (
            <p role="alert" className="mt-2 text-sm font-semibold text-neo-red">
              {t(`${K}.unconfirmed`, 'Confirm your email first, then switch.')}
            </p>
          )}
          {status === 'error' && (
            <p role="alert" className="mt-2 text-sm font-semibold text-neo-red">
              {t(`${K}.error`, 'Could not switch this account. Try again.')}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
