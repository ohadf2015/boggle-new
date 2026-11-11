import type { MissedWord } from '@/components/education/live/eduReteachModel';

type T = (key: string, params?: Record<string, string | number>) => string;

/** The free round insight on the teacher's card: the few words fewest students found. */
export function HardestWordsInsight({ words, t }: { words: MissedWord[]; t: T }) {
  if (words.length === 0) return null;
  return (
    <section data-testid="round-hardest-words" aria-labelledby="round-hardest-words-title" className="rounded-neo-lg border-[3px] border-neo-cream/50 bg-neo-navy-light px-3 py-2.5">
      <h3 id="round-hardest-words-title" className="font-neo-display text-sm font-black text-neo-cream">
        {t('education.results.freeInsight.title')}
      </h3>
      <ul className="mt-1.5 flex flex-col gap-1">
        {words.map((w) => (
          <li key={w.word} data-testid="round-hardest-word" className="flex items-center justify-between gap-2 font-neo-body text-sm">
            <bdi className="font-bold text-neo-cream">{w.word}</bdi>
            <span className="shrink-0 text-xs font-semibold text-neo-cream/80">
              {t('education.results.freeInsight.foundBy', { found: w.found, of: w.of })}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
