'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useExperiment } from '@/hooks/useExperiment';
import { isWordMasteryEnvEnabled, resolveWordMasteryAccess } from '@/lib/wordMastery/isEnabled';

export function WordMasteryCard() {
  const { t, language } = useLanguage();
  const { variant, trackExposure } = useExperiment('word-mastery-v1');
  const enabled = resolveWordMasteryAccess({
    envEnabled: isWordMasteryEnvEnabled(),
    dbFlagEnabled: false,
    experimentVariant: variant,
  });

  useEffect(() => {
    if (enabled) trackExposure();
  }, [enabled, trackExposure]);

  if (!enabled) return null;

  return (
    <Link
      href={`/${language}/profile/words`}
      className="mt-4 flex items-center gap-3 rounded-neo border-2 border-neo-black bg-neo-cyan/20 px-4 py-3 shadow-hard-sm hover:shadow-hard"
    >
      <BookOpen className="w-5 h-5 text-neo-cyan shrink-0" aria-hidden="true" />
      <div>
        <p className="font-neo-display font-black uppercase tracking-wide text-neo-navy dark:text-neo-white text-sm">
          {t('wordMastery.title')}
        </p>
        <p className="text-neo-navy/70 dark:text-neo-white/70 text-xs">{t('wordMastery.subtitle')}</p>
      </div>
    </Link>
  );
}
