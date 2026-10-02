import { generatePreviewBoard } from '@/lib/education/previewBoard';
import { playableWord, type WordList } from '@/lib/seo/wordLists/model';

const SIZE = 5;

function seedFrom(id: string): number {
  let h = 2166136261;
  for (const ch of id) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

/**
 * One board the class could get from this list, built with the same seeded
 * generator as the teacher's lobby preview. Seeded by list id, so the HTML is
 * stable between crawls.
 */
export function BoardPreview({ list, title, hiddenLabel }: { list: WordList; title: string; hiddenLabel: string }) {
  const board = generatePreviewBoard({
    rows: SIZE,
    cols: SIZE,
    words: list.words.map((w) => playableWord(w.word)),
    language: list.lang,
    seed: seedFrom(list.id),
  });
  const first = board.placements[0];
  const lit = new Map((first?.path ?? []).map(([r, c], i) => [`${r}:${c}`, i]));
  const shown = new Map(list.words.map((w) => [playableWord(w.word), w.word]));

  return (
    <figure className="rounded-neo border-4 border-neo-black bg-neo-purple p-4 shadow-hard-xl sm:p-5">
      <figcaption className="font-neo-display text-xs font-black uppercase tracking-widest text-neo-white">{title}</figcaption>
      <div
        data-board
        dir={list.lang === 'he' ? 'rtl' : 'ltr'}
        className="mt-3 grid grid-cols-5 gap-1.5 rounded-lg border-3 border-neo-cream/40 bg-neo-navy p-2"
        aria-hidden
      >
        {board.grid.flatMap((row, r) =>
          row.map((ch, c) => {
            const step = lit.get(`${r}:${c}`);
            return (
              <span
                key={`${r}-${c}`}
                data-cell
                className={`relative flex aspect-square items-center justify-center rounded-md border-2 border-neo-black font-neo-display text-xl font-black uppercase shadow-hard-sm sm:text-2xl ${
                  step === undefined ? 'bg-neo-white text-neo-navy' : 'bg-neo-lime text-neo-navy'
                }`}
              >
                {ch}
                {step !== undefined && (
                  <span className="absolute end-0.5 top-0 text-[9px] font-black text-neo-navy/60">{step + 1}</span>
                )}
              </span>
            );
          }),
        )}
      </div>
      {board.embedded.length > 0 && (
        <p className="mt-3 text-sm font-bold text-neo-white">
          {hiddenLabel}{' '}
          <bdi>
            {board.embedded.map((w, i) => (
              <span key={w}>
                {i > 0 && ', '}
                <span data-hidden-word lang={list.lang} className={i === 0 ? 'rounded bg-neo-lime px-1 text-neo-navy' : ''}>
                  {shown.get(w) ?? w}
                </span>
              </span>
            ))}
          </bdi>
        </p>
      )}
    </figure>
  );
}
