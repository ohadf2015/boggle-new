'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { AuthContext, useAuth, type AuthContextValue } from '@/contexts/AuthContext';
import { EducationShell } from '@/components/education/shell/EducationShell';
import { ClassSetupDetails } from '@/components/teacher/setup/ClassSetupDetails';
import { packsForLanguage, recommendedPack } from '@/components/teacher/setup/starterPackPick';
import { readSetupWords, SETUP_MIN_OWN_WORDS } from '@/components/teacher/setup/setupOwnWords';
import { defaultClassLanguage } from '@/components/teacher/setup/classSetupDefaults';
import { LobbySetupPanel } from '@/components/education/lobby/LobbySetupPanel';
import type { PlayStyle } from '@/shared/utils/teamBattle';
import type { Language } from '@/lib/supabase/education/types';
import { fixtureFor } from './fixtures';

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
  const [name, setName] = useState(() => (v === 'dropped' ? fixtureFor(language).className : ''));
  const [text, setText] = useState(() => (v ? PASTE[language === 'he' ? 'he' : 'en'][v] ?? '' : ''));
  const [classLanguage, setClassLanguage] = useState<Language>(() => defaultClassLanguage(language));
  const packs = packsForLanguage(classLanguage);
  const recommended = recommendedPack(classLanguage, null);
  const own = useMemo(() => readSetupWords(text, classLanguage), [text, classLanguage]);
  return (
    <TeacherAuth>
      <EducationShell scrollRegionLabel={t('eduShell.setup.title')}>
        <main>
          <div className="mx-auto w-full max-w-xl px-3 py-3 sm:px-4 sm:py-5 lg:py-8">
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
              ownWords={{ text, onTextChange: setText, count: own.words.length, dropped: own.dropped, droppedWords: own.droppedWords, min: SETUP_MIN_OWN_WORDS }}
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
          playStyle={playStyle}
          teamCount={teamCount}
          accessibility={accessibility}
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
