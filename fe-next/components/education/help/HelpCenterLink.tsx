'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, LifeBuoy } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { HELP_PATH } from './helpRegistry';
import { isHelpLocale } from './helpTypes';

/** Entry point to the help center for surfaces owned by other pieces (landing, footer). */
export function HelpCenterLink({ variant = 'card', className = '' }: { variant?: 'card' | 'inline'; className?: string }) {
  const { t, language } = useLanguage();
  const href = `/${isHelpLocale(language) ? language : 'en'}${HELP_PATH}`;

  if (variant === 'inline') {
    return (
      <Link
        href={href}
        data-ph-capture-attribute-cta="help_center_inline"
        className={`inline-flex items-center gap-1.5 font-bold text-neo-cyan hover:text-neo-lime ${className}`}
      >
        <LifeBuoy aria-hidden="true" className="size-4" />
        {t('eg2Help.link.title')}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      data-ph-capture-attribute-cta="help_center_card"
      className={`group flex items-center gap-4 rounded-neo border-4 border-neo-cream/50 bg-neo-navy-light p-4 text-neo-white shadow-hard-lg transition-transform hover:-translate-y-1 ${className}`}
    >
      <Image src="/mascot/teacher/badge-coach.webp" alt="" width={56} height={56} sizes="56px" className="size-14 shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block font-neo-display text-lg font-black">{t('eg2Help.link.title')}</span>
        <span className="block text-sm text-neo-gray-300">{t('eg2Help.link.body')}</span>
      </span>
      <span className="inline-flex shrink-0 items-center gap-1 rounded-neo border-3 border-neo-black bg-neo-lime px-3 py-2 font-neo-display text-sm font-black uppercase text-neo-navy shadow-hard">
        {t('eg2Help.link.cta')}
        <DirectionalIcon icon={ArrowRight} className="size-4" />
      </span>
    </Link>
  );
}
