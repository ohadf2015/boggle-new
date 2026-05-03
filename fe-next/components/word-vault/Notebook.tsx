'use client';
import type { ClueFragment } from '@/lib/word-vault/beats/types';

const ICON_LABEL: Record<string, string> = {
  cold: '❄',
  dark: '🌑',
  empty: '∅',
  name: '✦',
  echo: '〰',
};

export function Notebook({ fragments }: { fragments: ClueFragment[] }) {
  if (fragments.length === 0) {
    return (
      <aside
        dir="rtl"
        className="rounded border border-stone-700 bg-stone-900/80 p-3 text-stone-400 text-sm"
      >
        הפנקס ריק. גע בעצמים בחדר כדי לאסוף רמזים.
      </aside>
    );
  }

  return (
    <aside
      dir="rtl"
      className="rounded border border-stone-700 bg-stone-900/80 p-3 text-sm space-y-1 max-h-48 overflow-y-auto"
    >
      <h3 className="text-stone-300 font-bold mb-1">פנקס</h3>
      <ul className="space-y-1">
        {fragments.map((f) => (
          <li key={f.id} className="text-stone-200">
            {f.kind === 'whisper' && <span>«{f.text}»</span>}
            {f.kind === 'memory' && <span className="italic">{f.text}</span>}
            {f.kind === 'glyph' && <span className="text-yellow-300 text-xl">{f.glyph}</span>}
            {f.kind === 'sense' && (
              <span aria-label={`clue-icon-${f.icon}`} title={f.icon}>
                {ICON_LABEL[f.icon]}
              </span>
            )}
          </li>
        ))}
      </ul>
    </aside>
  );
}
