'use client';

import { useLayoutEffect, useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const DISMISSED_KEY = 'lc:daily-newcomer-tip-dismissed';

interface NewcomerTipProps {
  /** Title of the mode the hero card offers first. */
  modeTitle: string;
}

/** "New here? Start with …" — shown until the first daily is played or the tip is dismissed. */
export function NewcomerTip({ modeTitle }: NewcomerTipProps) {
  const { t } = useLanguage();
  const [hidden, setHidden] = useState(true);

  useLayoutEffect(() => {
    try {
      setHidden(localStorage.getItem(DISMISSED_KEY) === '1');
    } catch {
      setHidden(false);
    }
  }, []);

  if (hidden) return null;

  const dismiss = () => {
    setHidden(true);
    try { localStorage.setItem(DISMISSED_KEY, '1'); } catch { /* storage off */ }
  };

  return (
    <div
      data-testid="daily-newcomer-tip"
      role="note"
      className="w-full flex items-center gap-2.5 rounded-xl border-2 border-neo-black bg-neo-yellow px-3 py-2 text-neo-black shadow-hard-sm"
    >
      <Sparkles className="w-5 h-5 shrink-0" strokeWidth={2.5} aria-hidden="true" />
      <p className="flex-1 min-w-0 text-sm font-bold leading-snug">
        {t('daily.hub.newcomerTip', { mode: modeTitle })}
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label={t('daily.hub.dismissTip')}
        className="shrink-0 w-11 h-11 -me-1.5 flex items-center justify-center rounded-lg focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-black/40"
      >
        <X className="w-5 h-5" strokeWidth={3} aria-hidden="true" />
      </button>
    </div>
  );
}

export default NewcomerTip;
