import { ART, C, WordSticker, hardBox, visual, type OgLang } from './brand';

export interface WheelData {
  center: string;
  outer: string[];
  word: string[];
}

export interface BoardData {
  rows: string[][];
  path: [number, number][];
}

export interface SolverData {
  rack: string[];
  words: string[];
}

function Trail({ points }: { points: { x: number; y: number }[] }) {
  const pts = points.map((p) => `${p.x},${p.y}`).join(' ');
  return (
    <svg width={ART} height={ART} viewBox={`0 0 ${ART} ${ART}`} style={{ position: 'absolute', left: 0, top: 0 }}>
      <polyline points={pts} fill="none" stroke={C.black} strokeWidth={30} strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={pts} fill="none" stroke={C.pink} strokeWidth={20} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Tile({ x, y, size, letter, hit, hub }: { x: number; y: number; size: number; letter: string; hit: boolean; hub?: boolean }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        borderRadius: hub ? size / 2 : hub === false ? 18 : size / 2,
        ...hardBox(hub ? C.lime : hit ? C.pink : C.cream),
        color: hub ? C.black : hit ? C.cream : C.navy,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: hub ? 62 : 46,
      }}
    >
      {letter}
    </div>
  );
}

const disc = {
  position: 'absolute' as const,
  left: 0,
  top: 0,
  width: ART,
  height: ART,
  background: C.navyLight,
  border: `6px solid ${C.black}`,
  boxShadow: `12px 12px 0 ${C.black}`,
};

export function WheelArt({ data, lang }: { data: WheelData; lang: OgLang }) {
  const radius = 150;
  const at = (letter: string) => {
    if (letter === data.center) return { x: ART / 2, y: ART / 2 };
    const rad = (data.outer.indexOf(letter) * 60 * Math.PI) / 180;
    return { x: ART / 2 + Math.sin(rad) * radius, y: ART / 2 - Math.cos(rad) * radius };
  };
  const inWord = new Set(data.word);
  return (
    <div style={{ display: 'flex', position: 'absolute', left: 0, top: 0, width: ART, height: ART }}>
      <div style={{ ...disc, borderRadius: ART / 2 }} />
      <div
        style={{
          position: 'absolute',
          left: 14,
          top: 14,
          width: ART - 28,
          height: ART - 28,
          borderRadius: ART / 2,
          border: '4px dashed rgba(191,255,0,0.45)',
        }}
      />
      <Trail points={data.word.map(at)} />
      {data.outer.map((l) => (
        <Tile key={l} {...at(l)} size={92} letter={l} hit={inWord.has(l)} />
      ))}
      <Tile {...at(data.center)} size={118} letter={data.center} hit hub />
      <WordSticker word={data.word.join('')} lang={lang} style={{ top: -34, [lang === 'he' ? 'right' : 'left']: -40 }} />
    </div>
  );
}

export function BoardArt({ data, lang }: { data: BoardData; lang: OgLang }) {
  const tile = 84;
  const gap = 14;
  const origin = (ART - (4 * tile + 3 * gap)) / 2 + tile / 2;
  const at = ([r, c]: [number, number]) => ({ x: origin + c * (tile + gap), y: origin + r * (tile + gap) });
  const onPath = new Set(data.path.map(([r, c]) => `${r},${c}`));
  const word = data.path.map(([r, c]) => data.rows[r][c]).join('');
  const mascotCol = boardMascotCol(lang);
  return (
    <div style={{ display: 'flex', position: 'absolute', left: 0, top: 0, width: ART, height: ART }}>
      <div style={{ ...disc, borderRadius: 34 }} />
      <Trail points={data.path.map(at)} />
      {data.rows.flatMap((row, r) =>
        row.map((l, c) =>
          r === 3 && c === mascotCol ? null : (
            <Tile key={`${r}-${c}`} {...at([r, c])} size={tile} letter={l} hit={onPath.has(`${r},${c}`)} hub={false} />
          ),
        ),
      )}
      <WordSticker word={word} lang={lang} style={{ top: -36, [lang === 'he' ? 'right' : 'left']: -40 }} />
    </div>
  );
}

/** The mascot sits in this bottom-row cell, so it is left empty. */
export const boardMascotCol = (lang: OgLang) => (lang === 'he' ? 0 : 3);

export function SolverArt({ data, lang }: { data: SolverData; lang: OgLang }) {
  const rtl = lang === 'he';
  return (
    <div
      style={{
        ...disc,
        borderRadius: 34,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '34px 28px',
        gap: 16,
      }}
    >
      <div style={{ display: 'flex', flexDirection: rtl ? 'row-reverse' : 'row', gap: 8 }}>
        {data.rack.map((l, i) => (
          <div
            key={i}
            style={{
              width: 52,
              height: 58,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              ...hardBox(C.lime, 4),
              borderRadius: 10,
              color: C.black,
              fontSize: 32,
            }}
          >
            {l}
          </div>
        ))}
      </div>
      <svg width={40} height={30} viewBox="0 0 40 30">
        <path d="M20 2v20M8 14l12 12 12-12" fill="none" stroke={C.cyan} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {data.words.map((w, i) => (
        <div
          key={w}
          style={{
            display: 'flex',
            width: 300 - i * 30,
            justifyContent: 'center',
            ...hardBox(i === 0 ? C.pink : C.cream, 4),
            borderRadius: 12,
            color: i === 0 ? C.cream : C.navy,
            fontSize: i === 0 ? 38 : 30,
            height: i === 0 ? 54 : 44,
            alignItems: 'center',
            lineHeight: 1,
            letterSpacing: lang === 'ja' ? 0 : 3,
          }}
        >
          {visual(w, lang)}
        </div>
      ))}
    </div>
  );
}
