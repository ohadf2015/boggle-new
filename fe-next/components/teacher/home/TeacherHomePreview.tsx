'use client';

import { useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { AuthContext, useAuth, type AuthContextValue } from '@/contexts/AuthContext';
import { summarizeTeacherWeek, type TeacherActivityRow } from '@/lib/education/teacherWeekStats';
import { homeCoachCue, homeSessionRail } from '@/lib/education/homeSessionRail';
import { homeOnboarding } from '@/lib/education/homeOnboarding';
import { isPackLanguage } from '@/lib/education/themedPacks';
import { FREE_TIER_LIMITS } from '@/lib/education/freeTierLimits';
import { SESSIONS_BESIDE_RAIL, TeacherHomeView } from './TeacherHomeView';
import { HomeHero } from './HomeHero';
import { HomeClassMeta, HomeNewClass } from './HomeClassList';
import { HomeClassRoster } from './HomeClassRoster';
import { rosterRows } from './rosterModel';
import { rosterFixture } from './rosterFixture';
import { HomeOnboardingCard } from './HomeOnboardingCard';
import { HomeSessionRail } from './HomeSessionRail';
import { HomeWeekClasses } from './HomeWeekClasses';
import { weekClassRows } from './weekClassRows';
import { HomeWeekLoop } from './HomeWeekLoop';
import { weekLoopFixture } from './weekLoopFixture';
import { missedLastGame, playAgainTarget, readyForTest, replayDetail } from './weekLoopModel';
import { previewBanner } from './TeacherProBannersPreview';

export type TeacherHomePreviewState = 'classes' | 'empty' | 'loading';

type T = (key: string, params?: Record<string, string | number>) => string;

const HOUR = 3_600_000;
const CLASSES = [
  { id: 'p5b', name: '5B - English', member_count: 28, join_code: 'K7Q2' },
  { id: 'p4a', name: '4A - Reading', member_count: 26, join_code: 'ZT41' },
  { id: 'p6c', name: '6C - Spelling', member_count: 24, join_code: 'M3XP' },
];
const WEEK_ROWS = 4;
const noopSubscribe = () => () => undefined;
const PLAYS: [string, number][] = [['p5b', 3], ['p5b', 26], ['p4a', 50], ['p5b', 74], ['p6c', 98], ['p4a', 122]];

function activity(nowMs: number): TeacherActivityRow[] {
  return PLAYS.map(([classroom_id, hoursAgo], i) => ({
    classroom_id,
    completed_at: new Date(nowMs - hoursAgo * HOUR).toISOString(),
    game_code: `PRV${i}`,
  }));
}

/** Dev-only: the real Home grid on fixture data, so the signed-in screen can be captured without an account. */
export function TeacherHomePreview({ state, banner }: { state: TeacherHomePreviewState; banner?: string }) {
  const { t: rawT, language } = useLanguage();
  const t = rawT as T;
  const [nowMs] = useState(() => Date.now());
  const [selectedId, setSelectedId] = useState(CLASSES[0].id);
  const classes = state === 'classes' ? CLASSES : [];
  // Skeleton until mounted: the insight cursor and clock differ between server and browser.
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const ready = mounted && state !== 'loading';
  const hasClasses = classes.length > 0;
  const selected = classes.find((c) => c.id === selectedId) ?? null;

  const summary = useMemo(() => summarizeTeacherWeek(activity(nowMs), CLASSES, nowMs), [nowMs]);
  const rosterInput = selected ? rosterFixture(selected.id, selected.member_count, nowMs) : null;
  const roster = rosterInput ? rosterRows(rosterInput, nowMs) : null;
  const loop = selected && rosterInput ? weekLoopFixture(selected.id, rosterInput, language, nowMs) : null;
  const replay = loop && selected ? playAgainTarget({ game: loop.game, lessons: loop.lessons, classroomId: selected.id, locale: language }) : null;

  const lastPlayedIso = selected ? summary.lastPlayedAt[selected.id] : undefined;
  const lastPlayedMs = lastPlayedIso ? Date.parse(lastPlayedIso) : null;
  const railLanguage = isPackLanguage(language) ? language : 'en';
  const cue = homeCoachCue({ nowMs, lastPlayedMs, everPlayed: true, rail: homeSessionRail({ language: railLanguage, gradeBand: null, nowMs, lastPlayedMs }) });
  const onboarding = homeOnboarding({ classroomCount: 0, studentCount: 0, inviteCopied: false, liveStarted: false, roomOpened: false, gamesPlayed: 0, dismissed: false });
  const newClassHref = `/${language}/teacher/classroom/new`;
  const hrefs = { createClass: newClassHref, shareCode: newClassHref, tryDemo: newClassHref };

  return (
    <PreviewTeacherAuth>
    <TeacherHomeView
      t={t}
      isRTL={language === 'he'}
      greeting={t('eduShell.home.greetMorning', { name: 'Dana' })}
      cue={ready && hasClasses ? (cue ? t(cue.key) : '') : null}
      hasPro={false}
      ready={ready}
      error={false}
      onRetry={() => undefined}
      hasClasses={hasClasses}
      onboarding={<HomeOnboardingCard onboarding={onboarding} hrefs={hrefs} variant="full" t={t} />}
      desk={selected ? (
        <>
        <div data-tm>
          <HomeHero
            classrooms={classes}
            selectedId={selected.id}
            onSelect={setSelectedId}
            language={language}
            t={t}
            corner={<HomeNewClass href={newClassHref} count={classes.length} limit={null} t={t} />}
            capLabel={t('eduShell.setup.capMeter', { count: classes.length, limit: FREE_TIER_LIMITS.classes })}
            meta={
              <HomeClassMeta previewIds={[]} memberCount={selected.member_count} played={lastPlayedIso} pending={false} failed={false} language={language} nowMs={nowMs} t={t} />
            }
            showCode
            replay={replay ? { kind: 'ready', href: replay.href, detail: replayDetail(replay, t) } : undefined}
            nudge={loop ? (
              <HomeWeekLoop ready={readyForTest(loop.game)} missed={missedLastGame(loop.game)} reportsHref={`/${language}/teacher/reports`} onHomework={() => undefined} t={t} />
            ) : undefined}
          />
        </div>
        <div data-tm>
          <HomeClassRoster key={selected.id} rows={roster} failed={false} language={language} nowMs={nowMs} t={t} onAssign={() => undefined} onAssignAll={() => undefined} />
        </div>
        </>
      ) : null}
      sessions={ready && selected ? (
        <HomeSessionRail
          key={selected.id}
          className={SESSIONS_BESIDE_RAIL}
          classroomId={selected.id}
          languages={[railLanguage]}
          gradeBand={null}
          nowMs={nowMs}
          lastPlayedMs={lastPlayedMs}
          ready
          locale={language}
          t={t}
        />
      ) : null}
      accountBanner={banner === 'pastDue' ? null : previewBanner(banner)}
      alert={banner === 'pastDue' ? previewBanner(banner) : null}
      hasRail={!ready || hasClasses}
      week={hasClasses ? {
        summary,
        status: 'ready',
        classCount: classes.length,
        classes: classes.length > 1 ? (
          <HomeWeekClasses {...weekClassRows(classes, summary.lastPlayedAt, nowMs, WEEK_ROWS, selectedId)} selectedId={selectedId} onSelect={setSelectedId} moreHref={`/${language}/teacher/classroom`} language={language} nowMs={nowMs} t={t} />
        ) : null,
      } : null}
      onOpenReports={selected ? () => undefined : null}
      proCard={null}
    />
    </PreviewTeacherAuth>
  );
}

const PREVIEW_USER_ID = 'preview-teacher-dana';

// The shell's account avatar reads the signed-in user; give it a seeded teacher so it is not a blank circle.
function PreviewTeacherAuth({ children }: { children: ReactNode }) {
  const base = useAuth();
  const value = useMemo<AuthContextValue>(() => ({
    ...base,
    user: { id: PREVIEW_USER_ID } as AuthContextValue['user'],
    profile: { ...base.profile, display_name: 'Dana' } as AuthContextValue['profile'],
  }), [base]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
