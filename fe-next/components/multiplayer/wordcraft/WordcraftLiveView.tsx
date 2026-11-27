'use client';

/**
 * WordcraftLiveView — the student's live race surface.
 *
 * One verb: craft a word from your rack and PLACE it before the Baron (and the
 * class) outpace you. Everything server-known (board, rack, scores, targets)
 * comes from the useWordcraftLive snapshot; this component is pure rendering
 * plus tap choreography. Arcade: hardcoded neo-navy, never the theme-responsive
 * cream pair (mobile-web FOUC); a classroom round takes the sky skin.
 */
import { useMemo } from 'react';
import { Hammer, ArrowRightLeft } from 'lucide-react';
import { createBoard, type Board, type BoardSize } from '@/lib/word-craft/board';
import type { WordcraftLiveSnapshot } from '@/shared/types/wordcraftLive';
import { useClassroomPressure } from '@/hooks/gameState/classroomPressureStore';
import { isStudentTimerHidden } from '@/shared/utils/classroomPressure';
import { useClassroomBoard } from '@/components/education/live/classroomBoard';
import { useWordcraftLive, type WordcraftHint, type WordcraftLiveSocket } from './useWordcraftLive';

type Translate = (key: string, vars?: Record<string, string | number>) => string;

export interface WordcraftLiveViewProps {
  socket: WordcraftLiveSocket | null;
  username: string;
  t: Translate;
  remainingTime?: number | null;
}

const ERROR_KEY: Record<string, string> = {
  INVALID_WORD: 'education.wordcraftLive.errors.invalidWord',
  DISCONNECTED: 'education.wordcraftLive.errors.disconnected',
  CELL_OCCUPIED: 'education.wordcraftLive.errors.cellOccupied',
};

const PREMIUM_CLASS: Record<string, string> = {
  DL: 'bg-neo-cyan/25 text-neo-cyan',
  TL: 'bg-neo-cyan/50 text-neo-navy',
  DW: 'bg-neo-pink/25 text-neo-pink',
  TW: 'bg-neo-pink/50 text-neo-navy',
};

// Classroom: solid accent fills with black ink, since a 25% tint vanishes on cream.
const PREMIUM_CLASS_CLASSROOM: Record<string, string> = {
  DL: 'bg-neo-cyan/50 text-neo-black',
  TL: 'bg-neo-cyan text-neo-black',
  DW: 'bg-neo-pink/50 text-neo-black',
  TW: 'bg-neo-pink text-neo-black',
};

const SKIN = {
  arcade: {
    waiting: 'flex min-h-[60vh] items-center justify-center bg-neo-navy text-neo-cream font-neo-body',
    waitingCard: 'flex items-center gap-3 rounded-neo border-2 border-neo-cyan bg-neo-navy-light px-6 py-4 shadow-hard',
    waitingIcon: 'h-6 w-6 text-neo-cyan animate-neo-wobble',
    root: 'flex h-full min-h-0 flex-1 flex-col gap-1.5 overflow-hidden bg-neo-navy px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 text-neo-cream font-neo-body',
    hud: 'flex shrink-0 items-center justify-between gap-2 rounded-neo border-2 border-neo-cream/40 bg-neo-navy-light px-3 py-1.5 shadow-hard',
    myScore: 'font-neo-display text-xl font-black text-neo-cyan motion-safe:animate-[lc-wc-bump_380ms_cubic-bezier(.34,1.56,.64,1)]',
    hudLabel: 'text-xs uppercase text-neo-cream/70',
    clock: 'font-neo-display font-bold text-neo-cream',
    tiles: 'text-[10px] uppercase text-neo-cream/60',
    rivalScore: 'font-neo-display text-xl font-black text-neo-pink',
    targetBuilt: 'shrink-0 rounded-neo border-2 border-neo-lime bg-neo-lime/15 px-2 py-0.5 text-xs font-bold text-neo-lime',
    target: 'shrink-0 rounded-neo border-2 border-neo-cream/40 px-2 py-0.5 text-xs font-bold text-neo-cream/80',
    board: 'grid size-[min(100cqw,100cqh)] grid-cols-9 gap-0.5 rounded-neo border-2 border-neo-cream/40 bg-neo-navy-light p-1 shadow-hard',
    previewLoose: 'border-neo-lime/70 bg-neo-lime/25 text-neo-lime motion-safe:animate-[lc-wc-drop_260ms_cubic-bezier(.34,1.56,.64,1)]',
    star: 'border-neo-yellow bg-neo-yellow/20 text-neo-yellow motion-safe:animate-[lc-wc-star_1.4s_ease-in-out_infinite]',
    premiumEdge: 'border-neo-cream/40',
    empty: 'border-neo-cream/40 bg-neo-navy text-neo-cream/40',
    hintReady: 'shrink-0 text-center font-neo-display text-sm font-black text-neo-lime',
    hint: 'shrink-0 text-center font-neo-body text-sm font-bold text-neo-yellow',
    staged: 'flex min-h-10 flex-1 items-center rounded-neo border-2 border-dashed border-neo-cream/40 bg-neo-navy-light px-2 font-neo-display font-bold tracking-widest text-neo-lime',
    dirBtn: 'rounded-neo border-2 border-neo-cream/40 bg-neo-navy-light p-2.5 text-neo-cream shadow-hard-sm active:translate-y-0.5 active:shadow-none',
    recall: 'rounded-neo border-2 border-neo-cream/40 bg-neo-navy-light px-3 py-2.5 text-xs font-bold text-neo-cream shadow-hard-sm active:translate-y-0.5 active:shadow-none',
    placeDisabled: 'disabled:border-neo-cream/40 disabled:bg-neo-navy-light disabled:text-neo-cream/60',
    tileStaged: 'flex size-11 shrink flex-col items-center justify-center rounded-neo border-2 border-neo-lime bg-neo-lime/25 text-neo-lime shadow-hard-pressed -translate-y-1 transition-transform',
    activity: 'truncate rounded-neo border border-neo-cream/20 bg-neo-navy-light px-2 py-0.5 text-xs text-neo-cream/80 motion-safe:animate-[lc-wc-drop_260ms_ease-out]',
    bingo: 'me-1 font-black text-neo-yellow',
    gain: 'ms-1 font-bold text-neo-lime',
  },
  classroom: {
    waiting: 'flex min-h-[60vh] items-center justify-center bg-edu-page text-edu-ink font-neo-body',
    waitingCard: 'flex items-center gap-3 rounded-neo border-2 border-neo-black bg-edu-surface px-6 py-4 shadow-edu-lip-sm',
    waitingIcon: 'h-6 w-6 text-edu-cyan-ink animate-neo-wobble',
    root: 'flex h-full min-h-0 flex-1 flex-col gap-1.5 overflow-hidden bg-edu-page px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 text-edu-ink font-neo-body',
    hud: 'me-11 flex shrink-0 items-center justify-between gap-2 rounded-neo border-2 border-neo-black bg-edu-surface px-3 py-1.5 shadow-edu-lip-sm',
    myScore: 'font-neo-display text-xl font-black text-edu-cyan-ink motion-safe:animate-[lc-wc-bump_380ms_cubic-bezier(.34,1.56,.64,1)]',
    hudLabel: 'text-xs uppercase text-edu-ink/70',
    clock: 'font-neo-display font-bold text-edu-ink',
    tiles: 'text-[10px] uppercase text-edu-ink/70',
    rivalScore: 'font-neo-display text-xl font-black text-edu-pink-ink',
    targetBuilt: 'shrink-0 rounded-neo border-2 border-neo-black bg-neo-lime px-2 py-0.5 text-xs font-bold text-neo-black',
    target: 'shrink-0 rounded-neo border-2 border-neo-black bg-edu-surface px-2 py-0.5 text-xs font-bold text-edu-ink',
    board: 'grid size-[min(100cqw,100cqh)] grid-cols-9 gap-0.5 rounded-neo border-[3px] border-neo-black bg-edu-surface p-1 shadow-edu-lip',
    previewLoose: 'border-neo-black bg-neo-lime/50 text-neo-black motion-safe:animate-[lc-wc-drop_260ms_cubic-bezier(.34,1.56,.64,1)]',
    star: 'border-neo-black bg-neo-yellow text-neo-black motion-safe:animate-[lc-wc-star_1.4s_ease-in-out_infinite]',
    premiumEdge: 'border-edu-line/30',
    empty: 'border-edu-line/30 bg-edu-tile text-edu-ink/40',
    hintReady: 'shrink-0 text-center font-neo-display text-sm font-black text-edu-lime-ink',
    hint: 'shrink-0 text-center font-neo-body text-sm font-bold text-edu-ink',
    staged: 'flex min-h-10 flex-1 items-center rounded-neo border-2 border-dashed border-neo-black bg-edu-surface px-2 font-neo-display font-bold tracking-widest text-edu-ink',
    dirBtn: 'rounded-neo border-2 border-neo-black bg-edu-surface p-2.5 text-edu-ink shadow-hard-sm active:translate-y-0.5 active:shadow-none',
    recall: 'rounded-neo border-2 border-neo-black bg-edu-surface px-3 py-2.5 text-xs font-bold text-edu-ink shadow-hard-sm active:translate-y-0.5 active:shadow-none',
    placeDisabled: 'disabled:border-neo-black disabled:bg-edu-surface disabled:text-edu-ink/60',
    tileStaged: 'flex size-11 shrink flex-col items-center justify-center rounded-neo border-2 border-neo-black bg-neo-lime text-neo-black shadow-hard-pressed -translate-y-1 transition-transform',
    activity: 'truncate rounded-neo border border-neo-black bg-edu-surface px-2 py-0.5 text-xs text-edu-ink motion-safe:animate-[lc-wc-drop_260ms_ease-out]',
    bingo: 'me-1 font-black text-edu-yellow-ink',
    gain: 'ms-1 font-bold text-edu-lime-ink',
  },
} as const;

const HINT_KEY: Record<NonNullable<WordcraftHint>, string> = {
  first: 'eduStudent.wordcraft.hintFirst',
  more: 'eduStudent.wordcraft.hintMore',
  anchor: 'eduStudent.wordcraft.hintAnchor',
  ready: 'eduStudent.wordcraft.hintReady',
};

const WORDCRAFT_KEYFRAMES =
  '@keyframes lc-wc-drop{0%{transform:scale(.4)}100%{transform:scale(1)}}' +
  '@keyframes lc-wc-star{0%,100%{transform:scale(1)}50%{transform:scale(1.12)}}' +
  '@keyframes lc-wc-bump{0%{transform:scale(1.5)}100%{transform:scale(1)}}' +
  '@keyframes lc-wc-ready{0%,100%{box-shadow:3px 3px 0 #000,0 0 0 0 rgba(190,255,0,.7)}50%{box-shadow:3px 3px 0 #000,0 0 0 6px rgba(190,255,0,0)}}' +
  '@keyframes lc-wc-pop{0%{transform:translateY(12px) scale(.6)}25%{transform:translateY(0) scale(1.15)}70%{transform:translateY(-10px) scale(1)}100%{transform:translateY(-40px) scale(.9);visibility:hidden}}';

function formatClock(sec: number | null | undefined): string {
  const s = Math.max(0, Math.floor(sec ?? 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function WordcraftLiveView({ socket, t, remainingTime }: WordcraftLiveViewProps) {
  const live = useWordcraftLive({ socket });
  const classroom = useClassroomBoard();
  const k = SKIN[classroom ? 'classroom' : 'arcade'];
  const { snapshot } = live;
  // The teacher's pressure dials (null outside a classroom room = loud default).
  // Timer-off drops the student countdown; the tiles-in-sack line stays — it
  // is information, not a ticking clock.
  const pressure = useClassroomPressure();
  const timerHidden = pressure ? isStudentTimerHidden(pressure) : false;

  const board: Board = useMemo(
    () => createBoard((snapshot?.boardSize ?? 9) as BoardSize),
    [snapshot?.boardSize],
  );

  const cellByPos = useMemo(() => {
    const map = new Map<string, WordcraftLiveSnapshot['cells'][number]>();
    for (const c of snapshot?.cells ?? []) map.set(`${c.row},${c.col}`, c);
    return map;
  }, [snapshot]);

  const previewByPos = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of live.placements ?? []) map.set(`${p.row},${p.col}`, p.letter);
    return map;
  }, [live.placements]);

  if (!snapshot) {
    return (
      <div className={k.waiting}>
        <div className={k.waitingCard}>
          <Hammer className={k.waitingIcon} aria-hidden />
          <span className="font-neo-display font-bold">{t('education.wordcraftLive.waitingBoard')}</span>
        </div>
      </div>
    );
  }

  const targets = [...snapshot.targets].sort((a, b) => Number(a.built) - Number(b.built));
  const builtCount = snapshot.targets.filter((x) => x.built).length;
  const center = Math.floor(snapshot.boardSize / 2);
  const boardEmpty = snapshot.cells.length === 0;

  return (
    <div className={k.root}>
      <style>{WORDCRAFT_KEYFRAMES}</style>
      <div
        data-testid="race-hud"
        className={k.hud}
      >
        <div className="flex items-baseline gap-2">
          <span key={snapshot.myScore} className={k.myScore}>{snapshot.myScore}</span>
          <span className={k.hudLabel}>{t('education.wordcraftLive.you')}</span>
        </div>
        <div className="text-center">
          {!timerHidden ? (
            <div className={k.clock} data-testid="race-clock">
              {formatClock(remainingTime)}
            </div>
          ) : null}
          <div className={k.tiles}>
            {t('education.wordcraftLive.tilesLeft', { count: snapshot.bagCount })}
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className={k.hudLabel}>{t('education.wordcraftLive.rival')}</span>
          <span className={k.rivalScore}>{snapshot.botScore}</span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <span
          data-testid="race-targets-progress"
          className="shrink-0 rounded-full border-2 border-neo-black bg-neo-lime px-2 py-0.5 font-neo-display text-[11px] font-black uppercase text-neo-black shadow-hard-sm"
        >
          {t('eduStudent.wordcraft.targetsProgress', { found: builtCount, total: snapshot.targets.length })}
        </span>
        <div
          data-testid="race-targets"
          aria-label={t('education.wordcraftLive.lessonWords')}
          className="flex min-w-0 flex-1 flex-nowrap items-center gap-1.5 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {targets.map((target) => (
            <span
              key={target.word}
              data-testid={`target-${target.word}`}
              data-built={target.built}
              className={
                target.built
                  ? k.targetBuilt
                  : k.target
              }
            >
              {target.built ? `✓ ${target.word}` : target.word}
            </span>
          ))}
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center [container-type:size]">
        <div
          className={k.board}
          role="group"
          aria-label="wordcraft-board"
        >
          {board.cells.map((row, r) =>
            row.map((cell, c) => {
              const placed = cellByPos.get(`${r},${c}`);
              const preview = previewByPos.get(`${r},${c}`);
              const isAnchor = live.anchor?.row === r && live.anchor?.col === c;
              const isStar = boardEmpty && r === center && c === center;
              const base = 'flex flex-col items-center justify-center rounded-sm border text-[10px] font-bold leading-none transition-transform active:scale-90';
              const skin = placed
                ? placed.by === 'player'
                  ? 'border-neo-cyan bg-neo-cyan text-neo-navy'
                  : 'border-neo-pink bg-neo-pink text-neo-navy'
                : preview
                  ? isAnchor || live.autoCentered
                    ? 'border-neo-lime bg-neo-lime text-neo-navy motion-safe:animate-[lc-wc-drop_260ms_cubic-bezier(.34,1.56,.64,1)]'
                    : k.previewLoose
                  : isStar
                    ? k.star
                    : cell.premium
                      ? `${k.premiumEdge} ${(classroom ? PREMIUM_CLASS_CLASSROOM : PREMIUM_CLASS)[cell.premium]}`
                      : k.empty;
              return (
                <button
                  key={`${r}-${c}`}
                  type="button"
                  aria-label={`cell-${r}-${c}`}
                  disabled={!!placed}
                  onClick={() => live.setAnchor(r, c)}
                  className={`${base} ${skin}`}
                >
                  <span className="font-neo-display text-xs sm:text-sm">{placed?.letter ?? preview ?? (isStar ? '★' : '')}</span>
                  {!placed && !preview && !isStar && cell.premium ? <span className="text-[7px]">{cell.premium}</span> : null}
                </button>
              );
            }),
          )}
        </div>
        {live.lastPlaced ? (
          <div
            key={live.lastPlaced.at}
            data-testid="race-score-pop"
            aria-live="polite"
            className="pointer-events-none absolute inset-x-0 top-1/3 mx-auto w-max rounded-neo border-[3px] border-neo-black bg-neo-lime px-4 py-1 font-neo-display text-3xl font-black text-neo-black shadow-hard motion-safe:animate-[lc-wc-pop_1.1s_ease-out_forwards] motion-reduce:hidden"
          >
            {live.lastPlaced.bingo ? <span className="me-2 text-neo-pink">BINGO!</span> : null}
            <span>+{live.lastPlaced.score}</span>
          </div>
        ) : null}
      </div>

      <p
        data-testid="race-hint"
        role="status"
        className={
          live.hint === 'ready'
            ? k.hintReady
            : k.hint
        }
      >
        {live.lastError
          ? null
          : t(live.hint ? HINT_KEY[live.hint] : 'education.wordcraftLive.tapLetters')}
      </p>

      {live.lastError ? (
        <div role="alert" className="shrink-0 rounded-neo border-2 border-neo-red bg-neo-red/15 px-3 py-1 text-xs font-bold text-neo-red animate-neo-shake">
          {t(ERROR_KEY[live.lastError] ?? 'education.wordcraftLive.errors.generic').replace('{word}', live.stagedWord)}
        </div>
      ) : null}

      <div className="flex shrink-0 items-center gap-2">
        <div
          data-testid="staged-word"
          className={k.staged}
        >
          {live.stagedWord}
        </div>
        <button
          type="button"
          onClick={live.toggleDirection}
          aria-label={t('education.wordcraftLive.switchDirection')}
          title={t('education.wordcraftLive.switchDirection')}
          className={k.dirBtn}
        >
          <ArrowRightLeft className={`h-4 w-4 transition-transform ${live.direction === 'down' ? 'rotate-90' : ''}`} aria-hidden />
        </button>
        <button
          type="button"
          onClick={live.clearStage}
          className={k.recall}
        >
          {t('education.wordcraftLive.recall')}
        </button>
        <button
          type="button"
          onClick={live.submit}
          disabled={!live.canSubmit}
          className={`rounded-neo border-[3px] border-neo-black px-4 py-2 font-neo-display font-black uppercase shadow-hard-sm active:translate-y-0.5 active:shadow-none ${k.placeDisabled} disabled:shadow-none ${live.canSubmit ? 'bg-neo-lime text-neo-black motion-safe:animate-[lc-wc-ready_1s_ease-in-out_infinite]' : 'bg-neo-lime text-neo-black'}`}
        >
          {t('education.wordcraftLive.place')}
        </button>
      </div>

      <div data-testid="race-rack" className="flex shrink-0 flex-nowrap justify-center gap-1">
        {snapshot.rack.map((tile) => {
          const staged = live.stagedIds.includes(tile.id);
          return (
            <button
              key={tile.id}
              type="button"
              aria-label={`tile-${tile.id}`}
              onClick={() => (staged ? live.recallTile(tile.id) : live.tapRackTile(tile.id))}
              className={
                staged
                  ? k.tileStaged
                  : 'flex size-11 shrink flex-col items-center justify-center rounded-neo border-2 border-neo-black bg-neo-cream text-neo-black shadow-hard-sm transition-transform active:scale-90 active:shadow-hard-pressed'
              }
            >
              <span className="font-neo-display text-lg font-black leading-none">{tile.letter}</span>
              <span className="text-[9px] leading-none">{tile.value}</span>
            </button>
          );
        })}
      </div>

      <div data-testid="race-activity" className="h-6 shrink-0 overflow-hidden">
        {live.activity.slice(0, 1).map((a, i) => (
          <div
            key={`${a.username}-${i}-${live.activity.length}`}
            className={k.activity}
          >
            {a.bingo ? <span className={k.bingo}>BINGO!</span> : null}
            {t('education.wordcraftLive.builtBy', { name: a.username, word: a.words[0]?.word ?? '' })}
            <span className={k.gain}>+{a.score}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default WordcraftLiveView;
