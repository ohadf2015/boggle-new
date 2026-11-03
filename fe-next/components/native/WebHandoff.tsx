'use client';

import { useLanguage } from '@/contexts/LanguageContext';

const SITE = 'https://www.lexiclash.live';

/** Plans live on the website only; the app sends the people who need them there (system browser). */
export default function WebHandoff() {
  const { t, language } = useLanguage();
  const url = `${SITE}/${language}/teacher/upgrade`;

  const open = async () => {
    try {
      const { Browser } = await import('@capacitor/browser');
      await Browser.open({ url });
    } catch {
      window.open(url, '_blank', 'noopener');
    }
  };

  return (
    <main className="mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-black text-neo-cream">{t('webHandoff.title')}</h1>
      <p className="text-neo-cream/80">{t('webHandoff.body')}</p>
      <button
        type="button"
        onClick={open}
        className="rounded-xl border-2 border-neo-black bg-neo-lime px-5 py-3 font-bold text-neo-black shadow-hard-sm"
      >
        {t('webHandoff.open')}
      </button>
    </main>
  );
}
