'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

const VISIBLE_MS = 2000;

/** Feedback for the first Android back press on a root route (see useAndroidBackButton). */
export default function ExitHintToast() {
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const show = () => {
      setVisible(true);
      clearTimeout(timer);
      timer = setTimeout(() => setVisible(false), VISIBLE_MS);
    };
    window.addEventListener('lexiclash:exit-hint', show);
    return () => {
      window.removeEventListener('lexiclash:exit-hint', show);
      clearTimeout(timer);
    };
  }, []);

  if (!visible) return null;
  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 bottom-24 z-[200] mx-auto w-fit max-w-[80vw] rounded-xl border-2 border-neo-black bg-neo-navy px-4 py-2 text-center font-bold text-neo-cream shadow-hard-sm"
    >
      {t('common.pressBackAgainToExit')}
    </div>
  );
}
