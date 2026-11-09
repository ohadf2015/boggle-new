'use client';

/** DEV-ONLY `?preview=setup` (`&count=N`, default 6, 0 keeps the room empty): the real invite step with students landing one by one. */

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { EducationHeader } from '@/components/education/EducationHeader';
import { ClassSetupInviteView } from '@/components/education/ClassSetupInviteView';
import { classroomJoinUrl, joinAddressForDisplay } from '@/lib/education/classroomInvitePayload';
import type { RosterStudent } from '@/components/teacher/hq/rosterModel';
import { cn } from '@/lib/utils';

type T = (key: string, params?: Record<string, string | number>) => string;

const NAMES = ['Maya', 'Leo', 'Noa', 'Ari', 'Sofia', 'Omar', 'Yuki', 'Lucas', 'Emma', 'Dan'];
const CLASSROOM = { name: '7B English', join_code: 'BLDA7Q' };

export function SetupInvitePreview() {
  const { t, language } = useLanguage();
  const params = useSearchParams();
  const total = Math.max(0, Math.min(NAMES.length, Number(params?.get('count') ?? 6) || 0));
  const all = useMemo<RosterStudent[]>(() => NAMES.slice(0, total).map((name, i) => ({ id: `s${i}`, name, avatar: null })), [total]);
  const [shown, setShown] = useState(0);
  const [origin, setOrigin] = useState('');
  useEffect(() => setOrigin(window.location.origin), []);
  useEffect(() => {
    if (shown >= all.length) return;
    const id = window.setTimeout(() => setShown((n) => n + 1), shown === 0 ? 2500 : 900);
    return () => window.clearTimeout(id);
  }, [shown, all.length]);

  const students = all.slice(0, shown);
  const roster = { students, arrivals: students.slice(-1).map((s) => s.id), loading: false };

  return (
    <div className={cn('fixed inset-0 z-[80] flex flex-col overflow-y-auto overscroll-contain bg-neo-navy', language === 'he' && 'rtl')}>
      <EducationHeader compact showBackButton title={t('eduShell.setup.title')} />
      <ClassSetupInviteView
        classroom={CLASSROOM}
        roster={roster}
        joinUrl={origin ? classroomJoinUrl(origin, language, CLASSROOM.join_code) : ''}
        displayHost={origin ? `${joinAddressForDisplay(origin)}/${language}/join` : ''}
        startHref="#"
        homeHref={`/${language}/teacher`}
        reduced={false}
        onShare={() => toast('Preview: share')}
        onOpenProjector={() => toast('Preview: projector')}
        t={t as T}
      />
    </div>
  );
}

export default SetupInvitePreview;
