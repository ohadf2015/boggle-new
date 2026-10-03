'use client';

// Transform/colour only (Class 5: no opacity entrances); reduced motion freezes on a telling frame.

import { useEffect, useState } from 'react';
import { Check, Search, Skull, Zap } from 'lucide-react';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { cn } from '@/lib/utils';
import type { ModePreviewKind } from './ClassroomModeCatalogueData';

const FRAME_MS = 620;
const FRAMES = 8;

const FILLER: Record<string, string> = {
  en: 'ETAOINSHRDLUCMFP',
  sv: 'ETANRSLIKODMGUVÄ',
  es: 'EAOSNRILDTUCMPBG',
  he: 'אבגדהוזחטיכלמנסע',
  ja: 'あいうえおかきくけこさしすせそた',
  ru: 'ОЕАИНТСРВЛКМДПУЯ',
};
const WORD: Record<string, string> = { en: 'WORDS', sv: 'SPELA', es: 'JUEGO', he: 'מילים', ja: 'ことば', ru: 'СЛОВО' };
/** A snake of touching cells on a 4×4 grid, so the traced word is a legal path. */
const PATH = [4, 5, 9, 10, 14];

export function previewGrid(language: string): { letters: string[]; path: number[] } {
  const filler = Array.from(FILLER[language] ?? FILLER.en);
  const word = Array.from(WORD[language] ?? WORD.en);
  const path = PATH.slice(0, word.length);
  const letters = filler.slice(0, 16);
  path.forEach((cell, i) => {
    letters[cell] = word[i];
  });
  return { letters, path };
}

function useFrame(): number {
  const reduced = usePrefersReducedMotion();
  const [frame, setFrame] = useState(FRAMES - 3);
  useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(() => setFrame((f) => (f + 1) % FRAMES), FRAME_MS);
    return () => window.clearInterval(id);
  }, [reduced]);
  return reduced ? FRAMES - 3 : frame;
}

const TILE = 'grid place-items-center rounded-[6px] border-2 border-neo-black font-neo-display font-black leading-none transition-[transform,background-color] duration-200';

function Grid({ language, lit, popped, pink }: { language: string; lit: number[]; popped?: number[]; pink?: boolean }) {
  const { letters } = previewGrid(language);
  return (
    <div className="grid h-full w-full grid-cols-4 gap-[5%] p-[6%]" dir="ltr">
      {letters.map((ch, i) => {
        const on = lit.includes(i);
        const gone = popped?.includes(i);
        return (
          <span
            key={i}
            className={cn(
              TILE,
              'text-[clamp(0.55rem,2.2cqw,1.3rem)]',
              on ? (pink ? 'bg-neo-pink text-neo-black' : 'bg-neo-lime text-neo-black') : 'bg-neo-cream text-neo-black',
              on && '-translate-y-[2px]',
              gone && 'scale-0'
            )}
          >
            {ch}
          </span>
        );
      })}
    </div>
  );
}

function ScorePop({ show, label }: { show: boolean; label: string }) {
  return (
    <span
      aria-hidden="true"
      dir="ltr"
      className={cn(
        'absolute end-[6%] top-[6%] rounded-full border-2 border-neo-black bg-neo-yellow px-1.5 py-0.5 font-neo-display text-[clamp(0.55rem,2cqw,1rem)] font-black text-neo-black shadow-hard-sm transition-transform duration-200',
        show ? 'scale-100 -rotate-6' : 'scale-0'
      )}
    >
      {label}
    </span>
  );
}

function QuizPreview({ frame }: { frame: number }) {
  const tapped = frame >= 3;
  const revealed = frame >= 4;
  const fills = ['bg-neo-cyan', 'bg-neo-pink', 'bg-neo-lime', 'bg-neo-purple'];
  return (
    <div className="flex h-full w-full flex-col gap-[5%] p-[6%]">
      <div className="rounded-[6px] border-2 border-neo-black bg-neo-cream p-[4%]">
        <span className="block h-[0.35rem] w-4/5 rounded-full bg-neo-navy/60" />
        <span className="mt-1 block h-[0.35rem] w-1/2 rounded-full bg-neo-navy/40" />
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-neo-navy">
        <span
          className="block h-full w-full origin-left rounded-full bg-neo-yellow transition-transform duration-500 rtl:origin-right"
          style={{ transform: `scaleX(${Math.max(0.1, 1 - frame / FRAMES)})` }}
        />
      </div>
      <div className="grid flex-1 grid-cols-2 gap-[5%]">
        {fills.map((fill, i) => {
          const isAnswer = i === 2;
          return (
            <span
              key={fill}
              className={cn(
                TILE,
                'relative',
                revealed && isAnswer ? 'bg-neo-lime ring-4 ring-neo-yellow' : revealed ? 'bg-neo-navy-light' : fill,
                tapped && isAnswer && !revealed && 'scale-90'
              )}
            >
              {revealed && isAnswer ? (
                <Check className="size-[40%] text-neo-black" strokeWidth={4} />
              ) : (
                <span className="block h-[0.35rem] w-3/5 rounded-full bg-neo-black/50" />
              )}
            </span>
          );
        })}
      </div>
      <ScorePop show={revealed} label="+120" />
    </div>
  );
}

function BoardPreview({ frame, language, mode }: { frame: number; language: string; mode: 'board' | 'blast' | 'hunt' }) {
  const { path } = previewGrid(language);
  const traced = path.slice(0, Math.min(path.length, frame + 1));
  const done = traced.length === path.length;
  if (mode === 'blast') {
    const popped = frame >= path.length + 1 ? path : [];
    return (
      <>
        <Grid language={language} lit={traced} popped={popped} />
        <span
          aria-hidden="true"
          className={cn('absolute inset-0 grid place-items-center transition-transform duration-200', popped.length ? 'scale-100' : 'scale-0')}
        >
          <Zap className="size-1/3 fill-neo-yellow text-neo-black" strokeWidth={2.5} />
        </span>
        <ScorePop show={popped.length > 0} label="×3" />
      </>
    );
  }
  if (mode === 'hunt') {
    const cells = [0, 5, 10, 9, 14];
    const at = cells[frame % cells.length];
    const found = frame >= cells.length;
    return (
      <>
        <Grid language={language} lit={found ? path : []} pink />
        <span
          aria-hidden="true"
          className="absolute size-[22%] transition-transform duration-500"
          style={{ insetInlineStart: `${6 + (at % 4) * 22}%`, top: `${6 + Math.floor(at / 4) * 22}%`, transform: found ? 'scale(0)' : 'scale(1)' }}
        >
          <Search className="size-full text-neo-pink drop-shadow-[2px_2px_0_#000]" strokeWidth={3.5} />
        </span>
        <ScorePop show={found} label="🎯" />
      </>
    );
  }
  return (
    <>
      <Grid language={language} lit={traced} />
      <ScorePop show={done} label="+40" />
    </>
  );
}

function WheelPreview({ frame, language }: { frame: number; language: string }) {
  const word = Array.from(WORD[language] ?? WORD.en);
  const letters = [...word, ...Array.from(FILLER[language] ?? FILLER.en).slice(0, 7 - word.length)];
  return (
    <div className="relative grid h-full w-full place-items-center">
      <div
        className="relative aspect-square h-[82%] rounded-full border-[3px] border-neo-black bg-neo-purple transition-transform duration-700"
        style={{ transform: `rotate(${frame * 45}deg)` }}
      >
        {letters.map((ch, i) => {
          const angle = (i / letters.length) * Math.PI * 2;
          return (
            <span
              key={i}
              className={cn(TILE, 'absolute size-[24%] bg-neo-cream text-[clamp(0.5rem,2cqw,1.1rem)] text-neo-black')}
              style={{ left: `${38 + Math.sin(angle) * 36}%`, top: `${38 - Math.cos(angle) * 36}%`, transform: `rotate(${-frame * 45}deg)` }}
            >
              {ch}
            </span>
          );
        })}
      </div>
      <span className="absolute bottom-[6%] rounded-[6px] border-2 border-neo-black bg-neo-lime px-1.5 font-neo-display text-[clamp(0.55rem,2.2cqw,1.1rem)] font-black text-neo-black" dir="auto">
        {word.slice(0, Math.min(word.length, frame + 1)).join('')}
      </span>
    </div>
  );
}

function CraftPreview({ frame, language }: { frame: number; language: string }) {
  const word = Array.from(WORD[language] ?? WORD.en);
  return (
    <div className="relative flex h-full w-full items-end justify-center gap-[3%] p-[8%]" dir="ltr">
      {word.map((ch, i) => (
        <span
          key={i}
          className={cn(TILE, 'aspect-square w-[16%] bg-neo-lime text-[clamp(0.55rem,2.4cqw,1.3rem)] text-neo-black duration-300')}
          style={{ transform: i <= frame ? 'translateY(0)' : 'translateY(-260%)' }}
        >
          {ch}
        </span>
      ))}
      <span className="absolute start-[6%] top-[6%] grid size-[22%] place-items-center rounded-full border-2 border-neo-black bg-neo-pink">
        <Skull className={cn('size-3/5 text-neo-black transition-transform duration-200', frame >= word.length && 'rotate-12 scale-75')} strokeWidth={3} />
      </span>
      <ScorePop show={frame >= word.length} label="+90" />
    </div>
  );
}

const BOSS_HP = [100, 100, 84, 84, 62, 62, 30, 0];

function BossPreview({ frame }: { frame: number }) {
  const hp = BOSS_HP[frame];
  const hit = frame > 0 && BOSS_HP[frame] < BOSS_HP[frame - 1];
  const down = hp === 0;
  return (
    <div className="relative flex h-full w-full flex-col gap-[5%] p-[6%]">
      <div className="h-[11%] w-full overflow-hidden rounded-full border-2 border-neo-cream bg-neo-navy-light">
        <span
          className="block h-full origin-left rounded-full bg-neo-pink transition-transform duration-300 rtl:origin-right"
          style={{ transform: `scaleX(${hp / 100})` }}
        />
      </div>
      <div className="relative grid flex-1 place-items-center">
        {/* eslint-disable-next-line @next/next/no-img-element -- transparent boss art */}
        <img
          src={down ? '/images/bosses/boss-lexicon-dragon-defeated.png' : hit ? '/images/bosses/boss-lexicon-dragon-hurt.png' : '/images/bosses/boss-lexicon-dragon.png'}
          alt=""
          aria-hidden="true"
          className={cn('h-full max-h-full w-auto object-contain transition-transform duration-150', hit && 'translate-x-[4%] -rotate-3', down && 'scale-90')}
        />
        <span
          aria-hidden="true"
          dir="ltr"
          className={cn(
            'absolute start-[8%] top-[6%] rounded-neo border-2 border-neo-black bg-neo-lime px-1 font-neo-display text-[clamp(0.6rem,2.4cqw,1.2rem)] font-black text-neo-black transition-transform duration-200',
            hit ? 'scale-100 rotate-6' : 'scale-0'
          )}
        >
          −{frame >= 6 ? 2 : 1}
        </span>
      </div>
      <div className="flex justify-center gap-[3%]">
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className={cn('size-[9%] rounded-full border-2 border-neo-black transition-colors', i < frame - 1 ? 'bg-neo-lime' : 'bg-neo-cream')} />
        ))}
      </div>
    </div>
  );
}

export interface ClassroomModePreviewProps {
  kind: ModePreviewKind;
  language: string;
  label: string;
  className?: string;
}

export function ClassroomModePreview({ kind, language, label, className }: ClassroomModePreviewProps) {
  const frame = useFrame();
  return (
    <div
      role="img"
      aria-label={label}
      data-testid="mode-preview"
      data-preview={kind}
      className={cn(
        'relative aspect-[4/3] w-full overflow-hidden rounded-neo border-[3px] border-neo-cream bg-neo-navy shadow-hard [container-type:inline-size]',
        className
      )}
    >
      {kind === 'quiz' && <QuizPreview frame={frame} />}
      {(kind === 'board' || kind === 'blast' || kind === 'hunt') && <BoardPreview frame={frame} language={language} mode={kind} />}
      {kind === 'wheel' && <WheelPreview frame={frame} language={language} />}
      {kind === 'craft' && <CraftPreview frame={frame} language={language} />}
      {kind === 'boss' && <BossPreview frame={frame} />}
    </div>
  );
}

export default ClassroomModePreview;
