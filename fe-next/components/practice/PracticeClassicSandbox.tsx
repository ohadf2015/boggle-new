'use client';

import { useCallback, useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import PracticeChainCta from './PracticeChainCta';
import PracticeCoachTip from './PracticeCoachTip';

/**
 * Curated 4x4 practice board per language. Hand-picked to surface common
 * 3–5 letter words so a new player gets quick wins without dictionary
 * dependence. Pure constant — no random generation, no API solve call.
 */
const BOARDS: Record<string, string[][]> = {
  en: [
    ['S', 'T', 'A', 'R'],
    ['E', 'O', 'N', 'I'],
    ['P', 'L', 'A', 'T'],
    ['E', 'R', 'I', 'N'],
  ],
  he: [
    ['ש', 'ל', 'ו', 'ם'],
    ['ב', 'י', 'ת', 'א'],
    ['מ', 'ן', 'ר', 'ה'],
    ['ע', 'ק', 'ו', 'ל'],
  ],
  sv: [
    ['S', 'T', 'A', 'R'],
    ['E', 'O', 'N', 'I'],
    ['P', 'L', 'A', 'T'],
    ['E', 'R', 'I', 'N'],
  ],
  ja: [
    ['い', 'ぬ', 'か', 'み'],
    ['ね', 'こ', 'と', 'り'],
    ['さ', 'く', 'ら', 'ま'],
    ['は', 'な', 'ゆ', 'き'],
  ],
  es: [
    ['C', 'A', 'S', 'A'],
    ['M', 'E', 'L', 'O'],
    ['T', 'I', 'A', 'R'],
    ['E', 'O', 'N', 'P'],
  ],
};

/**
 * Hand-picked acceptable words per board. Practice is forgiving — small list,
 * everything definitely findable on the curated board. Far simpler than booting
 * the full solver/dictionary stack just to validate three-letter words.
 */
const VALID_WORDS: Record<string, ReadonlySet<string>> = {
  en: new Set([
    'STAR', 'STARE', 'STORE', 'STOP', 'TAR', 'TARE', 'EAT', 'ATE',
    'NOR', 'ION', 'PLAN', 'PLANT', 'PLATE', 'RAT', 'RAIN', 'PAIN',
    'PAINT', 'TIN', 'TON', 'NOSE', 'SET', 'PET', 'NET', 'POE', 'TAPE',
  ]),
  he: new Set([
    'שלום', 'שם', 'שלי', 'בית', 'בן', 'מן', 'מים', 'מילה', 'אמא', 'אבא',
    'תה', 'הם', 'הר', 'מר', 'אם', 'ים',
  ]),
  sv: new Set([
    'STAR', 'STAL', 'STEN', 'TON', 'TIO', 'PIL', 'RIS', 'EN', 'EL',
    'NIO', 'PLAN', 'NATT', 'SE', 'TE',
  ]),
  ja: new Set([
    'いぬ', 'ねこ', 'とり', 'さくら', 'はな', 'ゆき', 'かみ',
  ]),
  es: new Set([
    'CASA', 'MELO', 'MIEL', 'MAR', 'MES', 'TIA', 'OSO', 'EL', 'LA',
    'SAL', 'PAN', 'TE', 'ME',
  ]),
};

interface Cell { row: number; col: number; letter: string }

const isAdjacent = (a: Cell, b: Cell): boolean =>
  Math.abs(a.row - b.row) <= 1 && Math.abs(a.col - b.col) <= 1 && !(a.row === b.row && a.col === b.col);

const cellKey = (c: Cell) => `${c.row}-${c.col}`;

export default function PracticeClassicSandbox() {
  const { language, t } = useLanguage();
  const board = BOARDS[language] ?? BOARDS.en;
  const validWords = VALID_WORDS[language] ?? VALID_WORDS.en;

  const [path, setPath] = useState<Cell[]>([]);
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'bad' | 'dup'; message: string } | null>(null);

  const currentWord = useMemo(() => path.map((c) => c.letter).join(''), [path]);
  const selectedKeys = useMemo(() => new Set(path.map(cellKey)), [path]);

  const handleTap = useCallback((row: number, col: number, letter: string) => {
    const cell: Cell = { row, col, letter };
    setFeedback(null);
    setPath((prev) => {
      // Tapping an already-selected tile — undo back to (and including) it.
      const idx = prev.findIndex((c) => c.row === row && c.col === col);
      if (idx !== -1) return prev.slice(0, idx);
      // First tap: anywhere. Subsequent taps must be adjacent to the path tail.
      if (prev.length === 0) return [cell];
      if (!isAdjacent(prev[prev.length - 1], cell)) return prev;
      return [...prev, cell];
    });
  }, []);

  const submit = useCallback(() => {
    if (currentWord.length < 2) return;
    const upper = currentWord.toUpperCase();
    if (foundWords.includes(upper)) {
      setFeedback({ kind: 'dup', message: t('practice.classic.duplicate') });
      return;
    }
    // Practice is forgiving — accept either casing for non-Latin scripts.
    const candidates = [upper, currentWord];
    const hit = candidates.some((w) => validWords.has(w));
    if (hit) {
      setFoundWords((prev) => [...prev, upper]);
      setFeedback({ kind: 'ok', message: t('practice.classic.found') });
      setPath([]);
    } else {
      setFeedback({ kind: 'bad', message: t('practice.classic.notAWord') });
    }
  }, [currentWord, foundWords, validWords, t]);

  const reset = useCallback(() => {
    setPath([]);
    setFeedback(null);
  }, []);

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto px-4 py-4 gap-3">
      <PracticeCoachTip mode="classic" wordsFound={foundWords.length} />

      <p className="text-neo-cream/80 text-sm text-center font-neo-body">
        {t('practice.classic.instruction')}
      </p>

      <div
        data-testid="practice-board"
        className="grid grid-cols-4 gap-2 w-full max-w-xs"
      >
        {board.map((row, rIdx) =>
          row.map((letter, cIdx) => {
            const selected = selectedKeys.has(`${rIdx}-${cIdx}`);
            return (
              <button
                key={`${rIdx}-${cIdx}`}
                type="button"
                data-testid={`practice-tile-${rIdx}-${cIdx}`}
                onClick={() => handleTap(rIdx, cIdx, letter)}
                className={
                  'aspect-square rounded-neo border-2 border-neo-black font-neo-display font-black text-2xl shadow-hard-sm transition-transform ' +
                  (selected
                    ? 'bg-neo-lime text-neo-black scale-95'
                    : 'bg-neo-cream text-neo-black active:scale-95')
                }
              >
                {letter}
              </button>
            );
          })
        )}
      </div>

      <div
        data-testid="practice-current-word"
        className="min-h-[2rem] font-neo-display font-black text-xl text-neo-cream tracking-wider"
      >
        {currentWord}
      </div>

      <div className="flex gap-2 w-full">
        <button
          type="button"
          onClick={submit}
          disabled={currentWord.length < 2}
          className="flex-1 bg-neo-cyan text-neo-black border-2 border-neo-black rounded-neo py-2 font-neo-display font-black text-sm shadow-hard active:shadow-hard-pressed disabled:opacity-50"
        >
          {t('practice.classic.submit')}
        </button>
        <button
          type="button"
          onClick={reset}
          className="bg-neo-navy-light text-neo-cream border-2 border-neo-cream/30 rounded-neo px-3 py-2 font-neo-display font-black text-sm"
        >
          {t('practice.classic.reset')}
        </button>
      </div>

      {feedback && (
        <div
          role="status"
          aria-live="polite"
          className={
            'text-sm font-neo-body px-3 py-1.5 rounded-neo border-2 border-neo-black ' +
            (feedback.kind === 'ok'
              ? 'bg-neo-lime text-neo-black'
              : feedback.kind === 'dup'
                ? 'bg-neo-yellow text-neo-black'
                : 'bg-neo-red text-neo-white')
          }
        >
          {feedback.message}
        </div>
      )}

      <div className="w-full">
        <p className="text-neo-cream/60 text-xs uppercase font-neo-display font-black mb-1">
          {t('practice.classic.foundWordsLabel', { count: foundWords.length })}
        </p>
        <ul className="flex flex-wrap gap-1.5 min-h-[1.5rem]">
          {foundWords.map((w) => (
            <li
              key={w}
              className="px-2 py-0.5 bg-neo-lime/20 border border-neo-lime/40 rounded text-neo-lime text-xs font-neo-display font-bold"
            >
              {w}
            </li>
          ))}
        </ul>
      </div>

      <PracticeChainCta currentMode="classic" className="mt-2 inline-flex items-center justify-center w-full bg-neo-lime text-neo-black border-3 border-neo-black rounded-neo py-3 px-4 font-neo-display font-black text-base shadow-hard active:shadow-hard-pressed" />
    </div>
  );
}
