'use client';

import { Mail, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { shareWithFallback } from '@/utils/shareWithFallback';
import { buildAskSchoolLink, buildMailtoHref, sanitizeRequesterName } from '@/lib/education/pro/askSchool';
import { TEACHER_PRO_PRICE_USD } from '@/lib/education/freeTierLimits';

export function AskSchoolPanel({ requesterName, origin }: { requesterName: string; origin: string }) {
  const { t, language } = useLanguage();
  const name = sanitizeRequesterName(requesterName);
  const link = buildAskSchoolLink({ origin, locale: language, name });
  const subject = t('eg2Pro.ask.subject');
  const body = t('eg2Pro.ask.body', { price: `$${TEACHER_PRO_PRICE_USD}`, link, name: name || t('eg2Pro.ask.unnamed') });

  const onShare = async () => {
    trackGrowthEvent('landing_cta_clicked', { cta: 'ask_school_share', source: 'teacher_upgrade' });
    const result = await shareWithFallback({ title: subject, text: body });
    if (result === 'copied') toast.success(t('eg2Pro.ask.copied'));
    if (result === 'failed') toast.error(t('eg2Pro.ask.copyFailed'));
  };

  return (
    <div data-testid="ask-school-panel" className="rounded-neo border-2 border-neo-black bg-neo-white p-3 text-neo-black shadow-hard-sm">
      <p className="text-sm font-black">{t('eg2Pro.ask.title')}</p>
      <p className="mt-1 text-xs font-bold text-neo-black/70">{t('eg2Pro.ask.lead')}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <a
          href={buildMailtoHref(subject, body)}
          onClick={() => trackGrowthEvent('landing_cta_clicked', { cta: 'ask_school_email', source: 'teacher_upgrade' })}
          className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-neo border-2 border-neo-black bg-neo-yellow px-3 text-sm font-black shadow-hard-sm transition-transform hover:-translate-y-0.5 motion-reduce:transition-none"
        >
          <Mail className="h-4 w-4" aria-hidden /> {t('eg2Pro.ask.email')}
        </a>
        <button
          type="button"
          onClick={() => { void onShare(); }}
          className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-neo border-2 border-neo-black bg-neo-white px-3 text-sm font-black shadow-hard-sm transition-transform hover:-translate-y-0.5 motion-reduce:transition-none"
        >
          <Share2 className="h-4 w-4" aria-hidden /> {t('eg2Pro.ask.share')}
        </button>
      </div>
    </div>
  );
}
