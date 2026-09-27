'use client';

import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { FAQ_ROW, FAQ_SUMMARY, FAQ_TOGGLE } from './FreshFaqRow';

interface FreshFaqMoreProps {
  /** How many questions are folded in (shown in the summary). */
  count: number;
  /** The folded FAQ rows, server-rendered by HomepageContentSection. */
  children: ReactNode;
}

/**
 * The FAQ card's fourth row: "N more questions". It wears the exact shell of
 * the question rows above it (./FreshFaqRow), so the card reads as ONE
 * accordion of four rows (homepage gauntlet, round 6: the round-5 fold was a
 * differently styled text toggle and read as a second accordion). The folded
 * questions stay in the server HTML (the FAQPage JSON-LD is built from the
 * whole list and must match on-page copy); native <details>, no JS to open.
 * The full-FAQ link sits in the card's footer, visible at rest.
 *
 * useLanguageSafe: HomepageContentSection is a server component that is also
 * rendered standalone in tests, outside any LanguageProvider.
 */
export function FreshFaqMore({ count, children }: FreshFaqMoreProps) {
  const { t } = useLanguageSafe();
  return (
    <details data-faq-more className={cn('group/more', FAQ_ROW)}>
      <summary className={FAQ_SUMMARY}>
        <span>{t('homeFresh.close.faqMore', { count })}</span>
        <span data-faq-toggle aria-hidden="true" className={FAQ_TOGGLE}>
          <ChevronDown
            className="h-4 w-4 motion-safe:transition-transform motion-safe:duration-200 group-open/more:rotate-180"
            strokeWidth={3}
          />
        </span>
      </summary>
      <div className="flex flex-col gap-2 px-2 pb-2">{children}</div>
    </details>
  );
}
