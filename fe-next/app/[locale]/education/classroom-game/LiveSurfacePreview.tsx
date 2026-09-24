'use client';

/**
 * DEV-ONLY preview of the live classroom surfaces, fed with fabricated data so
 * they can be reviewed and captured without running a real round:
 *
 *   /en/education/classroom-game?preview=podium     — the projector results podium
 *   /en/education/classroom-game?preview=projector  — the projector lobby, students popping in
 *   /en/education/classroom-game?preview=waiting    — a student's waiting-for-teacher stage
 *   (&count=N sets the projector roster size, default 12)
 *
 * Mounted from PageClient behind `process.env.NODE_ENV !== 'production'` on a
 * lazy `dynamic()` import, so production never ships this chunk (same pattern
 * as adventure's RunResultPreview). The surfaces own the viewport themselves
 * (`fixed inset-0`), which also covers the SEO tail page.tsx renders below.
 */

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigation } from '@/contexts/NavigationContext';
import { ClassroomTvResults } from '@/components/education/results/ClassroomTvResults';
import ProjectorLobby from '@/components/education/projector/ProjectorLobby';
import Avatar from '@/components/Avatar';
import { ClassroomWaitingStage } from '@/components/education/lobby/ClassroomWaitingStage';
import { sampleClassroomSummary, sampleProjectorStudents } from '@/components/education/results/previewFixtures';

export type LiveSurfacePreviewKind = 'podium' | 'projector' | 'waiting';

function PodiumPreview() {
  const { t } = useLanguage();
  const summary = useMemo(() => sampleClassroomSummary(), []);
  return (
    <div className="fixed inset-0 z-[80] overflow-hidden bg-neo-navy p-3 md:p-6">
      <ClassroomTvResults summary={summary} onRematch={() => toast('Preview: rematch')} t={t} />
    </div>
  );
}

function ProjectorPreview() {
  const { t, language } = useLanguage();
  const params = useSearchParams();
  const total = Math.max(0, Math.min(40, Number(params?.get('count') ?? 12) || 0));
  const roster = useMemo(() => sampleProjectorStudents(total), [total]);
  // Students arrive one at a time so the pop-in + join sting can be judged.
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (shown >= roster.length) return;
    const id = window.setTimeout(() => setShown((n) => n + 1), shown === 0 ? 400 : 180);
    return () => window.clearTimeout(id);
  }, [shown, roster.length]);

  return (
    <ProjectorLobby
      gameCode="YHNCF4"
      language={language}
      students={roster.slice(0, shown)}
      readyUsernames={roster.slice(0, Math.floor(shown / 3)).map((s) => s.username)}
      t={t}
      onStartGame={() => toast('Preview: start')}
      startLabelKey="hostView.startClassGame"
      lessonName="Weekly Vocabulary"
      wordCount={14}
      classroomGameMode="classic"
      templateSettings={{ timerSeconds: 180, difficulty: 'medium', minWordLength: 3, allowLateJoin: true }}
    />
  );
}

function WaitingPreview() {
  const { t } = useLanguage();
  const [ready, setReady] = useState(false);
  const roster = useMemo(() => sampleProjectorStudents(9), []);
  // Classmates arrive one at a time, so the pop-in can be judged.
  const [arrived, setArrived] = useState(3);
  useEffect(() => {
    if (arrived >= roster.length) return;
    const id = window.setTimeout(() => setArrived((n) => n + 1), 450);
    return () => window.clearTimeout(id);
  }, [arrived, roster.length]);
  const classmates = roster.slice(0, arrived);
  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-neo-navy">
      <ClassroomWaitingStage
        username="Maya"
        avatar={<Avatar userId="Maya" size="2xl" className="!h-full !w-full" />}
        onEditAvatar={() => toast('Preview: avatar builder')}
        nameSlot={<h2 className="truncate text-xl font-black text-neo-cream">Maya</h2>}
        readySlot={
          <button
            type="button"
            onClick={() => setReady((v) => !v)}
            className={ready
              ? 'w-full rounded-neo border-3 border-neo-black bg-neo-lime py-3 font-black uppercase text-neo-black shadow-hard'
              : 'w-full rounded-neo border-3 border-neo-lime bg-neo-navy py-3 font-black uppercase text-neo-lime shadow-hard'}
          >
            {ready ? t('playerView.readyConfirmed') : t('playerView.readyUp')}
          </button>
        }
        classmates={classmates}
        onExit={() => toast('Preview: exit')}
        t={t}
      />
    </div>
  );
}

export default function LiveSurfacePreview({ kind }: { kind: LiveSurfacePreviewKind }) {
  // Lock the body like the real live screens do — page.tsx renders an SEO
  // block below the client tree that would otherwise scroll under the surface.
  const { setIsInGame } = useNavigation();
  useEffect(() => {
    setIsInGame(true);
    return () => setIsInGame(false);
  }, [setIsInGame]);

  if (kind === 'podium') return <PodiumPreview />;
  if (kind === 'waiting') return <WaitingPreview />;
  return <ProjectorPreview />;
}
