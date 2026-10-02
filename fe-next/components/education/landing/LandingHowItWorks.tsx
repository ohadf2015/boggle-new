'use client';
import { useLanguage } from '@/contexts/LanguageContext';
import { TeacherSetupSteps } from '@/components/education/TeacherSetupSteps';
import { TeacherTourDialog } from '@/components/education/tour/TeacherTourDialog';

export interface GeoAnswer {
  question: string;
  answer: string;
}

export function LandingHowItWorks({ geo }: { geo?: GeoAnswer }) {
  const { t } = useLanguage();
  return (
    <section id="how-it-works" data-answer className="mx-auto max-w-6xl scroll-mt-20 px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <p className="font-neo-display text-sm font-black uppercase tracking-wider text-neo-lime">{t('eg2Land.how.eyebrow')}</p>
      <h2 className="mt-2 max-w-3xl text-balance font-neo-display text-2xl font-black leading-tight text-neo-white sm:text-3xl">
        {geo?.question ?? t('eg2Land.how.title')}
      </h2>
      {geo && <p className="mt-3 max-w-[70ch] text-base leading-relaxed text-neo-white/80">{geo.answer}</p>}
      <TeacherSetupSteps className="mt-8" />
      <div className="mt-6 flex justify-center">
        <TeacherTourDialog />
      </div>
    </section>
  );
}

export default LandingHowItWorks;
