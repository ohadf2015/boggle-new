'use client';

import { Search } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

export function SearchIconButton() {
  const { t } = useLanguage();

  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent('openCommandPalette'))}
      aria-label={t('common.search')}
      className={cn('focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-neo-black',
        'flex items-center justify-center shrink-0',
        'h-11 w-11 min-w-11 min-h-11',
        'bg-neo-navy text-neo-white',
        'border-3 border-neo-cream/40',
        'rounded-neo shadow-hard-sm',
        'hover:-translate-y-px hover:bg-neo-cyan hover:text-neo-black hover:shadow-hard',
        'active:translate-y-px active:shadow-none',
        'transition duration-100',
        'focus:outline-hidden focus:ring-2 focus:ring-neo-cyan focus:ring-offset-2',
      )}
    >
      <Search className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}

export default SearchIconButton;
