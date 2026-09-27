'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { CollectedWord } from './QuickWordsCollected';

interface QuickWordsDetailDialogProps {
  words: CollectedWord[];
}

export function QuickWordsDetailDialog({ words }: QuickWordsDetailDialogProps) {
  const { t } = useLanguage();

  if (words.length === 0) {
    return null;
  }

  const totalScore = words.reduce((sum, w) => sum + w.score, 0);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="mt-2 text-xs font-semibold text-neo-cyan hover:text-neo-cyan-light underline"
          data-testid="quick-words-detail-trigger"
        >
          {t('quickPlay.solo.wordBreakdown', 'Score breakdown')}
        </button>
      </DialogTrigger>
      <DialogContent className="bg-neo-navy border-neo-thick border-black shadow-hard-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-neo-display text-lg text-neo-cream">
            {t('quickPlay.solo.wordDetails', 'Word details')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2" data-testid="quick-words-detail-list">
          {words.map((word, idx) => (
            <div
              key={`${word.word}-${idx}`}
              className="flex items-center justify-between px-3 py-2 bg-neo-navy-light rounded-lg border border-black/20"
            >
              <span className="flex-1 truncate font-neo-body text-neo-cream">
                {word.word.toUpperCase()}
              </span>
              <span className="ml-3 shrink-0 font-neo-display font-bold text-neo-lime">
                {word.score}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-3 border-t border-neo-white/20">
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-sm font-semibold text-neo-white/75">
              {t('quickPlay.solo.totalWords', '{count} words', { count: String(words.length) })}
            </span>
            <span className="font-neo-display text-lg font-bold text-neo-lime">
              {totalScore}
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
