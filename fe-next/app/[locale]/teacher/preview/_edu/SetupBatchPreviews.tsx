'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { AuthContext, useAuth, type AuthContextValue } from '@/contexts/AuthContext';
import { EducationShell } from '@/components/education/shell/EducationShell';
import { ClassSetupInviteView } from '@/components/education/ClassSetupInviteView';
import { SavedListCard } from '@/components/teacher/setup/SavedListCard';
import { PlayNowButton } from '@/components/teacher/setup/FirstGameWords';
import { ClassPageView } from '@/components/teacher/classroom/page/ClassPageView';
import { HomeClassRoster } from '@/components/teacher/home/HomeClassRoster';
import { rosterFixture } from '@/components/teacher/home/rosterFixture';
import { rosterRows } from '@/components/teacher/home/rosterModel';
import { fixtureFor } from './fixtures';

type T = (key: string, params?: Record<string, string | number>) => string;
const noop = () => undefined;

export function PreviewTeacherAuth({ children }: { children: ReactNode }) {
  const base = useAuth();
  const value = useMemo<AuthContextValue>(() => ({
    ...base,
    user: { id: 'preview-teacher-dana' } as AuthContextValue['user'],
    profile: { ...base.profile, display_name: 'Dana' } as AuthContextValue['profile'],
  }), [base]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function usePreviewT(): { t: T; language: string } {
  const { t, language } = useLanguage();
  return { t: t as T, language };
}

/** The invite step right after setup with the teacher's pasted words saved; v=joined has three students in. */
export function InvitePreview({ v }: { v?: string }) {
  const { t, language } = usePreviewT();
  const f = fixtureFor(language);
  const students = v === 'joined' ? [f.me, f.shortRival, f.classmates[0]].map((name, i) => ({ id: `s${i}`, name, avatar: null })) : [];
  const origin = 'https://www.lexiclash.live';
  return (
    <PreviewTeacherAuth>
      <EducationShell scrollRegionLabel={t('eduShell.setup.title')} tabs={false}>
        <main>
          <ClassSetupInviteView
            classroom={{ name: f.className, join_code: 'BLDA7Q' }}
            roster={{ students, arrivals: [], loading: false }}
            joinUrl={`${origin}/${language}/join/BLDA7Q`}
            displayHost={`lexiclash.live/${language}/join`}
            startHref="#"
            homeHref={`/${language}/teacher`}
            reduced
            onShare={noop}
            onOpenProjector={noop}
            words={<SavedListCard list={v === 'loading' ? { status: 'loading' } : { status: 'ready', name: t('eduShell.setup.words.listName', { date: '11/11' }), words: f.words }} onChangeWords={noop} t={t} />}
            play={<PlayNowButton onClick={noop} t={t} />}
            t={t}
          />
        </main>
      </EducationShell>
    </PreviewTeacherAuth>
  );
}

/** The class page with a 12-student roster, three lists and last week's game; v=new is a class nobody has played yet. */
export function ClassPagePreview({ v }: { v?: string }) {
  const { t, language } = usePreviewT();
  const f = fixtureFor(language);
  const [nowMs] = useState(() => Date.now());
  const fresh = v === 'new';
  const rows = useMemo(() => (fresh ? [] : rosterRows(rosterFixture('p7b', 12, nowMs), nowMs)), [fresh, nowMs]);
  const lists = fresh ? [] : [
    { id: 'l1', name: f.className, wordCount: f.words.length },
    { id: 'l2', name: t('eduShell.setup.words.listName', { date: '11/4' }), wordCount: 9 },
    { id: 'l3', name: t('eduShell.setup.words.listName', { date: '10/28' }), wordCount: 14 },
  ];
  const game = fresh ? null : {
    playedAt: new Date(nowMs - 86_400_000).toISOString(),
    players: [{ name: f.me, score: 64 }, { name: f.shortRival, score: 60 }],
    participation: { played: 11, roster: 12 },
    coveragePct: 83,
  };
  return (
    <PreviewTeacherAuth>
      <EducationShell scrollRegionLabel={t('teacher.nav.classes')} contentClassName="p-4 sm:p-6 lg:px-8 lg:py-5">
        <main>
          <ClassPageView
            classroom={{ id: 'p7b', name: f.className, join_code: 'BLDA7Q', language, member_count: fresh ? 0 : 12 }}
            language={language}
            classesHref="#"
            startHref="#"
            resultsHref="#"
            libraryHref="#"
            roster={<HomeClassRoster rows={rows} failed={false} language={language} nowMs={nowMs} t={t} />}
            lists={lists}
            listsLoading={false}
            lastGame={{ status: 'ready', game }}
            onShare={noop}
            onRequestDelete={noop}
            t={t}
          />
        </main>
      </EducationShell>
    </PreviewTeacherAuth>
  );
}
