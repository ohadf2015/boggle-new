'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { EducationNav } from './EducationNav';
import type { ResolvedEducationNav } from './navItems';

/**
 * The one place the nav touches React context.
 *
 * `EducationShell` is deliberately provider-free so it can be unit-tested bare,
 * and `useLanguage()` throws outside its provider. Keeping the `t` lookup in a
 * child that the shell only mounts when a nav actually exists preserves both:
 * a screen with no tabs (a projector, a game, anything outside /teacher and
 * /student) never mounts this, so it never reaches for the context either.
 */
export function EducationShellNav({
  nav,
  variant,
}: {
  nav: ResolvedEducationNav;
  variant: 'tabs' | 'sidebar';
}) {
  const { t } = useLanguage();
  return <EducationNav nav={nav} t={t} variant={variant} />;
}

export default EducationShellNav;
