'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { m } from 'framer-motion';
import { Check, Loader2, Rocket } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { useHqJuice } from './useHqJuice';

/** Same alphabet as generate_join_code() — the slots preview what will land. */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const SLOT_COUNT = 6;
const STEP_IDS = ['words', 'room', 'code'] as const;

function randomCode(): string {
  let out = '';
  for (let i = 0; i < SLOT_COUNT; i += 1) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return out;
}

export interface HqLaunchStageProps {
  /** Omitted on a route loading boundary, where the copy must stay generic. */
  modeLabel?: string;
  listTitle?: string;
  poster?: string;
  className?: string;
}

/**
 * The designed wait between GO LIVE and the lobby: the HQ overlay, the
 * classroom-game loaders and its loading.tsx all render this one stage, so
 * the hand-off never drops to a bare mascot splash.
 */
export function HqLaunchStage({ modeLabel, listTitle, poster, className }: HqLaunchStageProps) {
  const { t } = useLanguage();
  const { reduced } = useHqJuice();
  const [code, setCode] = useState('??????');
  // Words are already in hand at GO LIVE; the code step stays open until the lobby replaces this stage.
  const [active, setActive] = useState(1);

  useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => setCode(randomCode()), 90);
    return () => clearInterval(id);
  }, [reduced]);

  useEffect(() => {
    const id = setTimeout(() => setActive(2), 900);
    return () => clearTimeout(id);
  }, []);

  return (
    <div
      data-testid="hq-launch-stage"
      role="status"
      aria-live="polite"
      className={cn(
        'fixed inset-0 z-[130] flex items-center justify-center bg-neo-navy px-4',
        'bg-[radial-gradient(90%_60%_at_50%_0%,rgba(204,255,0,0.12),transparent_65%)]',
        className,
      )}
    >
      <div className="relative w-full max-w-md rounded-neo-xl border-3 border-neo-cream bg-neo-navy-light p-5 shadow-hard-2xl sm:p-7">
        <div className="relative mx-auto -mt-16 mb-3 flex size-32 items-center justify-center rounded-full border-3 border-neo-black bg-neo-lime shadow-hard-lg sm:-mt-20 sm:size-36">
          {poster ? (
            <m.span
              className="block size-28 sm:size-32"
              animate={reduced ? undefined : { y: [0, -8, 0], rotate: [0, -3, 0] }}
              transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Image src={poster} alt="" aria-hidden="true" width={96} height={96} priority className="size-full object-contain" />
            </m.span>
          ) : (
            <Rocket className="size-14 text-black" strokeWidth={2.5} aria-hidden="true" />
          )}
          <m.span
            aria-hidden="true"
            className="absolute -end-2 -top-1 flex size-11 items-center justify-center rounded-full border-3 border-neo-black bg-neo-pink shadow-hard-sm"
            animate={reduced ? undefined : { y: [0, -5, 0], x: [0, 3, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Rocket className="size-5 text-black" strokeWidth={3} />
          </m.span>
        </div>

        <h2 className="text-center font-neo-display text-2xl font-black uppercase leading-tight tracking-tight text-neo-white text-balance sm:text-3xl">
          {modeLabel ? t('eduHq.launch.titleMode', { mode: modeLabel }) : t('eduHq.launch.generic')}
        </h2>
        {listTitle ? (
          <p dir="auto" className="mt-1 truncate text-center font-neo-body text-sm font-bold text-neo-white/70">
            {listTitle}
          </p>
        ) : null}

        <p className="mt-5 text-center font-neo-display text-[0.65rem] font-black uppercase tracking-widest text-neo-white/60">
          {t('eduHq.launch.codeLabel')}
        </p>
        <div data-testid="hq-launch-slots" dir="ltr" aria-hidden="true" className="mt-1.5 flex justify-center gap-1.5 sm:gap-2">
          {code.split('').map((ch, i) => (
            <span
              key={i}
              className="flex h-12 w-9 items-center justify-center rounded-neo border-3 border-neo-black bg-neo-cream font-mono text-2xl font-black text-neo-black shadow-hard-sm sm:h-14 sm:w-11 sm:text-3xl"
            >
              {ch}
            </span>
          ))}
        </div>

        <ol className="mt-5 space-y-1.5">
          {STEP_IDS.map((id, i) => {
            const shown = i < active ? 'done' : i === active ? 'active' : 'pending';
            return (
              <li
                key={id}
                data-testid={`hq-launch-step-${id}`}
                data-state={shown}
                className={cn(
                  'flex items-center gap-2.5 rounded-neo border-2 px-3 py-1.5 font-neo-body text-sm font-bold',
                  shown === 'done' && 'border-neo-lime/70 text-neo-white',
                  shown === 'active' && 'border-neo-cyan text-neo-white',
                  shown === 'pending' && 'border-neo-cream/25 text-neo-white/50',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'flex size-6 shrink-0 items-center justify-center rounded-full border-2',
                    shown === 'done' ? 'border-neo-black bg-neo-lime text-black' : shown === 'active' ? 'border-neo-black bg-neo-cyan text-black' : 'border-neo-cream/40 bg-neo-navy',
                  )}
                >
                  {shown === 'done' ? (
                    <Check className="size-3.5" strokeWidth={4} />
                  ) : shown === 'active' ? (
                    <Loader2 className="size-3.5 motion-safe:animate-spin" strokeWidth={3} />
                  ) : null}
                </span>
                {t(`eduHq.launch.step.${id}`)}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

export default HqLaunchStage;
