'use client';

/** DEV-ONLY: `?preview=phonegame[&found=0|1|all]` a core student's phone mid-Classic, with the lesson hunt strip. */
import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import InGameScreen from '@/components/game/InGameScreen';
import { StudentWordBank } from '@/components/education/StudentWordBank';
import { useLanguage } from '@/contexts/LanguageContext';
import { useGameStore } from '@/hooks/gameState';
import type { Language } from '@/shared/types/game';

const BOARDS: Record<string, { grid: string[][]; words: string[] }> = {
  en: {
    grid: [['S', 'T', 'O', 'R', 'M'], ['H', 'A', 'D', 'E', 'W'], ['I', 'N', 'L', 'S', 'A'], ['V', 'E', 'R', 'T', 'Y'], ['O', 'C', 'K', 'B', 'U']],
    words: ['storm', 'shad', 'river', 'sand'],
  },
  he: {
    grid: [['ש', 'ל', 'ו', 'א', 'ב'], ['ב', 'מ', 'ה', 'ר', 'ת'], ['ק', 'ד', 'י', 'ת', 'ס'], ['ג', 'נ', 'ע', 'פ', 'ר'], ['ח', 'ל', 'ו', 'ן', 'כ']],
    words: ['שלום', 'בית', 'ספר'],
  },
};

export function PhoneGamePreview() {
  const { t, language, dir } = useLanguage();
  const found = useSearchParams()?.get('found') ?? '1';
  const board = BOARDS[language] ?? BOARDS.en;
  const foundWords = useMemo(() => {
    const n = found === 'all' ? board.words.length : Number(found) || 0;
    return board.words.slice(0, n).map((word, i) => ({ word, score: 5, timestamp: i, isValid: true }));
  }, [found, board]);

  useEffect(() => {
    useGameStore.setState({ letterGrid: board.grid, gameMode: 'classic', gameModeConfirmed: true, gameLanguage: language, foundWords } as never);
  }, [board, language, foundWords]);

  return (
    <div className="flex h-dvh min-h-0 flex-col bg-neo-navy">
      <InGameScreen
        username="Maya"
        gameCode="YHNCF4"
        isPlaying
        gameplayFocusMode
        t={t as never}
        dir={dir}
        socket={null}
        letterGrid={board.grid as never}
        remainingTime={142}
        gameActive
        gameLanguage={language as Language}
        minWordLength={3}
        comboLevel={0}
        foundWords={foundWords as never}
        leaderboard={[{ username: 'Leo', score: 55 }, { username: 'Maya', score: 40 }, { username: 'Noa', score: 20 }] as never}
        totalBoardWords={null}
        gameMode="classic"
        onExitRoom={() => undefined}
      />
      <StudentWordBank level="core" words={board.words} />
    </div>
  );
}
