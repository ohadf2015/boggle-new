'use client';

import { memo } from 'react';
import { usePathname } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBackOneLevel } from '@/hooks/useBackOneLevel';
import { cn } from '@/lib/utils';

const HOME_PATH_RE = /^\/?(?:en|he|sv|ja|es)?\/?$/;

export const HeaderBackButton = memo(function HeaderBackButton() {
  const pathname = usePathname() || '/';
  const { t } = useLanguage();
  // Navigate one level up the URL hierarchy (push parent), not blind history.back().
  const onClick = useBackOneLevel();

  if (HOME_PATH_RE.test(pathname)) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t('common.back')}
      className={cn(
        'inline-flex items-center gap-1.5',
        'px-2 py-1.5 lg:px-2.5 rounded-neo border-neo border-black',
        'bg-neo-white dark:bg-neo-navy-light text-neo-navy dark:text-neo-white',
        'shadow-hard-sm hover:shadow-hard active:shadow-hard-pressed active:translate-y-[1px]',
        'font-neo-body font-bold text-sm transition-all duration-100'
      )}
    >
      <ArrowLeft className="w-4 h-4 rtl:rotate-180" aria-hidden="true" />
      <span className="hidden lg:inline">{t('common.back')}</span>
    </button>
  );
});

export default HeaderBackButton;
