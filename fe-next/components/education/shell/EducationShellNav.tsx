'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { EducationNav } from './EducationNav';
import { TeacherAccountMenu } from './TeacherAccountMenu';
import { TeacherBrand } from './TeacherBrand';
import type { ResolvedEducationNav } from './navItems';

/**
 * The one place the nav touches React context, so `EducationShell` stays
 * provider-free. Teachers get the brand + avatar menu in the sidebar (desktop)
 * and in a slim top bar (phone); students keep the page's own header.
 */
export function EducationShellNav({
  nav,
  variant,
}: {
  nav: ResolvedEducationNav;
  variant: 'tabs' | 'sidebar' | 'topbar';
}) {
  const { t } = useLanguage();
  const { hasPro, loading, known, status } = useTeacherPro();
  // Nothing is claimed until the entitlement read lands: no false "Free plan" for a paying teacher.
  const plan = nav.kind !== 'teacher' || loading || !known ? undefined : !hasPro ? 'free' : status === 'trialing' ? 'trial' : 'pro';
  const teacher = nav.kind === 'teacher' && nav.proHref && nav.profileHref;
  const home = `/${nav.locale}/${nav.kind}`;

  if (variant === 'topbar') {
    if (!teacher) return null;
    return (
      <div
        data-testid="teacher-topbar"
        className="flex shrink-0 items-center justify-between gap-3 border-b-[3px] border-neo-cream bg-neo-navy px-4 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] lg:hidden"
      >
        <TeacherBrand href={home} t={t} compact />
        <TeacherAccountMenu proHref={nav.proHref!} profileHref={nav.profileHref!} variant="icon" />
      </div>
    );
  }

  return (
    <EducationNav
      nav={nav}
      t={t}
      variant={variant}
      plan={plan}
      brand={teacher ? <TeacherBrand href={home} t={t} /> : undefined}
      account={
        teacher ? <TeacherAccountMenu proHref={nav.proHref!} profileHref={nav.profileHref!} /> : undefined
      }
    />
  );
}

export default EducationShellNav;
