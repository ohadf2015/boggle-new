'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
import { X, Trophy, Hash, Star } from 'lucide-react';
import type { Language } from '@/types';

interface WordWheelWordsModalProps {
  isOpen: boolean;
  onClose: () => void;
  puzzleDate: string;
  language: Language;
  playerId: string | null;
  playerName: string;
  /** Current player's found words. When provided, modal shows only the diff
   *  (words the opponent found that the current player did NOT) so the
   *  player gets actionable "look what I missed" intel instead of a flood. */
  myWordsFound?: string[];
  t: (key: string) => string;
}

interface WordsPayload {
  wordsFound: string[];
  wordCount: number;
  score: number;
  longestWord: string | null;
  displayName: string;
}

export const WordWheelWordsModal: React.FC<WordWheelWordsModalProps> = ({
  isOpen, onClose, puzzleDate, language, playerId, playerName, myWordsFound, t,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<WordsPayload | null>(null);

  useEffect(() => {
    if (!isOpen || !playerId) return;

    let cancelled = false;
    const controller = new AbortController();

    (async () => {
      setLoading(true);
      setError(null);
      setPayload(null);
      try {
        const res = await fetch(
          `/api/daily-challenge/word-wheel/words/${puzzleDate}/${language}/${encodeURIComponent(playerId)}`,
          { signal: controller.signal },
        );
        if (!res.ok) {
          if (res.status === 404) {
            if (!cancelled) setPayload({ wordsFound: [], wordCount: 0, score: 0, longestWord: null, displayName: playerName });
            return;
          }
          throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();
        if (!cancelled) setPayload(data as WordsPayload);
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        if (!cancelled) setError(t('common.error') || 'Error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [isOpen, puzzleDate, language, playerId, playerName, t]);

  const allWords = payload?.wordsFound ?? [];
  // Diff mode: only show words the opponent found that the current player missed.
  // Falls back to full list if myWordsFound wasn't supplied (e.g. player hasn't
  // played the wheel yet, in which case the full set is the right view anyway).
  const diffMode = Array.isArray(myWordsFound);
  const mySet = useMemo(() => {
    if (!diffMode) return null;
    return new Set((myWordsFound ?? []).map(w => w.toUpperCase()));
  }, [diffMode, myWordsFound]);
  const words = diffMode && mySet
    ? allWords.filter(w => !mySet.has(w.toUpperCase()))
    : allWords;
  const sortedWords = [...words].sort((a, b) => b.length - a.length || a.localeCompare(b));

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md bg-neo-navy border-neo-thick border-neo-black shadow-hard-lg p-0 overflow-hidden">
        <VisuallyHidden.Root>
          <DialogTitle>{t('wordWheel.submittedWordsTitle')}</DialogTitle>
        </VisuallyHidden.Root>

        {/* Header */}
        <div className="relative bg-neo-lime text-neo-black p-4 border-b-3 border-neo-black">
          <h2 className="font-neo-display font-black text-xl sm:text-2xl uppercase tracking-wide pe-10 truncate">
            🎡 {playerName}
          </h2>
          <p className="text-sm font-bold opacity-80 mt-0.5">
            {diffMode
              ? (t('wordWheel.youMissedTitle') || 'Words you missed')
              : t('wordWheel.submittedWordsTitle')}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-neo border-2 border-neo-black bg-neo-white hover:bg-neo-cream transition-colors shadow-hard-xs"
            aria-label={t('common.close')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 max-h-[60vh] overflow-y-auto">
          {loading && (
            <div className="py-8 text-center text-neo-cream/70 font-bold text-sm">
              {t('common.loading') || 'Loading…'}
            </div>
          )}

          {!loading && error && (
            <div className="py-6 text-center text-neo-red font-bold text-sm">
              {error}
            </div>
          )}

          {!loading && !error && payload && (
            <>
              {/* Stats summary */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <StatBox icon={<Trophy className="w-3.5 h-3.5" />} label={t('wordWheel.scoreLabel')} value={payload.score} />
                <StatBox icon={<Hash className="w-3.5 h-3.5" />} label={t('wordWheel.foundWords')} value={payload.wordCount} />
                <StatBox
                  icon={<Star className="w-3.5 h-3.5" />}
                  label={t('wordWheel.longest') || 'Longest'}
                  value={payload.longestWord || '—'}
                />
              </div>

              {/* Word list */}
              {sortedWords.length === 0 ? (
                <p className="py-6 text-center text-neo-cream/60 text-sm font-medium">
                  {diffMode && allWords.length > 0
                    ? (t('wordWheel.youFoundEverything') || 'You found every word they did. Nice.')
                    : t('wordWheel.noWordsSubmitted')}
                </p>
              ) : (
                <AnimatePresence mode="popLayout">
                  <div className="flex flex-wrap gap-1.5">
                    {sortedWords.map((word, idx) => (
                      <motion.span
                        key={`${word}-${idx}`}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.015, type: 'spring', stiffness: 500, damping: 25 }}
                        className="inline-flex items-center px-2.5 py-1 rounded-neo border-2 border-neo-black bg-neo-white text-neo-navy text-xs sm:text-sm font-black uppercase shadow-hard-xs"
                      >
                        {word}
                      </motion.span>
                    ))}
                  </div>
                </AnimatePresence>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

const StatBox: React.FC<{ icon: React.ReactNode; label: string; value: React.ReactNode }> = ({ icon, label, value }) => (
  <div className="rounded-neo border-2 border-neo-black bg-neo-navy-light p-2 text-center shadow-hard-xs">
    <div className="flex items-center justify-center gap-1 text-neo-cream/60 text-[10px] font-bold uppercase tracking-wide">
      {icon}
      <span className="truncate">{label}</span>
    </div>
    <div className="mt-0.5 font-neo-display font-black text-neo-lime text-base sm:text-lg truncate">
      {value}
    </div>
  </div>
);

export default WordWheelWordsModal;
