'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { beginClassModeBridgeSession } from '@/lib/education/classModeBridgeStart';
import { classBridgeLocale } from '@/lib/education/classModeBridge';

const INVALID: Record<string, string> = {
  en: 'That play-again link is not a class round.',
  he: 'הקישור הזה אינו שייך לסבב כיתתי.',
  es: 'Ese enlace no es de una ronda de clase.',
  sv: 'Den länken hör inte till en klassrunda.',
  ja: 'このリンクは授業のラウンドではありません。',
  ru: 'Эта ссылка не от классного раунда.',
};

/** Counts the second session, then continues into the mode the student tapped. */
export default function ClassModeBridgeStart() {
  const router = useRouter();
  const params = useSearchParams();
  const { language } = useLanguage();
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    const href = beginClassModeBridgeSession(
      params.toString(),
      language,
      typeof window === 'undefined' ? null : window.sessionStorage,
    );
    if (!href) {
      setInvalid(true);
      return;
    }
    router.replace(href);
  }, [params, language, router]);

  if (invalid) {
    const locale = classBridgeLocale(language);
    return (
      <div className="flex min-h-dvh items-center justify-center bg-edu-page px-4 text-center">
        <p className="max-w-sm font-neo-display text-lg font-black text-edu-ink">{INVALID[locale]}</p>
      </div>
    );
  }

  return <div data-testid="class-mode-bridge-start" aria-busy="true" className="min-h-dvh bg-edu-page" />;
}
