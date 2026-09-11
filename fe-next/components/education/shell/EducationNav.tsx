'use client';

import Link from 'next/link';
import { BarChart3, BookOpen, Dumbbell, Play, Trophy, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EducationNavItem, ResolvedEducationNav } from './navItems';

/**
 * Phone bottom tabs and the desktop sidebar — one component, two variants,
 * switched by CSS breakpoint rather than by a JS viewport read. A JS branch
 * would pick a layout from a width that is wrong on the server and right one
 * frame later, which is the dual-source-of-truth flash this codebase keeps
 * re-learning (pitfall class 1).
 *
 * Neither variant is `position: fixed`. Both are laid out as flex children of
 * the shell, so the scroll region is shorter by exactly the nav's size. A fixed
 * bar leaves `scrollHeight === innerHeight` true while quietly parking the last
 * row of content underneath itself, unreachable — the shell's own no-scroll
 * assertion cannot see that, and a teacher's last class in the list is exactly
 * what would be hidden.
 *
 * Contrast: an inactive tab with no fill is the same shape as the devtools
 * button the sweep flags (`edgeRatio: 0`). So inactive tabs carry their own
 * `bg-neo-navy-light` fill plus a 2px cream edge (16.8:1 on navy), and the
 * active tab differs by FILL — `bg-neo-lime` with a BLACK label, because cream
 * on lime measures 1.2:1. Widths are written `border-[2px]` / `border-t-[3px]`:
 * twMerge folds `border-neo` into the same class group as `border-neo-<colour>`
 * and drops the width, leaving the control borderless under preflight.
 *
 * Motion: hover/active transitions only. Nothing here tweens opacity from 0 on
 * mount — a full-width bar doing that is the mobile flash of pitfall class 5.
 */

const ICONS = {
  play: Play,
  book: BookOpen,
  chart: BarChart3,
  user: User,
  trophy: Trophy,
  dumbbell: Dumbbell,
} as const;

export interface EducationNavProps {
  nav: ResolvedEducationNav;
  /** Passed in so this file stays free of context and unit-tests bare. */
  t: (key: string, fallback?: string) => string;
  variant: 'tabs' | 'sidebar';
  className?: string;
}

/** Active differs by fill; inactive is never a ghost. */
function itemClasses(active: boolean, variant: 'tabs' | 'sidebar') {
  return cn(
    'flex items-center justify-center gap-2 rounded-neo font-neo-display font-bold',
    'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan',
    variant === 'tabs'
      ? 'min-h-[52px] flex-1 flex-col gap-1 px-1 py-1.5 text-[11px]'
      : 'min-h-[48px] w-full justify-start px-3 py-2 text-[15px]',
    active
      ? 'border-[2px] border-neo-black bg-neo-lime text-neo-black shadow-hard-sm'
      : 'border-[2px] border-neo-cream bg-neo-navy-light text-neo-cream hover:bg-neo-cyan hover:text-neo-black',
  );
}

function NavLink({
  item,
  active,
  variant,
  t,
}: {
  item: EducationNavItem;
  active: boolean;
  variant: 'tabs' | 'sidebar';
  t: EducationNavProps['t'];
}) {
  const Icon = ICONS[item.icon];
  return (
    <Link
      href={item.href}
      data-testid={`education-${variant === 'tabs' ? 'tab' : 'side'}-${item.key}`}
      aria-current={active ? 'page' : undefined}
      className={itemClasses(active, variant)}
    >
      <Icon className={variant === 'tabs' ? 'h-5 w-5 shrink-0' : 'h-5 w-5 shrink-0'} aria-hidden />
      {/* An icon alone is not a label — every tab says what it is. */}
      <span className="truncate">{t(item.labelKey)}</span>
    </Link>
  );
}

export function EducationNav({ nav, t, variant, className }: EducationNavProps) {
  const links = nav.items.map((item) => (
    <NavLink key={item.key} item={item} active={item.key === nav.activeKey} variant={variant} t={t} />
  ));

  if (variant === 'sidebar') {
    return (
      <nav
        data-testid="education-sidebar"
        aria-label={t('teacher.nav.sidebarLabel')}
        className={cn(
          // Desktop only, and short enough that it never becomes a second
          // scroller — the shell contract is exactly one.
          'hidden shrink-0 lg:flex w-60 flex-col gap-2 overflow-hidden',
          'border-e-[3px] border-neo-cream bg-neo-navy px-3 py-4',
          className,
        )}
      >
        {links}
      </nav>
    );
  }

  return (
    <nav
      data-testid="education-tabbar"
      aria-label={t('teacher.nav.tabsLabel')}
      className={cn(
        'shrink-0 lg:hidden flex items-stretch gap-1.5',
        'border-t-[3px] border-neo-cream bg-neo-navy px-2 pt-2',
        'pb-[max(0.5rem,env(safe-area-inset-bottom))]',
        className,
      )}
    >
      {links}
    </nav>
  );
}

export default EducationNav;
