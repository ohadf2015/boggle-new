'use client';

import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

/**
 * Breadcrumbs — visible navigation trail for content pages.
 * Renders Home > ... > Current Page with proper aria/nav markup.
 */
export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  const { t, language } = useLanguage();

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn('text-sm text-neo-black/60 dark:text-neo-white mb-4', className)}
    >
      <ol className="flex items-center gap-1 flex-wrap">
        {/* Home */}
        <li className="flex items-center gap-1">
          <Link
            href={`/${language}`}
            className="hover:text-neo-cyan transition-colors inline-flex items-center gap-1"
          >
            <Home className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{t('nav.home')}</span>
          </Link>
        </li>

        {items.map((item, i) => (
          <li key={item.href ?? `${item.label}-${i}`} className="flex items-center gap-1">
            <ChevronRight className="w-3.5 h-3.5 text-neo-black/30 dark:text-neo-white rtl:rotate-180" aria-hidden="true" />
            {item.href ? (
              <Link
                href={item.href}
                className="hover:text-neo-cyan transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-neo-black/80 dark:text-neo-white font-medium" aria-current="page">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export default Breadcrumbs;
