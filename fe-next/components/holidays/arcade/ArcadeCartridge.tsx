'use client';

import Link from 'next/link';
import { Gamepad2 } from 'lucide-react';
import { PressSurface } from '@/components/motion/PressSurface';
import { useLanguage } from '@/contexts/LanguageContext';
import { useArcadeGate } from './useArcadeGate';

const ART = { hanukkah: '/holidays/m-hanukkah-menorah.webp', christmas: '/holidays/m-christmas-tree.webp' } as const;

/** The Holiday Arcade as a cartridge on the home games shelf, only while an event is live. */
export default function ArcadeCartridge({ lang }: { lang: string }) {
  const { t } = useLanguage();
  const { holiday } = useArcadeGate();
  if (!holiday) return null;
  return (
    <li className="col-span-2 lg:col-span-4">
      <PressSurface asChild lip={4}>
        <Link
          href={`/${lang}/holiday-arcade`}
          data-testid="hp-games-holiday"
          className="group flex h-full -rotate-1 items-stretch overflow-hidden rounded-2xl border-[3px] border-black bg-neo-holiday-gold text-black hover:rotate-0 lg:rotate-0 lg:rounded-3xl"
        >
          <div className="flex w-28 shrink-0 items-end justify-center border-e-[3px] border-black bg-neo-navy pt-2 lg:w-56 lg:pt-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ART[holiday]} alt="" width={256} height={256} loading="lazy" className="h-24 w-24 object-contain lg:h-36 lg:w-36" />
          </div>
          <div className="flex flex-1 items-center gap-3 p-3 lg:p-6">
            <div className="min-w-0 flex-1">
              <h3 className="font-neo-display text-lg font-bold leading-tight lg:text-3xl">{t('holiday.arcade.tileTitle')}</h3>
              <p className="mt-0.5 text-[13px] font-medium leading-snug lg:text-lg">{t('holiday.arcade.tileSubtitle')}</p>
            </div>
            <Gamepad2 className="size-7 shrink-0 lg:size-10" aria-hidden="true" />
          </div>
        </Link>
      </PressSurface>
    </li>
  );
}
