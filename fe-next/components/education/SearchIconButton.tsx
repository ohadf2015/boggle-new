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
      className={cn(
        'flex items-center justify-center shrink-0',
        'h-10 w-10 min-w-[40px] min-h-[40px]',
        'bg-neo-navy text-neo-white',
        'border-3 border-neo-cream/40',
        'rounded-neo shadow-hard-sm',
        'hover:-translate-y-px hover:bg-neo-cyan hover:text-neo-black hover:shadow-hard',
        'active:translate-y-px active:shadow-none',
        'transition-all duration-100',
        'focus:outline-hidden focus:ring-2 focus:ring-neo-cyan focus:ring-offset-2',
      )}
    >
      <Search className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}

export default SearchIconButton;
