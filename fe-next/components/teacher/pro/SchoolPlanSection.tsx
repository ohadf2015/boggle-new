'use client';

import { Mail, ListChecks, Users } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { SchoolQuoteForm } from './SchoolQuoteForm';

const STEPS = [
  { icon: Users, key: 'step1' },
  { icon: Mail, key: 'step2' },
  { icon: ListChecks, key: 'step3' },
] as const;

export function SchoolPlanSection({ requester }: { requester: string }) {
  const { t } = useLanguage();
  return (
    <section data-testid="school-plan-section" className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-8">
      <div className="min-w-0">
        <p className="text-xs font-black uppercase tracking-widest text-neo-yellow">{t('eg2Pro.school.eyebrow')}</p>
        <h2 className="mt-1 font-neo-display text-2xl font-black text-neo-white lg:text-3xl" style={{ textWrap: 'balance' }}>
          {t('eg2Pro.school.title')}
        </h2>
        <p className="mt-2 text-sm font-bold leading-relaxed text-neo-white/80">{t('eg2Pro.school.lead')}</p>
        <ol className="mt-5 space-y-3">
          {STEPS.map(({ icon: Icon, key }, i) => (
            <li key={key} className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-neo border-2 border-neo-black bg-neo-yellow font-neo-display text-sm font-black text-neo-black shadow-hard-sm">
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-sm font-black text-neo-white">
                  <Icon className="h-4 w-4 text-neo-yellow" aria-hidden /> {t(`eg2Pro.school.${key}Title`)}
                </p>
                <p className="text-sm font-bold text-neo-white/70">{t(`eg2Pro.school.${key}Body`)}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
      <SchoolQuoteForm requester={requester} />
    </section>
  );
}
