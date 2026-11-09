'use client';

/** DEV-ONLY `?preview=ready` (`&words=a,b,c` prefills the box, `&count=N` seats students): the class-ready screen on a made-up class, no network. */

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { EducationShell } from '@/components/education/shell/EducationShell';
import { ClassSetupInviteView } from '@/components/education/ClassSetupInviteView';
import { classroomJoinUrl, joinAddressForDisplay } from '@/lib/education/classroomInvitePayload';
import type { RosterStudent } from '@/components/teacher/hq/rosterModel';
import { MIN_PASTED_WORDS } from '@/components/teacher/dashboard/quickLaunchIntent';
import { FirstGameWords, PlayNowButton } from '@/components/teacher/setup/FirstGameWords';
import { readPasted } from '@/components/teacher/setup/firstGameLaunch';
import { packsForLanguage } from '@/components/teacher/setup/starterPackPick';
import { FirstGamePlanCard } from '@/components/education/FirstGamePlanCard';

type T = (key: string, params?: Record<string, string | number>) => string;

const NAMES = ['Maya', 'Leo', 'Noa', 'Ari', 'Sofia', 'Omar', 'Yuki', 'Lucas'];
const CLASSROOM = { name: 'Room 12', join_code: 'KITE43' };

export default function ClassReadyPreview() {
  const { t: rawT, language } = useLanguage();
  const t = rawT as T;
  const params = useSearchParams();
  const [text, setText] = useState(() => (params?.get('words') ?? '').split(',').join('\n'));
  const total = Math.max(0, Math.min(NAMES.length, Number(params?.get('count') ?? 0) || 0));
  const students = useMemo<RosterStudent[]>(() => NAMES.slice(0, total).map((name, i) => ({ id: `s${i}`, name, avatar: null })), [total]);
  const packs = packsForLanguage(language);
  const [packKey, setPackKey] = useState(packs[0].nameKey);
  const [origin, setOrigin] = useState('');
  useEffect(() => setOrigin(window.location.origin), []);
  const { words, skipped } = readPasted(text);

  return (
    <EducationShell scrollRegionLabel={t('eduShell.setup.title')} tabs={false}>
      <main>
        <ClassSetupInviteView
          classroom={CLASSROOM}
          roster={{ students, arrivals: [], loading: false }}
          joinUrl={origin ? classroomJoinUrl(origin, language, CLASSROOM.join_code) : ''}
          displayHost={origin ? `${joinAddressForDisplay(origin)}/${language}/join` : ''}
          startHref="#"
          homeHref={`/${language}/teacher`}
          reduced={false}
          onShare={() => toast('Preview: share')}
          onOpenProjector={() => toast('Preview: projector')}
          plan={
            origin ? (
              <FirstGamePlanCard
                classroom={{ id: 'preview', ...CLASSROOM }}
                joinUrl={classroomJoinUrl(origin, language, CLASSROOM.join_code)}
                origin={origin}
                language={language}
                t={t}
                className="lg:col-span-2 lg:mx-auto lg:w-full lg:max-w-xl"
              />
            ) : null
          }
          words={
            <FirstGameWords
              text={text}
              onTextChange={setText}
              count={words.length}
              skipped={skipped}
              minWords={MIN_PASTED_WORDS}
              error={null}
              packs={packs}
              packKey={packKey}
              savedPackKey={packs[0].nameKey}
              onPackChange={setPackKey}
              t={t}
            />
          }
          play={<PlayNowButton onClick={() => toast('Preview: play now')} t={t} />}
          t={t}
        />
      </main>
    </EducationShell>
  );
}
