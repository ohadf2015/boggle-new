'use client';

import Image from 'next/image';
import Link from 'next/link';

interface Game {
  id: string;
  href: string;
  titleKey: string;
  lineKey: string;
  bg: string;
  tilt: string;
  /** `still`: one frame of an animated `src`, shown on phones (see GameArt). */
  art: { src: string; still?: string } | { tower: string[] };
}

const GAMES: Game[] = [
  {
    id: 'tower',
    href: 'word-tower',
    titleKey: 'homeFresh.modes.items.wordTower.title',
    lineKey: 'homeFresh.modes.items.wordTower.line',
    bg: 'bg-neo-cyan',
    tilt: '-rotate-2',
    art: { tower: ['S', 'T', 'A', 'C', 'K'] },
  },
  {
    id: 'blast',
    href: 'blast',
    titleKey: 'homeFresh.modes.items.blast.title',
    lineKey: 'homeFresh.modes.items.blast.line',
    bg: 'bg-neo-pink',
    tilt: 'rotate-1',
    art: { src: '/mascot/mindblown-nobg.webp', still: '/mascot/stills/mindblown-nobg.webp' },
  },
  {
    id: 'craft',
    href: 'word-craft',
    titleKey: 'homeFresh.modes.items.wordCraft.title',
    lineKey: 'homeFresh.modes.items.wordCraft.line',
    bg: 'bg-neo-purple',
    tilt: 'rotate-2',
    art: { src: '/mascot/knight.webp', still: '/mascot/stills/knight.webp' },
  },
  {
    id: 'bridge',
    href: 'connections',
    titleKey: 'homeFresh.modes.items.connections.title',
    lineKey: 'homeFresh.modes.items.connections.line',
    bg: 'bg-neo-yellow',
    tilt: '-rotate-1',
    art: { src: '/mascot/bridge-cheer-nobg.webp' },
  },
  {
    id: 'adventure',
    href: 'adventure',
    titleKey: 'homeFresh.modes.items.adventure.title',
    lineKey: 'homeFresh.modes.items.adventure.line',
    bg: 'bg-neo-orange',
    tilt: 'rotate-1',
    art: { src: '/mascot/explorer-nobg.webp', still: '/mascot/stills/explorer-nobg.webp' },
  },
  {
    id: 'brain',
    href: 'brain',
    titleKey: 'homeFresh.modes.items.brainGym.title',
    lineKey: 'homeFresh.modes.items.brainGym.line',
    bg: 'bg-neo-lime',
    tilt: '-rotate-2',
    art: { src: '/mascot/powerup-nobg.webp', still: '/mascot/stills/powerup-nobg.webp' },
  },
];

/** Word Tower finishes ~37% of the time, so it stays one tap away under "More". */
const TUCKED = new Set(['tower']);

const TOWER_OFFSET = ['ms-3', 'ms-0', 'ms-4', 'ms-1', 'ms-2'];

function GameArt({ art }: { art: Game['art'] }) {
  if ('src' in art && art.still) {
    // The animated mascots are 220-540 KB each (100+ frames): 1.6 MB and constant
    // frame decoding on the home page of a phone. Phones get one still frame
    // (~5 KB); the <source> means desktop alone downloads the animation.
    return (
      <picture>
        <source media="(min-width: 1024px)" srcSet={art.src} />
        <img
          src={art.still}
          alt=""
          width={256}
          height={256}
          loading="lazy"
          decoding="async"
          data-testid="hp-game-art"
          className="h-20 w-20 lg:h-32 lg:w-32"
        />
      </picture>
    );
  }
  if ('src' in art) {
    return <Image src={art.src} alt="" width={256} height={256} unoptimized className="h-20 w-20 lg:h-32 lg:w-32" />;
  }
  return (
    <div className="flex h-20 flex-col-reverse justify-start lg:h-32" dir="ltr" aria-hidden="true">
      {art.tower.map((ch, i) => (
        <span
          key={ch}
          className={`-mt-px flex h-4 w-9 items-center justify-center rounded-[4px] border-2 border-black bg-neo-cream font-neo-display text-[10px] font-bold text-black lg:h-6 lg:w-14 lg:text-sm ${TOWER_OFFSET[i]}`}
        >
          {ch}
        </span>
      ))}
    </div>
  );
}

/** A shelf of game cartridges: each tilted a little, each its own colour. */
export function MoreGames({ lang, t, hideAdventure = false }: { lang: string; t: (key: string) => string; hideAdventure?: boolean }) {
  const games = hideAdventure ? GAMES.filter((g) => g.id !== 'adventure') : GAMES;
  return (
    <section aria-labelledby="hp-games-title" data-testid="hp-games">
      <div className="mb-4 flex items-end justify-between gap-3 lg:mb-6">
        <div>
          <h2 id="hp-games-title" className="font-neo-display text-2xl font-bold text-neo-cream lg:text-5xl">
            {t('homeFresh.modes.next')}
          </h2>
          <p className="mt-1 text-sm text-neo-white/65 lg:text-lg">{t('homePlay.gamesLine')}</p>
        </div>
      </div>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-4 lg:grid-cols-4 lg:gap-8">
        {games.filter((g) => !TUCKED.has(g.id)).map((g) => (
          <li key={g.id}>
            <Link
              href={`/${lang}/${g.href}`}
              className={`group flex h-full flex-col overflow-hidden rounded-2xl border-[3px] border-black text-black shadow-hard transition-transform hover:rotate-0 active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-pressed lg:rounded-3xl lg:shadow-hard-lg ${g.bg} ${g.tilt}`}
            >
              <div className="relative flex items-end justify-center border-b-[3px] border-black bg-neo-navy pt-3 lg:pt-6">
                <span aria-hidden="true" className="absolute inset-x-0 top-1.5 flex justify-center gap-1 lg:top-3">
                  {[0, 1, 2, 3, 4].map((n) => (
                    <span key={n} className="h-1 w-3 rounded-full bg-neo-white/20 lg:w-5" />
                  ))}
                </span>
                <GameArt art={g.art} />
              </div>
              <div className="flex flex-1 flex-col gap-0.5 p-2.5 lg:p-5">
                <h3 className="font-neo-display text-base font-bold leading-tight lg:text-2xl">{t(g.titleKey)}</h3>
                <p className="text-[12px] leading-snug font-medium lg:text-base">{t(g.lineKey)}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      <details className="group mt-4 lg:mt-6" data-testid="hp-games-more">
        <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-xl border-[3px] border-black bg-neo-navy-elevated px-4 font-neo-display text-sm font-bold text-neo-cream shadow-hard-sm [&::-webkit-details-marker]:hidden lg:text-base">
          {t('quickLoop.moreGames')}
          <span aria-hidden="true" className="transition-transform group-open:rotate-180">▾</span>
        </summary>
        <ul className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {games.filter((g) => TUCKED.has(g.id)).map((g) => (
            <li key={g.id}>
              <Link
                href={`/${lang}/${g.href}`}
                data-testid={`hp-games-more-${g.id}`}
                className={`flex h-full flex-col gap-0.5 rounded-2xl border-[3px] border-black p-3 text-black shadow-hard-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-pressed ${g.bg}`}
              >
                <span className="font-neo-display text-sm font-bold leading-tight lg:text-lg">{t(g.titleKey)}</span>
                <span className="text-[12px] leading-snug font-medium lg:text-sm">{t(g.lineKey)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
