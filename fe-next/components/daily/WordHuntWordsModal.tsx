'use client';

import React, { useMemo } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
import { Hash, Zap } from 'lucide-react';
import { Reveal } from '@/components/ui/Reveal';

interface WordEntry {
  word: string;
  timestamp: number;
  lifeGained: number;
  tokensGained: number;
}

interface WordHuntWordsModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerName: string;
  /** Opponent's discovered words (already in leaderboard row — no fetch needed). */
  wordsDiscovered: WordEntry[];
  /** Current player's discovered words. When provided, shows diff ("words you missed"). */
  myWordsDiscovered?: string[];
  t: (key: string, fallback?: string) => string;
}

export const WordHuntWordsModal: React.FC<WordHuntWordsModalProps> = ({
  isOpen, onClose, playerName, wordsDiscovered, myWordsDiscovered, t,
}) => {
  const diffMode = Array.isArray(myWordsDiscovered);
  const mySet = useMemo(() => {
    if (!diffMode) return null;
    return new Set((myWordsDiscovered ?? []).map(w => w.toUpperCase()));
  }, [diffMode, myWordsDiscovered]);

  const allWords = wordsDiscovered.map(e => e.word);
  const words = diffMode && mySet
    ? allWords.filter(w => !mySet.has(w.toUpperCase()))
    : allWords;
  const sortedWords = [...words].sort((a, b) => b.length - a.length || a.localeCompare(b));

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        className="max-w-md bg-neo-navy border-neo-thick border-neo-black shadow-hard-lg p-0 overflow-hidden"
        closeButtonLabel={t('common.close', 'Close')}
      >
        <VisuallyHidden.Root>
          <DialogTitle>{t('wordHunt.results.playerWordsTitle', `${playerName}'s path`)}</DialogTitle>
        </VisuallyHidden.Root>

        {/* Header */}
        <div className="relative bg-neo-lime text-neo-black p-4 border-b-3 border-neo-black">
          <h2 className="font-neo-display font-black text-xl sm:text-2xl uppercase tracking-wide pe-14 truncate">
            🎯 {playerName}
          </h2>
          <p className="text-sm font-bold opacity-80 mt-0.5 pe-14">
            {diffMode
              ? t('wordHunt.results.youMissedWords', 'Words you missed')
              : t('wordHunt.results.playerWordsTitle', `${playerName}'s path`)}
          </p>
        </div>

        {/* Body */}
        <div className="p-4 max-h-[60vh] overflow-y-auto">
          {/* Stats summary */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <StatBox
              icon={<Hash className="w-3.5 h-3.5" />}
              label={t('wordHunt.results.wordsFound', 'Words found')}
              value={wordsDiscovered.length}
            />
            <StatBox
              icon={<Zap className="w-3.5 h-3.5" />}
              label={t('wordHunt.results.youMissedWords', 'You missed')}
              value={sortedWords.length}
            />
          </div>

          {/* Word list */}
          {sortedWords.length === 0 ? (
            <p data-testid="nothing-missed" className="py-6 text-center text-neo-white text-sm font-medium">
              {diffMode && allWords.length > 0
                ? t('wordWheel.youFoundEverything', 'You found every word they did. Nice.')
                : t('wordWheel.noWordsSubmitted', 'No words found')}
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {sortedWords.map((word, idx) => (
                <Reveal
                  as="span"
                  noSlide
                  key={`${word}-${idx}`}
                  className="inline-flex items-center px-2.5 py-1 rounded-neo border-2 border-neo-black bg-neo-white text-neo-navy text-xs sm:text-sm font-black uppercase shadow-hard-xs"
                >
                  {word}
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

const StatBox: React.FC<{ icon: React.ReactNode; label: string; value: React.ReactNode }> = ({ icon, label, value }) => (
  <div className="rounded-neo border-2 border-neo-black bg-neo-navy-light p-2 text-center shadow-hard-xs">
    <div className="flex items-center justify-center gap-1 text-neo-white text-[10px] font-bold uppercase tracking-wide">
      {icon}
      <span className="truncate">{label}</span>
    </div>
    <div className="mt-0.5 font-neo-display font-black text-neo-lime text-base sm:text-lg truncate">
      {value}
    </div>
  </div>
);

export default WordHuntWordsModal;
