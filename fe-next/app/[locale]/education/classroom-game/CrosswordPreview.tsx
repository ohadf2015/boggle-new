'use client';

/** DEV-ONLY: `?preview=crosswordwall|crosswordphone` a classroom crossword dealt from a sample lesson, on the wall and on a phone. */
import { useMemo } from 'react';
import { ProjectorCrosswordStage } from '@/components/education/live/ProjectorCrosswordStage';
import { CrosswordVersus } from '@/components/multiplayer/crossword/CrosswordVersus';
import { useLanguage } from '@/contexts/LanguageContext';
import { buildLessonCrossword } from '@/lib/crossword/lessonCrossword';
import type { PuzzleLocale } from '@/lib/crossword/types';
import { sampleProjectorStudents } from '@/components/education/results/previewFixtures';

const LESSONS: Record<string, Array<[string, string]>> = {
  en: [['planet', 'A world that circles a star'], ['orbit', 'The path around a star'], ['comet', 'An icy visitor with a tail'], ['moon', 'It circles the Earth'], ['galaxy', 'A huge group of stars'], ['meteor', 'A shooting star']],
  he: [['שלום', 'ברכה'], ['מלך', 'שליט'], ['לחם', 'מאפה'], ['כלב', 'נובח'], ['חלון', 'פתח בקיר']],
};

function fakeSocket(payload: unknown) {
  return {
    on(event: string, fn: (d: unknown) => void) {
      if (event === 'crosswordMpInit') window.setTimeout(() => fn(payload), 0);
    },
    off() {},
    emit() {},
  };
}

export function CrosswordPreview({ surface }: { surface: 'wall' | 'phone' }) {
  const { t, language } = useLanguage();
  const socket = useMemo(() => {
    const locale = (LESSONS[language] ? language : 'en') as PuzzleLocale;
    const built = buildLessonCrossword({ entries: LESSONS[locale]!.map(([word, clue]) => ({ word, clue })), locale, seed: 3, id: `lesson-preview-${locale}` });
    if (!built.ok) return null;
    const roster = sampleProjectorStudents(12).map((s) => s.username);
    const standings = roster.map((username, i) => ({ username, percent: Math.max(0, 100 - i * 9), solved: i < 2, elapsedMs: 60000 + i * 1000, score: 0, rank: i + 1 }));
    return fakeSocket({ puzzle: built.puzzle, players: roster, standings, startedAt: 1 });
  }, [language]);

  if (surface === 'phone') return <CrosswordVersus socket={socket as never} username="Maya" remainingTime={312} onQuit={() => undefined} />;
  return (
    <div className="flex h-dvh min-h-0 flex-col bg-neo-navy">
      <ProjectorCrosswordStage socket={socket} remainingTime={312} t={t} />
    </div>
  );
}
