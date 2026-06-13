'use client';

export interface WordCraftPlacementGuideLabels {
  step1: string;
  step2: string;
  step3: string;
}

/**
 * A compact, always-on "how to place a letter" strip for the player's first
 * turn. The full how-to lives in the tutor modal, but new players who dismiss
 * it (or never open it) still need the place→submit flow visible in-context.
 * Three numbered chips read at a glance on phone and TV alike, then the strip
 * retires once the player has placed their first word.
 */
export function WordCraftPlacementGuide({ labels }: { labels: WordCraftPlacementGuideLabels }) {
  const steps = [
    { n: 1, text: labels.step1, tone: 'bg-neo-lime text-neo-navy' },
    { n: 2, text: labels.step2, tone: 'bg-neo-cyan text-neo-navy' },
    { n: 3, text: labels.step3, tone: 'bg-neo-pink text-white' },
  ];
  return (
    <div
      className="flex items-center justify-center gap-1.5 py-0.5 shrink-0 flex-wrap"
      data-wc-placement-guide=""
    >
      {steps.map((s) => (
        <span
          key={s.n}
          className="inline-flex items-center gap-1.5 pe-2 ps-1 py-0.5 rounded-neo border-2 border-black bg-neo-navy-light shadow-hard-sm"
        >
          <span
            className={`inline-flex items-center justify-center w-4 h-4 rounded-full border border-black font-neo-display font-black text-[9px] leading-none ${s.tone}`}
          >
            {s.n}
          </span>
          <span className="text-[10px] font-neo-body text-neo-white/85 whitespace-nowrap">{s.text}</span>
        </span>
      ))}
    </div>
  );
}
