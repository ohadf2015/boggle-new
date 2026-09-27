'use client';
import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

interface Props {
  hasAccess: boolean;
}

const BANNER_DISMISSED_FLAG = 'teacher-welcome-banner-dismissed';

export function TeacherWelcomeBanner({ hasAccess }: Props) {
  const { t } = useLanguage();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!hasAccess) {
      setShow(false);
      return;
    }

    const isDismissed = localStorage.getItem(BANNER_DISMISSED_FLAG) === 'true';
    if (!isDismissed) {
      setShow(true);
    }
  }, [hasAccess]);

  const handleDismiss = () => {
    localStorage.setItem(BANNER_DISMISSED_FLAG, 'true');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="rounded-neo border-neo bg-neo-lime p-4 text-neo-navy shadow-hard">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold font-neo-display">{t('education.teacher.welcome_banner_title')}</h3>
          <p className="mt-1 text-sm text-neo-navy/80">{t('education.teacher.welcome_banner_body')}</p>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="mt-1 whitespace-nowrap rounded-neo bg-neo-navy px-3 py-1 text-xs font-bold text-neo-white shadow-hard-sm hover:shadow-hard-sm active:shadow-hard-pressed transition-all"
        >
          {t('education.teacher.welcome_banner_dismiss')}
        </button>
      </div>
    </div>
  );
}
