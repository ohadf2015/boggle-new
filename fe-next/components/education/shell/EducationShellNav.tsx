'use client';

import Link from 'next/link';
import { Crown } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { ProBadge } from '@/components/ui/ProBadge';
import { EducationNav, type TeacherPlan } from './EducationNav';
import { TeacherAccountMenu } from './TeacherAccountMenu';
import { TeacherBrand } from './TeacherBrand';
import { cn } from '@/lib/utils';
import type { ResolvedEducationNav } from './navItems';

const CHIP_LABEL: Record<TeacherPlan, string> = {
  free: 'teacher.plan.upgrade',
  trial: 'teacher.plan.trialActive',
  pro: 'teacher.plan.pro',
};

/** Phone/tablet plan indicator; on desktop the account row and sidebar carry it. */
function TeacherPlanChip({ plan, href, t }: { plan: TeacherPlan; href: string; t: (key: string) => string }) {
  return (
    <Link
      href={href}
      data-testid="teacher-plan-chip"
      className={cn(
        'flex min-h-[44px] min-w-0 items-center',
        'transition-transform duration-150 active:scale-[0.97]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy',
      )}
    >
      {plan === 'pro' ? (
        <ProBadge size="sm" label={t(CHIP_LABEL.pro)} />
      ) : (
        <span className="inline-flex min-w-0 items-center gap-1 rounded-neo-pill border-2 border-neo-cream/40 px-2.5 py-1 font-neo-display text-sm font-bold text-neo-cream">
          <Crown className="size-4 shrink-0 text-neo-yellow" aria-hidden="true" />
          <span className="truncate">{t(CHIP_LABEL[plan])}</span>
        </span>
      )}
    </Link>
  );
}

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
  const plan: TeacherPlan | undefined = nav.kind !== 'teacher' || loading || !known ? undefined : !hasPro ? 'free' : status === 'trialing' ? 'trial' : 'pro';
  const teacher = nav.kind === 'teacher' && nav.proHref && nav.profileHref;
  const home = `/${nav.locale}/${nav.kind}`;

  if (variant === 'topbar') {
    if (!teacher) return null;
    return (
      <div
        data-testid="teacher-topbar"
        className="flex shrink-0 items-center justify-between gap-3 border-b-[3px] border-neo-cream bg-neo-navy px-4 py-2 lg:hidden"
      >
        <TeacherBrand href={home} t={t} compact />
        <div className="flex min-w-0 items-center gap-1">
          {plan ? <TeacherPlanChip plan={plan} href={nav.proHref!} t={t} /> : null}
          <TeacherAccountMenu proHref={nav.proHref!} profileHref={nav.profileHref!} variant="icon" />
        </div>
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
        teacher ? <TeacherAccountMenu proHref={nav.proHref!} profileHref={nav.profileHref!} plan={plan} /> : undefined
      }
    />
  );
}

export default EducationShellNav;
