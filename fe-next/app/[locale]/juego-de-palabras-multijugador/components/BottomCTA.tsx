'use client';

import Link from 'next/link';
import { m, useReducedMotion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BottomCTAProps {
  locale: string;
}

export function BottomCTA({ locale }: BottomCTAProps) {
  const reduced = useReducedMotion();

  return (
    <m.section
      initial={reduced ? false : { opacity: 0, y: 30, scale: 0.97 }}
      whileInView={reduced ? undefined : { opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ type: 'spring', stiffness: 200, damping: 22 }}
      className={cn(
        'relative mb-12 overflow-hidden rounded-neo border-3 border-neo-black bg-neo-navy p-8 text-center shadow-hard-xl sm:p-12'
      )}
    >
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-neo-pink via-neo-cyan to-neo-lime"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(45deg, white 0 1px, transparent 1px 14px)',
        }}
      />

      <span className="relative inline-flex items-center gap-2 rounded-neo border-2 border-neo-pink/60 bg-neo-pink/15 px-3 py-1 font-neo-body text-[11px] font-black uppercase tracking-widest text-neo-pink">
        Sin registro · Sin descargas
      </span>

      <h2 className="relative mt-4 font-neo-display text-2xl font-black uppercase leading-tight text-neo-white sm:text-4xl">
        Tus amigos. Tu sala. <span className="text-neo-pink">Tus palabras.</span>
      </h2>
      <p className="relative mx-auto mt-3 max-w-lg font-neo-body text-sm text-neo-white sm:text-base">
        Crea la sala, pega el enlace en WhatsApp y empieza a competir antes de leer esta frase.
      </p>

      <div className="relative mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
        <Link
          href={`/${locale}/multiplayer`}
          data-magnetic
          className={cn(
            'group inline-flex items-center justify-center gap-2 rounded-neo border-3 border-neo-black bg-neo-pink px-9 py-4 font-neo-display text-base font-black uppercase tracking-wide text-neo-navy shadow-hard-lg',
            'transition-all duration-150 hover:-translate-y-0.5 hover:shadow-hard-xl active:translate-y-0.5 active:shadow-hard-pressed sm:text-lg'
          )}
        >
          Empezar partida
          <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
        </Link>
        <Link
          href={`/${locale}/daily`}
          className={cn(
            'inline-flex items-center justify-center gap-2 rounded-neo border-3 border-neo-cyan bg-transparent px-7 py-4 font-neo-display text-sm font-black uppercase tracking-wide text-neo-cyan shadow-hard-cyan',
            'transition-all duration-150 hover:-translate-y-0.5 hover:bg-neo-cyan/10 sm:text-base'
          )}
        >
          Desafío diario
        </Link>
      </div>
    </m.section>
  );
}
