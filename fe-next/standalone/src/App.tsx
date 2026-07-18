import { useEffect, useMemo, useState, useCallback } from 'react';
import { generateBoard, type LetterGrid } from './core/board';
import { buildPositionsMap, isWordOnBoard } from './core/validate';
import { loadDictionary, isRealWord } from './core/dict';
import { calculateWordScore } from './core/scoring';

/**
 * P0 walking skeleton: prove the full pipeline end-to-end in a built, served
 * bundle — dict inflates, board renders, a built word is authoritatively
 * validated (on-board AND in-dict) and scored. Plain-div board + click-to-append;
 * the real drag-trace board (GridComponent / vanilla) lands in P1.
 */
export function App() {
  const [dict, setDict] = useState<Set<string> | null>(null);
  const [dictError, setDictError] = useState<string | null>(null);
  const [board] = useState<LetterGrid>(() => generateBoard());
  const [path, setPath] = useState<[number, number][]>([]);
  const [found, setFound] = useState<{ word: string; score: number }[]>([]);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    loadDictionary()
      .then(setDict)
      .catch((e) => setDictError(String(e)));
  }, []);

  const positionsMap = useMemo(() => buildPositionsMap(board), [board]);
  const word = path.map(([r, c]) => board[r][c]).join('');
  const foundWords = useMemo(() => new Set(found.map((f) => f.word.toLowerCase())), [found]);
  const total = found.reduce((s, f) => s + f.score, 0);

  const tap = useCallback((r: number, c: number) => {
    setMsg('');
    setPath((p) => (p.some(([pr, pc]) => pr === r && pc === c) ? p : [...p, [r, c]]));
  }, []);

  const submit = useCallback(() => {
    if (!dict) return;
    const w = word.toLowerCase();
    if (w.length < 2) { setMsg('Too short'); setPath([]); return; }
    if (foundWords.has(w)) { setMsg('Already found'); setPath([]); return; }
    if (!isWordOnBoard(word, board, positionsMap)) { setMsg('Not a valid path'); setPath([]); return; }
    if (!isRealWord(dict, w)) { setMsg(`"${w}" not in dictionary`); setPath([]); return; }
    const score = calculateWordScore(w);
    setFound((f) => [{ word: w, score }, ...f]);
    setMsg(`+${score}`);
    setPath([]);
  }, [dict, word, board, positionsMap, foundWords]);

  return (
    <div style={S.wrap}>
      <div style={S.head}>
        <span style={S.brand}>LexiClash</span>
        <span style={S.score}>{total}</span>
      </div>

      {!dict && !dictError && <div style={S.status}>Loading dictionary…</div>}
      {dictError && <div style={{ ...S.status, color: '#FF3366' }}>Dict error: {dictError}</div>}

      <div style={S.grid}>
        {board.map((row, r) =>
          row.map((ch, c) => {
            const active = path.some(([pr, pc]) => pr === r && pc === c);
            return (
              <button
                key={`${r}-${c}`}
                onClick={() => tap(r, c)}
                style={{ ...S.tile, ...(active ? S.tileActive : null) }}
              >
                {ch}
              </button>
            );
          }),
        )}
      </div>

      <div style={S.current}>{word || ' '}</div>
      <div style={S.controls}>
        <button style={S.btn} onClick={() => { setPath([]); setMsg(''); }}>Clear</button>
        <button style={{ ...S.btn, ...S.btnPrimary }} onClick={submit} disabled={!dict}>Submit</button>
      </div>
      <div style={S.msg}>{msg || ' '}</div>

      <div style={S.found}>
        {found.map((f) => (
          <span key={f.word} style={S.chip}>{f.word} <b>+{f.score}</b></span>
        ))}
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  wrap: { maxWidth: 480, margin: '0 auto', padding: 16, color: '#FFFEF0', fontFamily: 'system-ui, sans-serif', display: 'flex', flexDirection: 'column', gap: 12, minHeight: '100%', boxSizing: 'border-box' },
  head: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  brand: { fontSize: 24, fontWeight: 800, color: '#BFFF00' },
  score: { fontSize: 28, fontWeight: 800 },
  status: { textAlign: 'center', opacity: 0.8 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, aspectRatio: '1', width: '100%' },
  tile: { fontSize: '7vmin', fontWeight: 800, color: '#1a1a2e', background: '#FFFEF0', border: '3px solid #000', borderRadius: 10, boxShadow: '3px 3px 0 #000', cursor: 'pointer', aspectRatio: '1' },
  tileActive: { background: '#BFFF00', transform: 'translate(1px,1px)', boxShadow: '2px 2px 0 #000' },
  current: { textAlign: 'center', fontSize: 28, fontWeight: 800, letterSpacing: 2, minHeight: 34, color: '#00FFFF' },
  controls: { display: 'flex', gap: 8 },
  btn: { flex: 1, padding: '12px 0', fontSize: 18, fontWeight: 800, borderRadius: 10, border: '3px solid #000', boxShadow: '3px 3px 0 #000', background: '#FFFEF0', color: '#1a1a2e', cursor: 'pointer' },
  btnPrimary: { background: '#FF1493', color: '#fff' },
  msg: { textAlign: 'center', minHeight: 22, fontWeight: 700, color: '#BFFF00' },
  found: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  chip: { background: '#16213e', border: '2px solid #000', borderRadius: 8, padding: '4px 8px', fontSize: 14 },
};
