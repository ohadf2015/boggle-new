'use client';
import { useState } from 'react';
import { EducationPackages } from '@/components/education/EducationPackages';
import { SchoolLeadForm } from '@/components/education/SchoolLeadForm';
import type { EducationLeadPlan } from '@/lib/education/educationPackages';

/** Packages plus the school quote form; the chosen package preselects the form's plan. */
export function ForSchoolsLead({ locale, leadTitle, leadIntro }: { locale: string; leadTitle: string; leadIntro: string }) {
  const [plan, setPlan] = useState<EducationLeadPlan>('school');
  return (
    <>
      <div className="[&>section]:mt-0">
        <EducationPackages locale={locale} onPlanChange={setPlan} />
      </div>
      <section id="lead" className="grid scroll-mt-20 gap-5 lg:grid-cols-12 lg:gap-10">
        <div className="flex flex-col gap-2 lg:col-span-5">
          <h2 className="font-neo-display text-2xl font-bold leading-tight text-balance sm:text-3xl">{leadTitle}</h2>
          <p className="leading-relaxed text-neo-white/80">{leadIntro}</p>
        </div>
        <div className="rounded-neo-lg border-3 border-neo-black bg-neo-navy-light p-5 shadow-hard-xl sm:p-7 lg:col-span-7">
          <SchoolLeadForm plan={plan} page={`/${locale}/education/for-schools`} />
        </div>
      </section>
    </>
  );
}
