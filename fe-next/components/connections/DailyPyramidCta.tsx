'use client';

import Link from 'next/link';
import { m } from 'framer-motion';
import { Pyramid as PyramidIcon, ChevronRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { getPyramidsForLocale } from '@/lib/connections/pyramid/puzzles';

/**
 * Pyramid is the deeper mode and the natural next step once the day's 5
 * bridges are spent — a real card under the daily results, not a thin link.
 * Renders nothing for locales without a pyramid pool.
 */
export default function DailyPyramidCta() {
  const { t, language } = useLanguage();
  if (getPyramidsForLocale(language).length === 0) return null;
  return (
    <m.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.85 }}
      className="mx-auto w-full max-w-md px-4 pb-6"
    >
      <Link
        href={`/${language}/connections/pyramid`}
        data-testid="pyramid-cta"
        className="flex items-center gap-3 rounded-neo border-neo-thick border-neo-purple bg-neo-purple/15 p-4 shadow-hard transition-transform hover:-translate-y-0.5 active:translate-y-0"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-neo border-neo border-neo-purple bg-neo-purple/25">
          <PyramidIcon className="h-6 w-6 text-neo-purple" strokeWidth={2.5} aria-hidden="true" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col text-start">
          <span className="font-neo-display text-base font-black text-neo-purple">
            {t('connections.pyramid.cta')}
          </span>
          <span className="font-neo-body text-xs text-neo-white/70">{t('connections.pyramid.tagline')}</span>
        </span>
        <DirectionalIcon icon={ChevronRight} className="h-5 w-5 shrink-0 text-neo-purple" />
      </Link>
    </m.div>
  );
}
