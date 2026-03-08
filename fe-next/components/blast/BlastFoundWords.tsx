'use client';

interface BlastFoundWordsProps {
  words: string[];
  t: (key: string) => string | undefined;
}

/**
 * BlastFoundWords - Compact pill list of found words during gameplay.
 * Displayed inline when user taps the words count.
 */
export function BlastFoundWords({ words, t }: BlastFoundWordsProps) {
  return (
    <div className="py-2 mb-2">
      <div className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1.5">
        {t('blast.foundWords')}
      </div>
      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
        {words.map((word, i) => (
          <span
            key={`${word}-${i}`}
            className="px-2.5 py-0.5 rounded-neo bg-white/10 border border-white/15 text-white/80 text-xs font-bold uppercase shadow-sm"
          >
            {word}
          </span>
        ))}
      </div>
    </div>
  );
}
