'use client';

import { HourglassGlyph } from './resultsGlyphs';

/** Nobody scored: the winner bar below says so, this says what to change for the next round. */
export function ZeroRoundNote({ t, practice = false }: { t: (key: string) => string; practice?: boolean }) {
  return (
    <div
      data-testid="podium-zero-note"
      className="absolute start-[25%] end-[4%] bottom-[5%] flex items-center gap-[1.6cqw] rounded-neo-lg border-[3px] border-neo-cream/50 edu-sky:border-edu-line bg-neo-navy edu-sky:bg-edu-surface px-[2.4cqw] py-[1.2cqw] text-start shadow-[0.5cqw_0.5cqw_0_rgb(var(--neo-black))]"
    >
      <HourglassGlyph className="shrink-0 text-neo-cream/80 edu-sky:text-edu-ink/80" style={{ width: '4cqw', height: '4cqw' }} />
      <span dir="auto" className="min-w-0 font-neo-body font-bold leading-snug text-neo-cream edu-sky:text-edu-ink" style={{ fontSize: '2cqw' }}>
        {t(practice ? 'eduLive.results.practice.zeroNote' : 'eduLive.results.zeroNoteHint')}
      </span>
    </div>
  );
}

export default ZeroRoundNote;
