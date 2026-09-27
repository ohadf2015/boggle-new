'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';

/**
 * Locales with a dedicated "play free online" landing page that the homepage
 * links to. It was a full-width cyan banner (round-2 critic: "stray ad
 * unit"), then a pill in a "Learn more" link row (round-3 critic: "redundant
 * plain-text link row"). Now it is one inline link that closes the
 * "What is LexiClash?" sentence (LandingSEOSection): same target, no row.
 */
const CROSS_LINK_HREF: Record<string, string> = {
  en: '/en/play-boggle-online-free',
  es: '/es/juego-de-palabras-multijugador',
  sv: '/sv/swedish-multiplayer-word-game',
};

interface FreshCrossLinkProps {
  locale: string;
  className: string;
}

export function FreshCrossLink({ locale, className }: FreshCrossLinkProps) {
  const { t } = useLanguage();
  const href = CROSS_LINK_HREF[locale];
  if (!href) return null;
  return (
    <Link prefetch={false} href={href} className={className}>
      {t('homeFresh.close.crossLink')}
      <DirectionalIcon icon={ArrowRight} className="ms-1 inline h-4 w-4 align-[-2px]" />
    </Link>
  );
}
