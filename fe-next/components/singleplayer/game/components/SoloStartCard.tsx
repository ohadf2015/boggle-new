'use client';

/**
 * "Ready?" card over a freshly dealt board — the Adventure LevelIntro beat.
 *
 * The clock used to start the moment the board arrived, so a new player's first
 * seconds drained under the cookie banner and a keyboard tip. Now the board is
 * visible (they can study it) but the round waits for one tap. The card is also
 * the only how-to-play a first-timer gets, so it teaches the one gesture.
 *
 * Static appear, no opacity tween on the full-screen scrim (Class 5 flash).
 */
import { useEffect } from 'react';
import { Timer, Trophy } from 'lucide-react';
import type { TranslationFn } from '@/components/game/in-game/types';

interface SoloStartCardProps {
  /** Bot names — none in solo challenge/practice. */
  rivals: readonly string[];
  /** Round length, or null when untimed. */
  seconds: number | null;
  onStart: () => void;
  t: TranslationFn;
}

export function SoloStartCard({ rivals, seconds, onStart, t }: SoloStartCardProps) {
  // Desktop: Enter / Space starts, like the button would.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onStart(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onStart]);

  // A real word in the player's language: Latin "CAT" in Hebrew read backwards.
  const demo = Array.from(t('singlePlayer.startCard.demo'));
  const bot = rivals[0];
  const title = rivals.length === 1
    ? t('singlePlayer.startCard.titleOne', { bot })
    : rivals.length > 1 ? t('singlePlayer.startCard.titleMany') : t('singlePlayer.startCard.titleSolo');
  const goal = rivals.length === 1
    ? t('singlePlayer.startCard.goalOne', { bot })
    : rivals.length > 1 ? t('singlePlayer.startCard.goalMany') : t('singlePlayer.startCard.goalSolo');

  return (
    <div className="absolute inset-0 z-40 grid place-items-center overflow-y-auto bg-neo-navy/80 p-4" role="dialog" aria-modal="true" aria-labelledby="solo-start-title">
      <div
        data-testid="solo-start-card"
        className="w-full max-w-[24rem] rounded-2xl border-4 border-neo-black bg-neo-cream p-5 [@media(max-height:520px)]:p-3.5 text-neo-black shadow-[6px_6px_0_#000] motion-safe:animate-[solo-card-in_260ms_cubic-bezier(.2,1.4,.4,1)_both]"
      >
        <style>{'@keyframes solo-card-in{from{transform:translateY(12px) scale(.94)}to{transform:none}}'}</style>
        {bot && (
          <div className="mb-2 flex justify-center">
            <span className="rounded-full border-[3px] border-neo-black bg-neo-pink px-3 py-0.5 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_#000]">
              VS {rivals.join(' · ')}
            </span>
          </div>
        )}
        <h2 id="solo-start-title" className="text-center font-neo-display text-3xl font-bold leading-tight">{title}</h2>

        {/* The one gesture: trace touching letters. */}
        <div aria-hidden className="my-4 flex items-center justify-center gap-1.5 [@media(max-height:520px)]:hidden">
          {demo.map((l, i) => (
            <span key={i} className="flex items-center gap-1.5">
              <span className="grid h-12 w-12 place-items-center rounded-lg border-[3px] border-neo-black bg-neo-lime font-neo-display text-2xl font-bold shadow-[3px_3px_0_#000]">
                {l}
              </span>
              {i < demo.length - 1 && <span className="h-1 w-3 rounded bg-neo-black" />}
            </span>
          ))}
        </div>
        <p className="text-center text-base font-bold">{t('singlePlayer.dragInstruction')}</p>

        <ul className="mt-4 space-y-2 text-sm font-semibold [@media(max-height:520px)]:mt-2 [@media(max-height:520px)]:space-y-1">
          {seconds !== null && (
            <li className="flex items-center gap-2">
              <Timer className="h-5 w-5 shrink-0 text-neo-black" strokeWidth={2.5} aria-hidden />
              <span>{t('singlePlayer.startCard.clock', { seconds })}</span>
            </li>
          )}
          <li className="flex items-center gap-2">
            <Trophy className="h-5 w-5 shrink-0 text-neo-black" strokeWidth={2.5} aria-hidden />
            <span>{goal}</span>
          </li>
        </ul>

        <button
          type="button"
          autoFocus
          onClick={onStart}
          className="mt-5 [@media(max-height:520px)]:mt-3 w-full rounded-xl border-4 border-neo-black bg-neo-lime py-3 font-neo-display text-2xl font-bold uppercase tracking-wide text-neo-black shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none"
        >
          {t('singlePlayer.startGame')}
        </button>
      </div>
    </div>
  );
}
