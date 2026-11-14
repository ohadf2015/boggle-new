'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { useLanguage } from '@/contexts/LanguageContext';
import { InkPanel, Medallion, INK_TEXT } from './chrome';
import { cn } from '@/lib/utils';

interface Props {
  title: string;
  /** Painted icon beside the title (an academy art file). */
  art?: string;
  /** Small chip at the end of the plaque (a count, a total). */
  badge?: ReactNode;
  /** A phone on its side: a shorter plaque. */
  compact?: boolean;
  className?: string;
}

/** The ink title plaque of every Academy screen, with the gold way back to the map. */
export function AcademyPlaque({ title, art, badge, compact = false, className }: Props) {
  const { t, language } = useLanguage();
  return (
    <InkPanel
      role="banner"
      tone="night"
      data-testid="academy-plaque"
      className={cn('flex min-w-0 flex-1 items-center gap-2.5', compact ? 'h-14 px-2' : 'h-16 px-2.5 sm:h-[4.5rem] sm:px-3', className)}
    >
      <Link
        href={`/${language}/student`}
        data-testid="academy-page-back"
        aria-label={t('academy.pages.backToMap', 'Back to the Academy')}
        className="icon-only flex shrink-0 items-center justify-center rounded-full outline-none transition-transform active:translate-y-[2px] focus-visible:ring-2 focus-visible:ring-neo-yellow"
        style={{ padding: 0 }}
      >
        <Medallion tone="gold" size={compact ? 38 : 44} shadow={2}>
          <DirectionalIcon icon={ArrowLeft} className="h-5 w-5 text-neo-black" />
        </Medallion>
      </Link>
      {art && (
        <span className="relative h-10 w-10 shrink-0 sm:h-12 sm:w-12" aria-hidden="true">
          <Image src={art} alt="" fill unoptimized sizes="48px" className="object-contain drop-shadow-[2px_2px_0_rgb(var(--neo-black))]" />
        </span>
      )}
      <h1 dir="auto" title={title} className={cn('min-w-0 flex-1 truncate font-neo-display font-black leading-tight text-neo-white', compact ? 'text-xl' : 'text-2xl sm:text-3xl', INK_TEXT)}>
        {title}
      </h1>
      {badge && <div className="shrink-0">{badge}</div>}
    </InkPanel>
  );
}
