/**
 * WordAlbumPanel — Displays collected words + milestone progress.
 *
 * Shows as a modal/panel from the Adventure Hub.
 * Lists milestones with claim buttons, total word count,
 * and a scrollable grid of all found words.
 */

'use client';

import { memo, useMemo, useState } from 'react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { BookOpen, X, Star, Coins, Zap, Check, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { getMilestoneProgress, type WordAlbumMilestone } from '@/lib/adventure/wordAlbum';

interface WordAlbumPanelProps {
  isOpen: boolean;
  onClose: () => void;
  words: string[];
  claimedMilestones: number[];
  onClaimMilestone?: (milestone: WordAlbumMilestone) => void;
}

const WordAlbumPanel = memo<WordAlbumPanelProps>(({
  isOpen,
  onClose,
  words,
  claimedMilestones,
  onClaimMilestone,
}) => {
  const { t } = useLanguageSafe();
  const [showAllWords, setShowAllWords] = useState(false);

  const milestones = useMemo(
    () => getMilestoneProgress(words.length, claimedMilestones),
    [words.length, claimedMilestones]
  );

  const sortedWords = useMemo(
    () => [...words].sort(),
    [words]
  );

  const displayWords = showAllWords ? sortedWords : sortedWords.slice(0, 60);

  if (!isOpen) return null;

  return (
    <AdaptiveAnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-neo-black/80 backdrop-blur-xs"
        onClick={onClose}
      >
        <AdaptiveMotion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'relative w-full max-w-lg mx-4 max-h-[85dvh] overflow-y-auto',
            'bg-neo-navy border-4 border-neo-black',
            'rounded-neo shadow-hard-lg p-6'
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-neo-cyan" />
              <h2 className="text-xl font-black text-neo-white uppercase">
                {t('adventure.album.title')}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-neo hover:bg-neo-white/10 transition-colors"
              aria-label={t('common.close')}
            >
              <X className="w-5 h-5 text-neo-white" />
            </button>
          </div>

          {/* Word Count */}
          <div className="text-center mb-6 p-3 bg-neo-cyan/10 border border-neo-cyan/20 rounded-neo">
            <span className="text-3xl font-black text-neo-cyan tabular-nums">{words.length}</span>
            <p className="text-sm text-neo-white font-bold">{t('adventure.album.uniqueWords')}</p>
          </div>

          {/* Milestones */}
          <div className="space-y-2 mb-6">
            {milestones.map((m) => (
              <div
                key={m.target}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-neo border-2',
                  m.isClaimed ? 'bg-neo-lime/10 border-neo-lime/30' :
                  m.isUnlocked ? 'bg-neo-yellow/10 border-neo-yellow/40' :
                  'bg-neo-white/5 border-neo-white/10'
                )}
              >
                {/* Icon */}
                <div className={cn(
                  'w-8 h-8 rounded-neo flex items-center justify-center border-2 border-neo-black shrink-0',
                  m.isClaimed ? 'bg-neo-lime' :
                  m.isUnlocked ? 'bg-neo-yellow' :
                  'bg-neo-white/10'
                )}>
                  {m.isClaimed ? <Check className="w-4 h-4 text-neo-black" /> :
                   m.isUnlocked ? <Star className="w-4 h-4 text-neo-black" /> :
                   <Lock className="w-4 h-4 text-neo-white" />}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    'text-sm font-bold',
                    m.isClaimed ? 'text-neo-lime' :
                    m.isUnlocked ? 'text-neo-yellow' :
                    'text-neo-white'
                  )}>
                    {t(m.nameKey)} — {m.target} {t('adventure.album.uniqueWords')}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-neo-yellow/70 flex items-center gap-0.5">
                      <Coins className="w-3 h-3" /> {m.gold}
                    </span>
                    <span className="text-xs text-neo-purple/70 flex items-center gap-0.5">
                      <Zap className="w-3 h-3" /> {m.xp}
                    </span>
                  </div>
                </div>

                {/* Claim button */}
                {m.isUnlocked && !m.isClaimed && onClaimMilestone && (
                  <button
                    onClick={() => onClaimMilestone(m)}
                    className={cn(
                      'px-3 py-1.5 text-xs font-black uppercase',
                      'bg-neo-yellow text-neo-black',
                      'border-2 border-neo-black rounded-neo shadow-hard-sm',
                      'hover:-translate-y-0.5 hover:shadow-hard',
                      'active:translate-y-0.5 active:shadow-hard-pressed',
                      'transition-all duration-150'
                    )}
                  >
                    {t('common.claim')}
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Word Grid */}
          {words.length > 0 && (
            <>
              <h3 className="text-sm font-bold text-neo-white uppercase mb-2">
                {t('adventure.album.uniqueWords')}
              </h3>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {displayWords.map((word) => (
                  <span
                    key={word}
                    className="px-2 py-0.5 text-xs font-mono font-bold text-neo-white bg-neo-white/5 border border-neo-white/10 rounded"
                  >
                    {word}
                  </span>
                ))}
              </div>
              {!showAllWords && sortedWords.length > 60 && (
                <button
                  onClick={() => setShowAllWords(true)}
                  className="text-neo-cyan text-xs font-bold hover:underline"
                >
                  {t('common.showAll')} ({sortedWords.length})
                </button>
              )}
            </>
          )}
        </AdaptiveMotion.div>
      </div>
    </AdaptiveAnimatePresence>
  );
});

WordAlbumPanel.displayName = 'WordAlbumPanel';

export default WordAlbumPanel;
