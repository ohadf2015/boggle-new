'use client';

/**
 * WordcraftLiveView — the student's live race surface.
 *
 * One verb: craft a word from your rack and PLACE it before the Baron (and the
 * class) outpace you. Everything server-known (board, rack, scores, targets)
 * comes from the useWordcraftLive snapshot; this component is pure rendering
 * plus tap choreography. Dark-only game surface: hardcoded neo-navy, never the
 * theme-responsive cream pair (mobile-web FOUC).
 */
import { useMemo } from 'react';
import { Hammer, RotateCcw, ArrowRightLeft } from 'lucide-react';
import { createBoard, type Board, type BoardSize } from '@/lib/word-craft/board';
import type { WordcraftLiveSnapshot } from '@/shared/types/wordcraftLive';
import { useClassroomPressure } from '@/hooks/gameState/classroomPressureStore';
import { isStudentTimerHidden } from '@/shared/utils/classroomPressure';
import { useWordcraftLive, type WordcraftLiveSocket } from './useWordcraftLive';

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

function formatClock(sec: number | null | undefined): string {
  const s = Math.max(0, Math.floor(sec ?? 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function WordcraftLiveView({ socket, t, remainingTime }: WordcraftLiveViewProps) {
  const live = useWordcraftLive({ socket });
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
      <div className="flex min-h-[60vh] items-center justify-center bg-neo-navy text-neo-cream font-neo-body">
        <div className="flex items-center gap-3 rounded-neo border-2 border-neo-cyan bg-neo-navy-light px-6 py-4 shadow-hard">
          <Hammer className="h-6 w-6 text-neo-cyan animate-neo-wobble" aria-hidden />
          <span className="font-neo-display font-bold">{t('education.wordcraftLive.waitingBoard')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col gap-2 bg-neo-navy px-2 pb-3 pt-2 text-neo-cream font-neo-body">
      {/* Race HUD: you vs the Baron + clock + sack */}
      <div
        data-testid="race-hud"
        className="flex items-center justify-between gap-2 rounded-neo border-2 border-neo-cream/40 bg-neo-navy-light px-3 py-2 shadow-hard"
      >
        <div className="flex items-baseline gap-2">
          <span className="font-neo-display font-black text-neo-cyan text-xl">{snapshot.myScore}</span>
          <span className="text-xs uppercase text-neo-cream/70">{t('education.wordcraftLive.you')}</span>
        </div>
        <div className="text-center">
          {!timerHidden ? (
            <div className="font-neo-display font-bold text-neo-cream" data-testid="race-clock">
              {formatClock(remainingTime)}
            </div>
          ) : null}
          <div className="text-[10px] uppercase text-neo-cream/60">
            {t('education.wordcraftLive.tilesLeft', { count: snapshot.bagCount })}
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-xs uppercase text-neo-cream/70">{t('education.wordcraftLive.rival')}</span>
          <span className="font-neo-display font-black text-neo-pink text-xl">{snapshot.botScore}</span>
        </div>
      </div>

      {/* Lesson targets */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] uppercase text-neo-cream/60">
          {t('education.wordcraftLive.lessonWords')}
        </span>
        {snapshot.targets.map((target) => (
          <span
            key={target.word}
            data-testid={`target-${target.word}`}
            data-built={target.built}
            className={
              target.built
                ? 'rounded-neo border-2 border-neo-lime bg-neo-lime/15 px-2 py-0.5 text-xs font-bold text-neo-lime'
                : 'rounded-neo border-2 border-neo-cream/40 px-2 py-0.5 text-xs font-bold text-neo-cream/80'
            }
          >
            {target.built ? `✓ ${target.word}` : target.word}
          </span>
        ))}
      </div>

      {/* Board */}
      <div
        className="mx-auto grid w-full max-w-md grid-cols-9 gap-0.5 rounded-neo border-2 border-neo-cream/40 bg-neo-navy-light p-1.5 shadow-hard"
        role="group"
        aria-label="wordcraft-board"
      >
        {board.cells.map((row, r) =>
          row.map((cell, c) => {
            const placed = cellByPos.get(`${r},${c}`);
            const preview = previewByPos.get(`${r},${c}`);
            const isAnchor = live.anchor?.row === r && live.anchor?.col === c;
            const base = 'aspect-square rounded-sm border text-[10px] font-bold flex flex-col items-center justify-center leading-none';
            const skin = placed
              ? placed.by === 'player'
                ? 'border-neo-cyan bg-neo-cyan text-neo-navy'
                : 'border-neo-pink bg-neo-pink text-neo-navy'
              : preview
                ? isAnchor
                  ? 'border-neo-lime bg-neo-lime text-neo-navy'
                  : 'border-neo-lime/70 bg-neo-lime/25 text-neo-lime'
                : cell.premium
                  ? `border-neo-cream/40 ${PREMIUM_CLASS[cell.premium]}`
                  : 'border-neo-cream/40 bg-neo-navy text-neo-cream/40';
            return (
              <button
                key={`${r}-${c}`}
                type="button"
                aria-label={`cell-${r}-${c}`}
                disabled={!!placed}
                onClick={() => live.setAnchor(r, c)}
                className={`${base} ${skin}`}
              >
                <span className="text-xs font-neo-display">{placed?.letter ?? preview ?? ''}</span>
                {!placed && !preview && cell.premium ? (
                  <span className="text-[7px]">{cell.premium}</span>
                ) : null}
              </button>
            );
          }),
        )}
      </div>

      {/* Staged word + actions */}
      <div className="flex items-center gap-2">
        <div
          data-testid="staged-word"
          className="flex min-h-9 flex-1 items-center rounded-neo border-2 border-dashed border-neo-cream/40 bg-neo-navy-light px-2 font-neo-display font-bold tracking-widest text-neo-lime"
        >
          {live.stagedWord}
        </div>
        <button
          type="button"
          onClick={live.toggleDirection}
          aria-label={t('education.wordcraftLive.switchDirection')}
          title={t('education.wordcraftLive.switchDirection')}
          className="rounded-neo border-2 border-neo-cream/40 bg-neo-navy-light p-2 text-neo-cream shadow-hard-sm"
        >
          <ArrowRightLeft className={`h-4 w-4 ${live.direction === 'down' ? 'rotate-90' : ''}`} aria-hidden />
        </button>
        <button
          type="button"
          onClick={live.clearStage}
          className="rounded-neo border-2 border-neo-cream/40 bg-neo-navy-light px-3 py-2 text-xs font-bold text-neo-cream shadow-hard-sm"
        >
          {t('education.wordcraftLive.recall')}
        </button>
        <button
          type="button"
          onClick={live.submit}
          disabled={!live.canSubmit}
          className="rounded-neo border-2 border-neo-black bg-neo-lime px-4 py-2 font-neo-display font-black uppercase text-neo-black shadow-hard-sm disabled:opacity-40 disabled:shadow-none"
        >
          {t('education.wordcraftLive.place')}
        </button>
      </div>

      {live.lastError ? (
        <div role="alert" className="rounded-neo border-2 border-neo-red bg-neo-red/15 px-3 py-1.5 text-xs font-bold text-neo-red animate-neo-shake">
          {t(ERROR_KEY[live.lastError] ?? 'education.wordcraftLive.errors.generic')}
        </div>
      ) : null}

      {/* Rack */}
      <div className="flex flex-wrap justify-center gap-1.5">
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
                  ? 'flex h-11 w-11 flex-col items-center justify-center rounded-neo border-2 border-neo-lime bg-neo-lime/25 text-neo-lime shadow-hard-pressed'
                  : 'flex h-11 w-11 flex-col items-center justify-center rounded-neo border-2 border-neo-black bg-neo-cream text-neo-black shadow-hard-sm active:shadow-hard-pressed'
              }
            >
              <span className="font-neo-display text-lg font-black leading-none">{tile.letter}</span>
              <span className="text-[9px] leading-none">{tile.value}</span>
            </button>
          );
        })}
      </div>

      {/* Class ticker */}
      <div data-testid="race-activity" className="space-y-1">
        {live.activity.slice(0, 3).map((a, i) => (
          <div
            key={`${a.username}-${i}`}
            className="rounded-neo border border-neo-cream/20 bg-neo-navy-light px-2 py-1 text-xs text-neo-cream/80"
          >
            {a.bingo ? <span className="mr-1 font-black text-neo-yellow">BINGO!</span> : null}
            {t('education.wordcraftLive.builtBy', { name: a.username, word: a.words[0]?.word ?? '' })}
            <span className="ml-1 font-bold text-neo-lime">+{a.score}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-center gap-1 text-[10px] text-neo-cream/50">
        <RotateCcw className="h-3 w-3" aria-hidden />
        {t('education.wordcraftLive.tapLetters')}
      </div>
    </div>
  );
}

export default WordcraftLiveView;
