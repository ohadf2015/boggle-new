'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
import { Trophy, Hash, Star } from 'lucide-react';
import { Reveal } from '@/components/ui/Reveal';
import { applyHebrewFinalLetters } from '@/shared/utils/wordNormalization';
import type { Language } from '@/types';

// Diff mode caps the "what I missed" intel at this count so the modal stays
// scannable. Anything past this is overwhelming and dilutes the lesson — the
// player can still see everything via the toggle if they want.
const DIFF_TOP_LIMIT = 5;

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
  const [showAll, setShowAll] = useState(false);

  // Reset the expand state every open so a previous session's choice doesn't
  // leak into a different opponent's view.
  useEffect(() => {
    if (isOpen) setShowAll(false);
  }, [isOpen, playerId]);

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
  const sortedWords = useMemo(
    () => [...words].sort((a, b) => b.length - a.length || a.localeCompare(b)),
    [words],
  );
  // In diff mode collapse to the top-N most-impressive (longest) missed words.
  // Non-diff (full submitted list) keeps showing everything since the player has
  // already played and might want the full picture.
  const collapsed = diffMode && !showAll;
  const visibleWords = collapsed ? sortedWords.slice(0, DIFF_TOP_LIMIT) : sortedWords;
  const remainingCount = sortedWords.length - DIFF_TOP_LIMIT;
  const showToggle = diffMode && sortedWords.length > DIFF_TOP_LIMIT;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        className="max-w-md bg-neo-navy border-neo-thick border-neo-black shadow-hard-lg p-0 overflow-hidden"
        closeButtonLabel={t('common.close')}
      >
        <VisuallyHidden.Root>
          <DialogTitle>{t('wordWheel.submittedWordsTitle')}</DialogTitle>
        </VisuallyHidden.Root>

        {/* Header */}
        <div className="relative bg-neo-lime text-neo-black p-4 border-b-3 border-neo-black">
          <h2 className="font-neo-display font-black text-xl sm:text-2xl uppercase tracking-wide pe-14 truncate">
            🎡 {playerName}
          </h2>
          <p className="text-sm font-bold opacity-80 mt-0.5 pe-14">
            {diffMode
              ? (t('wordWheel.youMissedTitle') || 'Words you missed')
              : t('wordWheel.submittedWordsTitle')}
          </p>
        </div>

        {/* Body */}
        <div className="p-4 max-h-[60vh] overflow-y-auto">
          {loading && (
            <div className="py-8 text-center text-neo-white font-bold text-sm">
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
                <p className="py-6 text-center text-neo-white text-sm font-medium">
                  {diffMode && allWords.length > 0
                    ? (t('wordWheel.youFoundEverything') || 'You found every word they did. Nice.')
                    : t('wordWheel.noWordsSubmitted')}
                </p>
              ) : (
                <>
                  <div className="flex flex-wrap gap-1.5">
                    {visibleWords.map((word, idx) => (
                      <Reveal
                        as="span"
                        noSlide
                        key={`${word}-${idx}`}
                        data-testid="missed-word-chip"
                        className="inline-flex items-center px-2.5 py-1 rounded-neo border-2 border-neo-black bg-neo-white text-neo-navy text-xs sm:text-sm font-black uppercase shadow-hard-xs"
                      >
                        {language === 'he' ? applyHebrewFinalLetters(word) : word}
                      </Reveal>
                    ))}
                  </div>

                  {showToggle && (
                    <button
                      type="button"
                      data-testid="missed-words-toggle"
                      onClick={() => setShowAll(v => !v)}
                      className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-neo-cyan/80 hover:text-neo-cyan focus-visible:outline-hidden focus-visible:underline transition-colors"
                    >
                      {showAll
                        ? (t('wordWheel.results.showLess') || 'Show less')
                        : (t('wordWheel.results.showMoreCount')?.replace('{count}', String(remainingCount))
                            || `Show all (+${remainingCount} more)`)}
                    </button>
                  )}
                </>
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
    <div className="flex items-center justify-center gap-1 text-neo-white text-[10px] font-bold uppercase tracking-wide">
      {icon}
      <span className="truncate">{label}</span>
    </div>
    <div className="mt-0.5 font-neo-display font-black text-neo-lime text-base sm:text-lg truncate">
      {value}
    </div>
  </div>
);

export default WordWheelWordsModal;
