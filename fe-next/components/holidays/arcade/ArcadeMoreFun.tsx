'use client';

import Link from 'next/link';
import { PressSurface } from '@/components/motion/PressSurface';
import { ModeRail } from '@/components/home-preview/ModeRail';
import type { HolidayKey } from '@/lib/holidays/calendar';

type T = (key: string, params?: Record<string, string | number>) => string;

const LINKS = [
  { id: 'daily', path: '/daily', bg: 'bg-neo-lime', tilt: '-rotate-1', art: { hanukkah: '/holidays/props-dreidel.webp', christmas: '/holidays/props-ornament.webp' } },
  { id: 'friends', path: '/multiplayer', bg: 'bg-neo-pink', tilt: 'rotate-1', art: { hanukkah: '/holidays/table-hanukkah.webp', christmas: '/holidays/table-christmas.webp' } },
] as const;

export default function ArcadeMoreFun({ holiday, lang, t }: { holiday: HolidayKey; lang: string; t: T }) {
  return (
    <section aria-labelledby="arcade-more-title" className="flex flex-col gap-3">
      <div>
        <h2 id="arcade-more-title" className="font-neo-display text-2xl font-black text-neo-cream">{t('holiday.arcade.lobby.moreTitle')}</h2>
        <p className="mt-0.5 text-sm text-neo-white/65">{t('holiday.arcade.lobby.moreLine')}</p>
      </div>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {LINKS.map((l) => (
          <li key={l.id} className={l.tilt}>
            <PressSurface asChild lip={4}>
              <Link
                href={`/${lang}${l.path}`}
                data-testid={`arcade-more-${l.id}`}
                className={`flex h-full items-stretch overflow-hidden rounded-2xl border-[3px] border-black text-black hover:rotate-0 sm:flex-col ${l.bg}`}
              >
                <span className="flex w-24 shrink-0 items-center justify-center border-e-[3px] border-black bg-neo-navy p-1.5 sm:h-28 sm:w-full sm:border-e-0 sm:border-b-[3px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={l.art[holiday]} alt="" loading="lazy" className="max-h-20 w-auto object-contain sm:max-h-24" />
                </span>
                <span className="flex flex-1 flex-col justify-center gap-0.5 p-3">
                  <span className="font-neo-display text-base font-black leading-tight">{t(`holiday.arcade.lobby.${l.id}.title`)}</span>
                  <span className="text-[13px] font-medium leading-snug">{t(`holiday.arcade.lobby.${l.id}.line`)}</span>
                </span>
              </Link>
            </PressSurface>
          </li>
        ))}
      </ul>
      <div className="mx-auto mt-2 w-full max-w-md">
        <ModeRail lang={lang} t={t} />
      </div>
    </section>
  );
}
