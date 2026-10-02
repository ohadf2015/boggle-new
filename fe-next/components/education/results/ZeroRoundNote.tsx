'use client';

import { HourglassGlyph } from './resultsGlyphs';

/** A banner across the stage floor when nobody scored: an honest beat, not a celebration. */
export function ZeroRoundNote({ t }: { t: (key: string) => string }) {
  return (
    <div
      data-testid="podium-zero-note"
      className="absolute start-[25%] end-[4%] bottom-[5%] flex items-center gap-[1.6cqw] rounded-neo-lg border-[3px] border-neo-cream bg-neo-navy/90 px-[2.4cqw] py-[1.2cqw] text-start shadow-[0.5cqw_0.5cqw_0_#000]"
    >
      <HourglassGlyph className="shrink-0 text-neo-yellow motion-safe:animate-neo-wobble" style={{ width: '4cqw', height: '4cqw' }} />
      <span className="flex min-w-0 flex-col">
        <span dir="auto" className="font-neo-display font-black uppercase leading-tight text-neo-cream" style={{ fontSize: '2.8cqw' }}>
          {t('eduLive.results.zeroNoteTitle')}
        </span>
        <span dir="auto" className="font-neo-body font-bold leading-snug text-neo-cream/90" style={{ fontSize: '1.7cqw' }}>
          {t('eduLive.results.zeroNoteHint')}
        </span>
      </span>
    </div>
  );
}

export default ZeroRoundNote;
