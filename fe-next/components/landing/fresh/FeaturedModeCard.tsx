'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { FEATURED_HOME_MODE, isBlastLocale } from '@/lib/landing/blastPlacement';
import { MODE_META, modeRoute } from '@/lib/landing/modeMeta';
import { cn } from '@/lib/utils';
import styles from './FeaturedModeCard.module.css';

interface FeaturedModeCardProps {
  onPick: (key: string) => void;
}

/** The fresh homepage's recommended mode, one wide card above the mode row. */
export function FeaturedModeCard({ onPick }: FeaturedModeCardProps) {
  const { t, language } = useLanguage();
  const key = FEATURED_HOME_MODE;
  const meta = MODE_META[key];
  const href = modeRoute(key, language);
  const art = meta?.modeImage ?? meta?.genIcon;
  if (!meta || !href || !art || !isBlastLocale(language)) return null;

  return (
    <div className="mt-8 w-full md:mt-10">
      <Link
        href={href}
        data-mode={key}
        data-featured="true"
        onClick={() => onPick(key)}
        className={cn(
          'group relative flex items-center gap-4 rounded-neo border-3 border-neo-black bg-neo-orange p-3 text-neo-black shadow-hard-xl sm:gap-6 sm:p-4 md:p-5',
          'motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out motion-safe:hover:-translate-y-1',
          'active:translate-y-[3px] active:scale-[0.99] active:shadow-hard-pressed',
          'focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-neo-cream'
        )}
      >
        <div className="relative grid h-28 w-28 shrink-0 place-items-center rounded-[6px] border-3 border-neo-black bg-neo-navy sm:h-36 sm:w-36 md:h-52 md:w-52">
          <Image
            src={art}
            alt=""
            width={256}
            height={256}
            sizes="(min-width: 768px) 208px, (min-width: 640px) 144px, 112px"
            className={cn('h-[88%] w-[88%] select-none object-contain', styles.mascot)}
          />
        </div>
        <div className="min-w-0 flex-1">
          <span className="inline-flex items-center rounded-full border-2 border-neo-black bg-neo-lime px-2.5 py-1 font-neo-display text-xs font-black uppercase leading-none tracking-wide text-neo-navy shadow-hard-sm md:text-sm">
            {t('landing.badge.recommended')}
          </span>
          <h3 className="mt-2 font-neo-display text-2xl font-black uppercase leading-none sm:text-3xl md:text-5xl">
            {t(`homeFresh.modes.items.${key}.title`)}
          </h3>
          <p className="mt-1.5 max-w-[40ch] font-neo-body text-sm font-semibold leading-snug sm:text-base md:mt-2 md:text-xl">
            {t(`homeFresh.modes.items.${key}.line`)}
          </p>
          <span
            aria-hidden="true"
            className="mt-4 hidden w-fit items-center gap-2 rounded-neo border-3 border-neo-black bg-neo-cream px-4 py-2 font-neo-display text-base font-black uppercase shadow-hard sm:inline-flex md:text-lg"
          >
            {t('homeFresh.hero.play')}
            <DirectionalIcon
              icon={ArrowRight}
              className="h-5 w-5 motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5 rtl:motion-safe:group-hover:-translate-x-0.5"
            />
          </span>
        </div>
      </Link>
    </div>
  );
}
