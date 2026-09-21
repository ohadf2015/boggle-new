'use client';

/**
 * TeacherSetupSection — "how it works in your classroom", on the PUBLIC
 * /education page.
 *
 * Every setup explainer we had shipped sat behind `TeacherGate`: the first-run
 * `TeacherOnboarding` modal and the #1099 dashboard checklist. A teacher still
 * deciding whether to use the product could reach neither, and none of the
 * eight landing FAQs answer "how do I actually run this with my class" — they
 * answer access, pricing, privacy and competitor comparisons. A teacher emailed
 * to say the classroom setup instructions were not accessible, and left.
 *
 * So the steps render here too, unauthenticated, from the same source the modal
 * uses. Anchored at #how-it-works so nav, FAQ answers and support replies can
 * link straight to it.
 */

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { TeacherSetupSteps } from './TeacherSetupSteps';
import { TeacherTourDialog } from './tour/TeacherTourDialog';

export function TeacherSetupSection() {
  const { t, language } = useLanguage();

  return (
    <section id="how-it-works" className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
      <div className="max-w-3xl">
        <h2 className="text-3xl font-neo-display font-extrabold text-neo-white text-balance">
          {t('education.onboarding.title')}
        </h2>
        <p className="mt-3 text-neo-white/70 font-neo-body text-pretty">
          {t('education.onboarding.subtitle')}
        </p>
      </div>

      <TeacherSetupSteps className="mt-8" />

      <div className="mt-8 flex items-center justify-center gap-4">
        <TeacherTourDialog />
      </div>

      <div className="mt-8">
        <Link
          href={`/${language}/education/access`}
          data-testid="setup-section-cta"
          className="inline-flex items-center gap-2 rounded-neo border-neo border-neo-black bg-neo-lime px-6 py-3 font-neo-display font-black uppercase text-neo-black shadow-hard transition-all hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-y-0.5 active:shadow-hard-pressed"
        >
          {t('education.landing.teacherCta')}
          <DirectionalIcon icon={ArrowRight} className="h-5 w-5" />
        </Link>
      </div>
    </section>
  );
}

export default TeacherSetupSection;
