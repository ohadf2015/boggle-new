'use client';
import type { ClueFragment } from '@/lib/word-vault/beats/types';

// Sigil-style glyphs — no emoji. Each is a single non-pictographic mark that
// reads as occult notation rather than a cartoon icon. The Hebrew label gives
// SR-accessible meaning; the glyph carries the mood.
const ICON_GLYPH: Record<string, string> = {
  cold: '✶',
  dark: '◐',
  empty: '∅',
  name: '⟡',
  echo: '∽',
};

const ICON_LABEL_HE: Record<string, string> = {
  cold: 'קור',
  dark: 'אפלה',
  empty: 'ריק',
  name: 'שם',
  echo: 'הד',
};

export function Notebook({ fragments }: { fragments: ClueFragment[] }) {
  if (fragments.length === 0) {
    return (
      <aside
        dir="rtl"
        className="rounded-sm border border-stone-700/60 bg-[#0b1220]/85 p-3 text-stone-500 text-sm font-rubik tracking-wide"
      >
        <span className="font-serif italic">הפנקס ריק.</span> גע בעצמים בחדר כדי לאסוף רמזים.
      </aside>
    );
  }

  return (
    <aside
      dir="rtl"
      className="rounded-sm border border-stone-700/60 bg-[#0b1220]/85 p-3 text-sm space-y-2 max-h-52 overflow-y-auto shadow-[0_0_20px_rgba(255,107,53,0.08)]"
    >
      <h3 className="text-orange-200/70 font-rubik text-[10px] uppercase tracking-[0.3em] mb-2 border-b border-stone-700/40 pb-1">
        פנקס
      </h3>
      <ul className="space-y-1.5">
        {fragments.map((f) => (
          <li key={f.id} className="text-stone-200 leading-relaxed">
            {f.kind === 'whisper' && (
              <span className="font-serif italic text-stone-300">«{f.text}»</span>
            )}
            {f.kind === 'memory' && (
              <span className="font-serif italic text-orange-100/90">{f.text}</span>
            )}
            {f.kind === 'glyph' && (
              <span className="text-orange-300 text-lg font-serif tracking-widest">{f.glyph}</span>
            )}
            {f.kind === 'sense' && (
              <span
                className="inline-flex items-baseline gap-1 text-orange-200/80"
                aria-label={ICON_LABEL_HE[f.icon] ?? f.icon}
                title={ICON_LABEL_HE[f.icon] ?? f.icon}
              >
                <span className="text-base">{ICON_GLYPH[f.icon] ?? '·'}</span>
                <span className="text-[10px] uppercase tracking-[0.2em] text-stone-500">
                  {ICON_LABEL_HE[f.icon] ?? f.icon}
                </span>
              </span>
            )}
          </li>
        ))}
      </ul>
    </aside>
  );
}
