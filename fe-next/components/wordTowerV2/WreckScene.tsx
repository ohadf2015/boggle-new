'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Hammer, Send, X } from 'lucide-react';
import type { TowerBlock } from '@/lib/wordTowerV2/estateTower';
import { towerFromWords } from '@/lib/wordTowerV2/wreck';
import type { WreckUpdate } from './WreckCanvas';

const WreckCanvas = dynamic(() => import('./WreckCanvas'), { ssr: false });

type T = (key: string, params?: Record<string, string | number>) => string;

/**
 * Smash round overlay: the rival's tower, a wrecking ball on a chain, one tap
 * per ball. The whole screen is the tap target — the ball is the only thing to
 * do here — with a big labelled button for keyboard and screen readers.
 */
export function WreckScene({
  t, title, titleChip, words, tower, balls, reducedMotion, aftermath, overlay, targetIndex, targetWord, hideDamage, onShare, onFinish, onClose,
}: {
  t: T;
  /** Already translated: "Dana's tower" or "Your tower". */
  title: string;
  /**
   * Whose tower this is, as a face and a name (and on a payback, why). A raid
   * passes one so a single frame of the swing identifies the target — round 3's
   * swing shots carried a name only, and the judge could not tie them to the
   * rival named on the banner that started the flow.
   */
  titleChip?: React.ReactNode;
  /** Share-link round: a friend's words. Ignored when `tower` is given. */
  words?: string[];
  /** Raid round: the rival's ACTUAL stored floors. */
  tower?: TowerBlock[];
  balls: number;
  reducedMotion: boolean;
  /**
   * The swing is over. The rig and the aim go away, the camera closes in on
   * the building that was just hit, and `overlay` is stamped on top of it —
   * the payout is read off the wreckage instead of off a card over black.
   */
  aftermath?: boolean;
  overlay?: React.ReactNode;
  /** Floor the player called on the reveal screen (index into `tower`). */
  targetIndex?: number | null;
  /** That floor's word, for the HUD — already upper-cased. */
  targetWord?: string;
  /** Their shield ate the swing — don't paint cracks the payout says never happened. */
  hideDamage?: boolean;
  onShare?: () => void;
  /**
   * Raid round: the damage, once, when the last ball has settled. The parent
   * owns what happens next (post the raid, show the payout) and this scene
   * shows no result card of its own.
   */
  onFinish?: (result: { wrecked: number; total: number }) => void;
  onClose: () => void;
}) {
  const floors = useMemo(() => tower ?? towerFromWords(words ?? []), [tower, words]);
  const cutRef = useRef<() => void>(() => {});
  const [state, setState] = useState<WreckUpdate>({ wrecked: 0, total: floors.length, ballsLeft: balls - 1, armed: true, done: false, hits: 0, onTarget: false, impact: null });
  const [crash, setCrash] = useState(0);
  const lastHits = useRef(0);
  // Review hook (`?demo=1&autohit=1`): the swing lands by itself, so a capture pass
  // photographs the contact beat instead of gambling on a tap.
  const [autoHit, setAutoHit] = useState(false);
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      // `demo` as well: on its own this would be a client-side aimbot on live
      // raids, since the server scores the raid from the accuracy we send.
      setAutoHit(params.has('demo') && params.get('autohit') === '1');
    } catch {
      /* no URL (tests, SSR) — the hook simply stays off. */
    }
    // The global mute FAB probes its corner on mount and on resize only, so a
    // full-screen overlay that arrives later lands underneath it. Poke it.
    window.dispatchEvent(new Event('resize'));
    // This overlay is absolute inside the game, not fixed: opened from a
    // scrolled results board it rendered with its HUD above the fold (round 2's
    // swing capture is missing its whole header because of this).
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  const onUpdate = useCallback((u: WreckUpdate) => {
    setState(u);
    if (u.hits > lastHits.current) {
      lastHits.current = u.hits;
      setCrash(u.hits);
    }
  }, []);
  const registerCut = useCallback((cut: () => void) => {
    cutRef.current = cut;
  }, []);

  useEffect(() => {
    if (!crash) return;
    const id = window.setTimeout(() => setCrash(0), 1000);
    return () => window.clearTimeout(id);
  }, [crash]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        cutRef.current();
      } else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);


  // The raid's payout is the parent's business: report the damage exactly once.
  const reported = useRef(false);
  useEffect(() => {
    if (!state.done || !onFinish || reported.current) return;
    reported.current = true;
    onFinish({ wrecked: state.wrecked, total: state.total });
  }, [state.done, state.wrecked, state.total, onFinish]);

  const pct = state.total ? Math.round((state.wrecked / state.total) * 100) : 0;
  // Both flows end the same way: the last ball settles, the rig goes, and the
  // camera closes in on what is left of the building. A raid says so early
  // (while the server scores the hit); the share round knows once it is done.
  const closing = aftermath || state.done;

  return (
    <div className="absolute inset-0 z-50 overflow-hidden bg-neo-navy" role="dialog" aria-modal="true">
      {/* Pixi paints sky, city and street itself — no DOM layer underneath. */}
      <WreckCanvas tower={floors} balls={balls} reducedMotion={reducedMotion} aftermath={closing} autoHit={autoHit} targetIndex={targetIndex} hideDamage={hideDamage} registerCut={registerCut} onUpdate={onUpdate} className="absolute inset-0" />

      {/* THE HIT. Stamped on the pixel the ball met the slab, held for the
          length of the burst, so a single still reads as contact landing —
          the beat round 2's evidence never caught. */}
      {state.impact ? (
        <div
          key={state.impact.key}
          aria-hidden
          className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-[150%]"
          style={{ left: state.impact.x, top: state.impact.y }}
        >
          <span className="block whitespace-nowrap rounded-neo border-neo-thick border-black bg-neo-yellow px-3 py-1 font-neo-display text-3xl font-black uppercase leading-none tabular-nums text-neo-navy shadow-hard-lg motion-safe:animate-neo-pop md:text-5xl">
            {state.impact.floors === 1
              ? t('wordTowerV2.wreck.floorDown')
              : state.impact.floors > 1
                ? t('wordTowerV2.wreck.floorsDown', { n: state.impact.floors })
                : t('wordTowerV2.wreck.directHit')}
          </span>
        </div>
      ) : null}

      <div className="pointer-events-none absolute inset-x-0 top-[max(0.75rem,env(safe-area-inset-top))] z-10 flex flex-col items-center gap-2 px-16">
        {/* The target's face and name never fade: between the last ball settling
            and the payout mounting there would otherwise be a stretch of screen
            where the building being smashed belongs to nobody. */}
        <div className="max-w-full opacity-100">
          {titleChip ?? (
            <h2 className="max-w-full truncate rounded-neo border-neo-thick border-black bg-neo-pink px-4 py-1 font-neo-display text-2xl font-black uppercase text-neo-navy shadow-hard">
              {title}
            </h2>
          )}
        </div>
        <div className={`flex items-center gap-2 font-neo-display text-lg font-black text-neo-cream transition-opacity duration-300 ${closing && !state.impact ? 'opacity-0' : 'opacity-100'}`}>
          <span className="rounded-neo border-neo border-neo-cream/40 bg-neo-navy/85 px-2 tabular-nums">
            {state.wrecked}/{state.total}
          </span>
          {targetWord ? (
            <span className="rounded-neo border-neo border-black bg-neo-pink px-2 text-neo-navy">
              {t('wordTowerV2.rivals.calledShot', { word: targetWord })}
            </span>
          ) : null}
          <span className="flex gap-1" aria-label={t('wordTowerV2.wreck.balls', { n: state.ballsLeft + (state.armed ? 1 : 0) })}>
            {Array.from({ length: state.ballsLeft + (state.armed ? 1 : 0) }, (_, i) => (
              <span key={i} className="h-5 w-5 rounded-full border-neo border-black bg-[#2b2f45] shadow-hard-sm" />
            ))}
          </span>
        </div>
      </div>

      {/* Always a way out (Escape too) — the round is a dialog, not a trap. */}
      {!state.done && !aftermath ? (
        <button
          type="button"
          onClick={onClose}
          aria-label={t('wordTowerV2.wreck.back')}
          className="absolute end-3 top-[max(0.75rem,env(safe-area-inset-top))] z-30 flex h-11 w-11 items-center justify-center rounded-neo border-neo-thick border-black bg-neo-cream text-neo-navy shadow-hard active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
      ) : null}

      {crash && !state.impact && !closing ? (
        <div
          key={crash}
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-[13%] z-20 mx-auto w-fit -rotate-6 rounded-neo border-neo-thick border-black bg-neo-yellow px-4 py-1 font-neo-display text-4xl font-black uppercase text-neo-navy shadow-hard-lg animate-neo-pop md:text-6xl"
        >
          {t('wordTowerV2.wreck.crash')}
        </div>
      ) : null}

      {!state.done && !aftermath ? (
        <button
          type="button"
          onClick={() => cutRef.current()}
          disabled={!state.armed}
          aria-label={t('wordTowerV2.wreck.cut')}
          className="absolute inset-0 z-10 flex items-end justify-center pb-[max(1.5rem,env(safe-area-inset-bottom))] disabled:cursor-default"
        >
          <span
            className={
              state.armed
                ? `flex items-center gap-2 rounded-neo border-neo-thick border-black px-6 py-3 font-neo-display text-2xl font-black uppercase text-neo-navy shadow-hard transition-colors ${
                    state.onTarget ? 'bg-neo-lime motion-safe:animate-neo-wobble' : 'bg-neo-cream/80'
                  }`
                : 'invisible'
            }
          >
            <Hammer className="h-6 w-6" aria-hidden />
            {t('wordTowerV2.wreck.cut')}
          </span>
        </button>
      ) : onFinish || overlay ? null : (
        <div className="absolute inset-0 z-30 flex items-end justify-center bg-gradient-to-t from-neo-navy via-neo-navy/70 to-transparent p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="w-full max-w-sm rounded-neo border-neo-thick border-black bg-neo-cream p-5 text-center text-neo-navy shadow-hard-lg animate-neo-pop">
            <p className="font-neo-display text-3xl font-black uppercase">
              {t('wordTowerV2.wreck.result', { n: state.wrecked, total: state.total })}
            </p>
            <p className="mt-1 font-neo-display text-6xl font-black tabular-nums">{pct}%</p>
            <button
              type="button"
              onClick={() => onShare?.()}
              autoFocus
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-neo border-neo-thick border-black bg-neo-cyan px-6 py-3 font-neo-display text-xl font-black uppercase text-neo-navy shadow-hard active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed"
            >
              <Send className="h-5 w-5" aria-hidden />
              {t('wordTowerV2.wreck.share')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 w-full rounded-neo border-neo-thick border-black bg-neo-pink px-6 py-3 font-neo-display text-xl font-black uppercase text-neo-navy shadow-hard active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed"
            >
              {t('wordTowerV2.wreck.back')}
            </button>
          </div>
        </div>
      )}

      {overlay}
    </div>
  );
}
