'use client';

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Check, Delete } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import type { StackContent } from '@/lib/holidays/arcade/content';
import { displayWord, fold, minWordLength, wordLength } from '@/lib/holidays/arcade/letters';
import { STACK_COLS, STACK_ROWS, STACK_SECONDS, adjacent, chainLetters, newStack, stackClear, stackTick, type Cell, type StackState } from '@/lib/holidays/arcade/stack';
import { cn } from '@/lib/utils';
import arcade from '../arcade.module.css';
import { useArcadeFx } from '../ArcadeShell';
import { useArcadeLoop } from '../useArcadeLoop';
import type { RoundEnd } from '../useArcadeRound';
import { useWordJudge } from '../useWordJudge';
import styles from './stack.module.css';

interface Props {
  content: StackContent;
  lang: string;
  onScore: (score: number) => void;
  onEnd: (end: RoundEnd) => void;
}

const CELL = 50;
const same = (a: Cell, b: Cell) => a.c === b.c && a.r === b.r;

export default function StackGame({ content, lang, onScore, onEnd }: Props) {
  const { t } = useLanguage();
  const sfx = useSoundEffects();
  const fx = useArcadeFx();
  const judge = useWordJudge(lang);
  const sim = useRef<StackState>(newStack(content.drops));
  const timeBar = useRef<HTMLDivElement>(null);
  const tray = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const moved = useRef(false);
  const last = useRef<Cell | null>(null);
  const [snap, setSnap] = useState(() => sim.current);
  const [path, setPath] = useState<Cell[]>([]);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<'bad' | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useArcadeLoop((dt) => {
    const prev = sim.current;
    const next = stackTick(prev, dt, content.drops);
    sim.current = next;
    if (next.next !== prev.next || next.over !== prev.over) {
      setSnap(next);
      if (next.next !== prev.next) sfx.playTileSelectSound();
    }
    if (timeBar.current) timeBar.current.style.transform = `scaleX(${Math.max(0, 1 - next.elapsed / STACK_SECONDS)})`;
  }, !fx.paused && !snap.over);

  useEffect(() => {
    if (!snap.over) return;
    const s = sim.current;
    if (s.won) {
      sfx.playVictorySound();
      fx.burstAt(tray.current, 'confetti', 24);
    } else sfx.playDefeatSound();
    onEnd({ score: s.score, plays: s.plays, won: s.won });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snap.over]);

  const extend = useCallback((cell: Cell, drag: boolean) => {
    setPath((p) => {
      if (!sim.current.cols[cell.c]?.[cell.r]) return p;
      const i = p.findIndex((x) => same(x, cell));
      if (i >= 0) return drag ? p.slice(0, i + 1) : p.slice(0, i);
      if (!p.length || adjacent(p[p.length - 1], cell)) {
        if (drag) moved.current = true;
        return [...p, cell];
      }
      return drag ? p : [cell];
    });
  }, []);

  const submit = useCallback(async () => {
    const s = sim.current;
    if (busy || s.over || !path.length) return;
    const word = chainLetters(s, path);
    const ids = path.map((p) => s.cols[p.c][p.r].id);
    const bad = (key: string) => {
      setNote(t(key));
      setFlash('bad');
      setPath([]);
    };
    if (wordLength(word, lang) < minWordLength(lang)) return bad('holiday.arcade.reject.short');
    setBusy(true);
    const res = await judge(word, [...word], new Set());
    setBusy(false);
    const now = sim.current;
    const still = path.every((p, k) => now.cols[p.c]?.[p.r]?.id === ids[k]);
    if (!still) return setPath([]);
    if (!res.ok) return res.reason === 'offline' ? setNote(t('holiday.arcade.reject.offline')) : bad(`holiday.arcade.reject.${res.reason}`);
    const first = tray.current?.querySelector(`[data-id="${ids[0]}"]`) ?? null;
    fx.burstAt(first, res.len >= 5 ? 'confetti' : 'coin', res.len >= 5 ? 18 : 8);
    const next = stackClear(now, path, res.word, res.len);
    fx.floatAt(first, `+${next.score - now.score}`);
    if (res.len >= 5) {
      sfx.playLongWordBonusSound();
      fx.cheer(t('holiday.arcade.sufganiyah.splash'));
    }
    sim.current = next;
    onScore(next.score);
    setSnap(next);
    setPath([]);
    setNote(null);
  }, [busy, path, lang, judge, t, fx, sfx, onScore]);

  useEffect(() => {
    if (snap.over) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        void submit();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        setPath((p) => p.slice(0, -1));
      } else if (e.key === 'Escape') setPath([]);
      else if (e.key.length === 1) {
        const k = fold(e.key, lang);
        const cols = sim.current.cols;
        setPath((p) => {
          const last = p[p.length - 1];
          for (let c = 0; c < cols.length; c++) {
            for (let r = 0; r < cols[c].length; r++) {
              const cell = { c, r };
              if (fold(cols[c][r].letter, lang) !== k || p.some((x) => same(x, cell))) continue;
              if (!last || adjacent(last, cell)) return [...p, cell];
            }
          }
          return p;
        });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [snap.over, submit, lang]);

  const cellFrom = (e: ReactPointerEvent): Cell | null => {
    const hit = document.elementFromPoint?.(e.clientX, e.clientY) ?? (e.target as Element);
    const el = hit?.closest('[data-c]') as HTMLElement | null;
    return el ? { c: Number(el.dataset.c), r: Number(el.dataset.r) } : null;
  };

  const down = (e: ReactPointerEvent) => {
    const cell = cellFrom(e);
    if (!cell || snap.over) return;
    dragging.current = true;
    moved.current = false;
    last.current = cell;
    extend(cell, false);
  };
  const move = (e: ReactPointerEvent) => {
    if (!dragging.current) return;
    const cell = cellFrom(e);
    if (!cell || (last.current && same(last.current, cell))) return;
    last.current = cell;
    extend(cell, true);
  };
  const up = () => {
    if (!dragging.current) return;
    dragging.current = false;
    if (moved.current && path.length >= minWordLength(lang)) void submit();
  };

  const nextDrop = content.drops[snap.next];
  const danger = snap.cols.some((c) => c.length >= STACK_ROWS - 1);
  const word = chainLetters(snap, path);

  return (
    <div className="flex flex-[1_0_auto] flex-col">
      <div ref={timeBar} className="h-1.5 origin-left bg-neo-holiday-blue will-change-transform rtl:origin-right" aria-hidden="true" />
      <div className="flex flex-[1_0_auto] flex-col justify-center">
        <div className="relative mx-auto mt-2 h-6" style={{ width: STACK_COLS * CELL }} dir="ltr" aria-hidden="true">
          {nextDrop && (
            <span data-testid="stack-next" className="absolute top-0" style={{ left: nextDrop.col * CELL + CELL / 2 - 13 }}>
              <span className={cn(styles.letter, styles.next)}>{nextDrop.letter}</span>
            </span>
          )}
        </div>
        <div
          ref={tray}
          dir="ltr"
          className={styles.tray}
          style={{ width: STACK_COLS * CELL + 6, height: STACK_ROWS * CELL + 3 }}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={() => (dragging.current = false)}
          role="group"
          aria-label={t('holiday.arcade.sufganiyah.tray')}
        >
          {danger && <div className={styles.danger} aria-hidden="true" />}
          {snap.cols.map((col, c) =>
            col.map((d, r) => {
              const on = path.some((p) => p.c === c && p.r === r);
              return (
                <button
                  key={d.id}
                  type="button"
                  data-c={c}
                  data-r={r}
                  data-id={d.id}
                  tabIndex={-1}
                  aria-label={d.letter}
                  aria-pressed={on}
                  className={cn(styles.slot, on && styles.on)}
                  style={{ width: CELL, height: CELL, transform: `translate(${c * CELL}px, ${-r * CELL}px)` }}
                >
                  <span className={styles.dough}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/holidays/props-sufganiyah.webp" alt="" draggable={false} />
                    <span className={styles.letter}>{d.letter}</span>
                  </span>
                </button>
              );
            }),
          )}
        </div>
      </div>
      <div className="px-3 pb-3 pt-3">
        <p className="mb-2 min-h-5 text-center text-xs font-bold text-neo-holiday-gold" aria-live="assertive">
          {note ?? t('holiday.arcade.sufganiyah.hint')}
        </p>
        <div className="grid grid-cols-[auto_1fr_auto] gap-2">
          <button
            type="button"
            onClick={() => setPath((p) => p.slice(0, -1))}
            disabled={!path.length}
            aria-label={t('holiday.arcade.erase')}
            className="grid size-14 place-items-center rounded-xl border-[3px] border-black bg-neo-navy-light shadow-hard disabled:opacity-40"
          >
            <Delete className="size-5 rtl:rotate-180" aria-hidden="true" />
          </button>
          <div
            dir="auto"
            onAnimationEnd={() => setFlash(null)}
            className={cn('flex h-14 items-center justify-center rounded-xl border-[3px] border-black bg-neo-cream px-2 font-neo-display text-2xl font-black uppercase text-neo-navy shadow-hard', flash === 'bad' && arcade.shake)}
            aria-live="polite"
          >
            {displayWord(word, lang) || <span className="text-xs font-bold normal-case text-neo-navy/50">{t('holiday.arcade.sufganiyah.pick')}</span>}
          </div>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={!path.length || busy || snap.over}
            aria-label={t('holiday.arcade.submit')}
            className="grid size-14 place-items-center rounded-xl border-[3px] border-black bg-neo-lime text-neo-navy shadow-hard disabled:opacity-40"
          >
            <Check className="size-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
