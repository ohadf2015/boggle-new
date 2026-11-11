'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { AuthContext, useAuth, type AuthContextValue } from '@/contexts/AuthContext';
import { EducationShell } from '@/components/education/shell/EducationShell';
import { ProGate } from '@/components/teacher/ProGate';
import { FreeWeekCard } from '@/components/teacher/analytics/free/FreeWeekInsight';
import { ResultsPrimaryActions } from '@/components/education/results/ResultsPrimaryActions';
import { roundHardestWords } from '@/components/education/results/roundHardestWords';
import { EduHostResults } from '@/components/education/live/EduHostResults';
import { ClassSetupDetails } from '@/components/teacher/setup/ClassSetupDetails';
import { ClassSetupSide } from '@/components/teacher/setup/ClassSetupSide';
import { packsForLanguage, recommendedPack } from '@/components/teacher/setup/starterPackPick';
import { readSetupWords, SETUP_MIN_OWN_WORDS } from '@/components/teacher/setup/setupOwnWords';
import { defaultClassLanguage } from '@/components/teacher/setup/classSetupDefaults';
import { LobbySetupPanel } from '@/components/education/lobby/LobbySetupPanel';
import { PreCheckoutExplainer } from '@/components/teacher/pro/PreCheckoutExplainer';
import type { FreeClassInsight } from '@/lib/education/pro/freeClassInsight';
import type { ClassroomSummary } from '@/shared/types/classroom';
import type { PlayStyle } from '@/shared/utils/teamBattle';
import type { Language } from '@/lib/supabase/education/types';
import { fixtureFor, type PreviewFixture } from './fixtures';

type T = (key: string, params?: Record<string, string | number>) => string;
const noop = () => undefined;

function TeacherAuth({ children }: { children: ReactNode }) {
  const base = useAuth();
  const value = useMemo<AuthContextValue>(() => ({
    ...base,
    user: { id: 'preview-teacher-dana' } as AuthContextValue['user'],
    profile: { ...base.profile, display_name: 'Dana' } as AuthContextValue['profile'],
  }), [base]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

const STUDENTS = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8'];

function insightFixture(f: PreviewFixture, empty: boolean): FreeClassInsight {
  if (empty) {
    return { pulse: { needsHelp: [], counts: { needsHelp: 0, inactive: 0, notStarted: 0, steady: 0, thriving: 0 }, totalStudents: 0 }, hardestWords: [], sessionsThisWeek: 0 };
  }
  const statuses = ['needsHelp', 'needsHelp', 'inactive', 'notStarted', 'needsHelp', 'inactive', 'notStarted', 'needsHelp'] as const;
  return {
    pulse: {
      needsHelp: STUDENTS.map((id, i) => ({ id, status: statuses[i] })),
      counts: { needsHelp: 4, inactive: 2, notStarted: 2, steady: 14, thriving: 6 },
      totalStudents: 28,
    },
    hardestWords: [7, 9, 11].map((i, n) => ({
      word: f.words[i], display: f.words[i], attempts: 28, missed: 22 - n * 4, missRate: 79 - n * 14, studentsMissing: 22 - n * 4, studentsAsked: 28,
    })),
    sessionsThisWeek: 3,
  };
}

/** Surface 8: the analytics body for a free teacher: weekly card, then the lock. */
export function AnalyticsFreePreview({ v }: { v?: string }) {
  const { t: rawT, language } = useLanguage();
  const t = rawT as T;
  const f = fixtureFor(language);
  const names = useMemo(
    () => new Map(STUDENTS.map((id, i) => [id, [f.rival, ...f.classmates, f.shortRival, f.me][i]])),
    [f],
  );
  return (
    <TeacherAuth>
      <EducationShell scrollRegionLabel={t('teacher.shell.analyticsLabel')} contentClassName="p-4 md:px-8 md:py-6">
        <div className="mx-auto max-w-7xl space-y-4 md:space-y-5">
          <h1 className="font-neo-display text-2xl font-black text-neo-cream">{f.className}</h1>
          <div className="space-y-4 md:space-y-5 [&_[data-testid=pro-gate-preview]]:max-md:hidden">
            <FreeWeekCard classroomId="p5b" locale={language} insight={insightFixture(f, v === 'empty')} names={names} t={t} />
            <ProGate feature="analytics" tone="calm" quiet={v === 'empty'}>
              <div className="h-64 rounded-neo-xl border-[3px] border-neo-cream/50 bg-neo-navy-light" />
            </ProGate>
          </div>
        </div>
      </EducationShell>
    </TeacherAuth>
  );
}

function summaryFixture(f: PreviewFixture): ClassroomSummary {
  const kids = [f.me, f.rival, ...f.classmates, 'Gabriel', 'Lior', 'Maya'];
  const foundCounts = [9, 7, 8, 6, 5, 7, 6, 1, 0, 2, 4, 3];
  return {
    teacherName: 'Teacher',
    gameMode: 'classic',
    lessonNames: [f.className],
    lessonIds: ['lesson-1'],
    totalWords: 12,
    coverage: f.words.map((word, i) => ({ word, foundBy: kids.slice(0, foundCounts[i]) })),
    missedWords: [f.words[8]],
    classFoundCount: 11,
    masteryByPlayer: Object.fromEntries(kids.map((k, i) => [k, { found: 9 - (i % 7), total: 12 }])),
    podium: [{ username: f.me, score: 64, rank: 1 }, { username: f.rival, score: 60, rank: 2 }, { username: f.classmates[0], score: 56, rank: 3 }],
  } as ClassroomSummary;
}

/** Surface 9: the teacher card's actions (phone results) and, with v=live, the live route's host results. */
export function HostResultsPreview({ v }: { v?: string }) {
  const { t: rawT, language } = useLanguage();
  const t = rawT as T;
  const f = fixtureFor(language);
  const summary = useMemo(() => summaryFixture(f), [f]);
  if (v === 'live') {
    const players = summary.podium!.map((p) => ({ username: p.username, score: p.score }));
    return (
      <div className="flex h-dvh flex-col bg-neo-navy">
        <EduHostResults summary={summary} players={players} t={t} onRematch={noop} onClose={noop} onExitRoom={noop} gameCode="PRV123" socket={null} />
      </div>
    );
  }
  return (
    <TeacherAuth>
      <div className="min-h-dvh bg-neo-navy px-3 py-4">
        <div className="mx-auto w-full max-w-md rounded-neo-lg border-[3px] border-neo-cream/40 bg-neo-navy-elevated p-4 shadow-hard-lg">
          <p className="mb-3 font-neo-display text-xl font-black text-neo-cream">{f.className}</p>
          <ResultsPrimaryActions language={language} onRematch={noop} hardestWords={roundHardestWords(summary)} t={t} />
        </div>
      </div>
    </TeacherAuth>
  );
}

const PASTE: Record<string, Record<string, string>> = {
  en: {
    two: 'photon, gravity',
    eight: 'photon\ngravity\nmagnet\norbit\nfriction\nneutron\nvoltage\ncircuit',
    dropped: 'photon, gravity, magnet, orbit, friction, neutron, voltage, circuit, electromagnetism-induction, x, 42',
  },
  he: {
    two: 'מגנט, כוכב',
    eight: 'מגנט\nכוכב\nאנרגיה\nמעגל\nחשמל\nאטום\nמסלול\nחיכוך',
    dropped: 'מגנט, כוכב, אנרגיה, מעגל, חשמל, אטום, מסלול, חיכוך, אלקטרומגנטיות-השראתית, x, 42',
  },
};

/** Surface 10: the first-class screen with the optional paste box in each state. */
export function SetupPreview({ v }: { v?: string }) {
  const { t: rawT, language } = useLanguage();
  const t = rawT as T;
  const [name, setName] = useState('');
  const [text, setText] = useState(() => (v ? PASTE[language === 'he' ? 'he' : 'en'][v] ?? '' : ''));
  const [classLanguage, setClassLanguage] = useState<Language>(() => defaultClassLanguage(language));
  const packs = packsForLanguage(classLanguage);
  const recommended = recommendedPack(classLanguage, null);
  const own = useMemo(() => readSetupWords(text, classLanguage), [text, classLanguage]);
  return (
    <TeacherAuth>
      <EducationShell scrollRegionLabel={t('eduShell.setup.title')}>
        <main>
          <div className="mx-auto grid w-full max-w-xl grid-cols-1 gap-3 px-3 py-3 sm:max-w-2xl sm:gap-4 sm:px-4 sm:py-5 lg:max-w-6xl lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start lg:gap-8 lg:py-8">
            <ClassSetupSide t={t} />
            <ClassSetupDetails
              name={name}
              onNameChange={setName}
              grade={null}
              onGradeChange={noop}
              language={classLanguage}
              onLanguageChange={setClassLanguage}
              packs={packs}
              pack={recommended}
              recommendedKey={recommended.nameKey}
              onPackChange={noop}
              cap={{ count: 0, limit: 3, atLimit: false }}
              busy={null}
              errorKey={null}
              onStartLive={noop}
              skipHref={`/${language}/teacher`}
              ownWords={{ text, onTextChange: setText, count: own.words.length, dropped: own.dropped, min: SETUP_MIN_OWN_WORDS }}
              t={t}
            />
          </div>
        </main>
      </EducationShell>
    </TeacherAuth>
  );
}

/** Surface 11: the lobby options panel with the rivalry toggle. */
export function SettingsPreview() {
  const [playStyle, setPlayStyle] = useState<PlayStyle>('ffa');
  const [teamCount, setTeamCount] = useState(2);
  const [accessibility, setAccessibility] = useState({});
  const [rivalry, setRivalry] = useState(true);
  return (
    <div className="min-h-dvh bg-neo-navy px-3 py-4">
      <div className="mx-auto w-full max-w-xl rounded-neo-lg border-[3px] border-neo-cream/40 bg-neo-navy-light p-4 shadow-hard-lg">
        <LobbySetupPanel
          activePreset={null as never}
          playStyle={playStyle}
          teamCount={teamCount}
          accessibility={accessibility}
          onApplyPreset={noop}
          onPlayStyleChange={setPlayStyle}
          onTeamCountChange={setTeamCount}
          onAccessibilityChange={setAccessibility}
          rivalry={rivalry}
          onRivalryChange={setRivalry}
        />
      </div>
    </div>
  );
}

/** Surface 12b: the pre-checkout explainer over a dark page. */
export function ExplainerPreview({ v }: { v?: string }) {
  return (
    <div className="min-h-dvh bg-neo-navy">
      <PreCheckoutExplainer mode={v === 'paid' ? 'paid' : 'trial'} pending={false} onConfirm={noop} onBack={noop} />
    </div>
  );
}
