'use client';

import Image from 'next/image';
import Link from 'next/link';
import { m, useReducedMotion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HERO_TILES, STATS } from '../data';

interface HeroAnimatedProps {
  locale: string;
}

export function HeroAnimated({ locale }: HeroAnimatedProps) {
  const reduced = useReducedMotion();

  return (
    <section className="relative overflow-hidden pb-10 pt-12 sm:pb-14 sm:pt-16">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.07]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '22px 22px',
        }}
      />
      <div
        aria-hidden
        data-parallax-speed="34"
        className="pointer-events-none absolute -right-24 -top-24 -z-10 h-72 w-72 rotate-12 bg-neo-pink/15 blur-2xl sm:h-96 sm:w-96"
      />

      <div className="grid items-center gap-8 lg:grid-cols-[1.35fr_0.95fr]">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-neo border-3 border-neo-pink bg-neo-pink/10 px-3 py-1 shadow-hard-pink">
            <span className="h-2 w-2 animate-pulse rounded-full bg-neo-pink" />
            <span className="font-neo-body text-xs font-black uppercase tracking-widest text-neo-pink">
              Sin registro · Sin descarga · Multijugador
            </span>
          </div>

          <h1 className="mb-5 font-neo-display text-4xl font-black leading-[1.05] sm:text-6xl lg:text-7xl">
            <span className="block text-neo-white">Juega</span>{' '}
            <span className="relative inline-block">
              <span className="bg-gradient-to-br from-neo-pink via-neo-pink to-neo-cyan bg-clip-text text-transparent">
                Scrabble online
              </span>
              <span
                aria-hidden
                className="absolute inset-x-0 -bottom-1 h-2 -skew-x-6 bg-neo-pink/40"
              />
            </span>{' '}
            <span className="block text-neo-white">gratis en español</span>
          </h1>
          <div className="mt-2 flex flex-wrap items-end gap-2 sm:gap-3" aria-hidden>
            {HERO_TILES.map((tile, i) => (
              <m.span
                key={`${tile.ch}-${i}`}
                data-hero-tile
                initial={false}
                className={cn(
                  'inline-flex h-10 w-10 items-center justify-center rounded-neo border-3 border-neo-black font-neo-display text-lg font-black shadow-hard sm:h-14 sm:w-14 sm:text-2xl lg:h-16 lg:w-16 lg:text-3xl',
                  tile.color,
                  tile.rotate
                )}
              >
                {tile.ch}
              </m.span>
            ))}
          </div>

          <p className="mb-8 max-w-2xl font-neo-body text-base leading-relaxed text-neo-white sm:text-lg">
            Juega <strong className="text-neo-white">Scrabble online gratis en español</strong>: crea una sala, comparte el enlace y compite en tiempo real. Más de 10.000 palabras, sin descargas, sin registro, sin esperas.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
            <Link
              href={`/${locale}/multiplayer`}
              data-magnetic
              className={cn(
                'group inline-flex items-center justify-center gap-2 rounded-neo border-3 border-neo-black bg-neo-pink px-7 py-4 font-neo-display text-base font-black uppercase tracking-wide text-neo-navy shadow-hard-lg',
                'transition-all duration-150 hover:-translate-y-0.5 hover:shadow-hard-xl active:translate-y-0.5 active:shadow-hard-pressed sm:text-lg'
              )}
            >
              Crear sala ahora
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href={`/${locale}/singleplayer?autoStart=bots`}
              className={cn(
                'inline-flex items-center justify-center gap-2 rounded-neo border-3 border-neo-cyan bg-transparent px-7 py-4 font-neo-display text-base font-black uppercase tracking-wide text-neo-cyan shadow-hard-cyan',
                'transition-all duration-150 hover:-translate-y-0.5 hover:bg-neo-cyan/10 sm:text-lg'
              )}
            >
              Probar solo
            </Link>
          </div>
        </div>

        <m.div
          initial={false}
          className="relative mx-auto w-full max-w-sm lg:max-w-none"
        >
          <div className="relative overflow-hidden rounded-neo border-3 border-neo-black bg-gradient-to-br from-neo-navy-light to-neo-navy shadow-hard-xl">
            <Image
              src="/es-mp-hero-mascots.webp"
              alt="Dos mascotas de LexiClash compitiendo en Scrabble online gratis en español"
              width={760}
              height={760}
              priority
              sizes="(min-width: 1024px) 360px, (min-width: 640px) 384px, 90vw"
              className="h-auto w-full"
            />
            <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-neo border-2 border-neo-black bg-neo-lime px-2.5 py-1 font-neo-display text-[11px] font-black uppercase tracking-wide text-neo-navy shadow-hard-sm">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-neo-navy" />
              Tú vs amigos
            </span>
          </div>
        </m.div>
      </div>

      <dl className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {STATS.map((stat, i) => (
          <m.div
            key={stat.label}
            initial={reduced ? false : { opacity: 0, y: 16 }}
            whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-30px' }}
            transition={
              reduced
                ? undefined
                : { type: 'spring', stiffness: 220, damping: 22, delay: 0.05 * i }
            }
            className="rounded-neo border-3 border-neo-black bg-neo-navy-light/60 p-3 shadow-hard sm:p-4"
          >
            <dt className={cn('font-neo-display text-2xl font-black sm:text-3xl', stat.color)}>
              {stat.num}
            </dt>
            <dd className="mt-0.5 font-neo-body text-[11px] font-bold uppercase tracking-wider text-neo-white sm:text-xs">
              {stat.label}
            </dd>
          </m.div>
        ))}
      </dl>
    </section>
  );
}
