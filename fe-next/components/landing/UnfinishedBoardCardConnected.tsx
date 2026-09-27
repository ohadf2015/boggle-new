'use client';

/**
 * UnfinishedBoardCardConnected
 *
 * Self-contained wrapper that connects useUnfinishedBoard hook
 * to UnfinishedBoardCard. Returns null when no saved board exists.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUnfinishedBoard, type UnfinishedBoardData } from '@/hooks/useUnfinishedBoard';
import { useLanguage } from '@/contexts/LanguageContext';
import UnfinishedBoardCard from './UnfinishedBoardCard';

export function UnfinishedBoardCardConnected() {
  const router = useRouter();
  const { language } = useLanguage();
  const { getUnfinishedBoard } = useUnfinishedBoard();
  const [board, setBoard] = useState<UnfinishedBoardData | null>(null);

  useEffect(() => {
    const data = getUnfinishedBoard();
    if (data && data.grid.length > 0) {
      setBoard(data);
    }
  }, [getUnfinishedBoard]);

  if (!board || board.grid.length === 0) return null;

  const handleResume = () => {
    router.push(`/${language}/singleplayer?autoStart=bots`);
  };

  return (
    <UnfinishedBoardCard
      grid={board.grid}
      missedWords={board.missedWords}
      score={board.score}
      wordsFound={0}
      totalWords={board.missedWords.length}
      onResume={handleResume}
    />
  );
}
