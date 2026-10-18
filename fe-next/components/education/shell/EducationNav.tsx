'use client';

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  BookOpen,
  Check,
  ChevronRight,
  Crown,
  Dumbbell,
  Home,
  Library,
  Play,
  Trophy,
  User,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import type { EducationNavItem, ResolvedEducationNav } from './navItems';

/**
 * Phone/tablet bottom tabs and the desktop sidebar — one component, two
 * variants, switched by CSS at `lg` (never a JS viewport read, which flashes the
 * wrong layout for a frame). Neither is `position: fixed`: both are flex
 * children of the shell, so the scroll region shrinks by exactly the nav size
 * instead of hiding its last row under a fixed bar.
 * Widths are written `border-[2px]`: twMerge drops `border-neo` beside a colour.
 */

const ICONS = {
  home: Home,
  play: Play,
  book: BookOpen,
  library: Library,
  chart: BarChart3,
  user: User,
  trophy: Trophy,
  dumbbell: Dumbbell,
  users: Users,
} as const;

export interface EducationNavProps {
  nav: ResolvedEducationNav;
  /** Passed in so this file stays free of context and unit-tests bare. */
  t: (key: string, fallback?: string) => string;
  variant: 'tabs' | 'sidebar';
  /** Sidebar only: the brand lockup at the top. */
  brand?: ReactNode;
  /** Sidebar only: the avatar/account menu under the Pro link. */
  account?: ReactNode;
  /** Sidebar only: the teacher's plan, so the Pro link states it. Unknown (undefined) = plain link. */
  plan?: 'free' | 'pro' | 'trial';
  className?: string;
}

const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy';

function tabClasses(active: boolean) {
  return cn(
    'relative z-10 flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-neo px-1 pb-1 pt-1.5',
    'font-neo-display text-[11px] font-bold transition-[color,transform] duration-150 ease-out active:scale-[0.97]',
    FOCUS,
    active ? 'text-neo-lime' : 'text-neo-cream/70 [@media(hover:hover)]:hover:text-neo-cream',
  );
}

// Survives the shell remount on every tab tap, so the pill can slide from where it was.
let lastTabIndex: number | null = null;

function TabIndicator({ index, count }: { index: number; count: number }) {
  const [shown, setShown] = useState(() => lastTabIndex ?? index);
  useEffect(() => {
    lastTabIndex = index;
    const raf = requestAnimationFrame(() => setShown(index));
    return () => cancelAnimationFrame(raf);
  }, [index]);
  return (
    <div
      aria-hidden
      data-testid="education-tab-indicator-track"
      style={{ '--tab-i': String(shown), '--tab-n': String(count) } as CSSProperties}
      className={cn(
        'pointer-events-none absolute start-2 top-2 flex h-8 w-[calc((100%-1rem)/var(--tab-n))] justify-center',
        'translate-x-[calc(var(--tab-i)*100%)] rtl:translate-x-[calc(var(--tab-i)*-100%)]',
        'transition-[translate] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none',
      )}
    >
      <span
        data-testid="education-tab-indicator"
        className="h-8 w-14 rounded-full border-[2px] border-neo-lime bg-neo-lime/15 shadow-hard-sm"
      />
    </div>
  );
}

function sideClasses(active: boolean) {
  return cn(
    'flex min-h-[44px] w-full items-center gap-3 rounded-neo px-3 py-2 font-neo-display text-[15px] font-bold',
    'transition-[colors,transform] duration-150 active:scale-[0.97]',
    FOCUS,
    active
      ? 'border-[2px] border-neo-lime bg-neo-lime/15 text-neo-lime shadow-hard-sm'
      : 'border-[2px] border-transparent text-neo-cream hover:bg-neo-navy-light',
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
      className={variant === 'tabs' ? tabClasses(active) : sideClasses(active)}
    >
      <Icon
        className={cn(
          'h-5 w-5 shrink-0',
          variant === 'tabs' && 'mt-1.5 mb-1.5 transition-transform duration-200 ease-out',
          variant === 'tabs' && active && 'scale-110',
        )}
        strokeWidth={variant === 'tabs' && active ? 2.5 : 2}
        aria-hidden
      />
      <span
        data-testid={variant === 'sidebar' ? `education-side-label-${item.key}` : undefined}
        className="truncate"
      >
        {t(item.labelKey)}
      </span>
    </Link>
  );
}

export function EducationNav({ nav, t, variant, brand, account, plan, className }: EducationNavProps) {
  const links = nav.items.map((item) => (
    <NavLink key={item.key} item={item} active={item.key === nav.activeKey} variant={variant} t={t} />
  ));

  if (variant === 'sidebar') {
    return (
      <nav
        data-testid="education-sidebar"
        aria-label={t('teacher.nav.sidebarLabel')}
        className={cn(
          // Desktop only (`lg` = 1024); short enough never to scroll.
          'hidden shrink-0 lg:flex w-60 flex-col gap-1.5 overflow-hidden',
          'border-e-[3px] border-neo-cream bg-neo-navy px-3 py-4',
          className,
        )}
      >
        {brand ? <div className="mb-4 px-1">{brand}</div> : null}
        {links}
        <div className="mt-auto flex flex-col gap-2 border-t-[2px] border-neo-cream/15 pt-3">
          {nav.proHref ? (
            <Link
              href={nav.proHref}
              data-testid="education-side-pro"
              className={cn(
                'group flex min-h-[44px] w-full items-center gap-3 rounded-neo px-3 py-2',
                'font-neo-display text-[15px] font-bold text-neo-yellow transition-[colors,transform] duration-150',
                'hover:bg-neo-yellow/10 active:scale-[0.97]',
                FOCUS,
              )}
            >
              <Crown className="h-5 w-5 shrink-0" aria-hidden />
              <span className="flex-1 truncate">{t(plan === 'free' ? 'teacher.plan.free' : 'eduShell.nav.pro')}</span>
              {plan === 'free' || plan === 'trial' ? (
                <span
                  data-testid="education-side-pro-pill"
                  className="shrink-0 rounded-neo border-[2px] border-neo-lime px-2 py-0.5 text-xs font-black text-neo-lime"
                >
                  {t(plan === 'free' ? 'teacher.plan.upgrade' : 'teacher.plan.trialActive')}
                </span>
              ) : plan === 'pro' ? (
                <span
                  data-testid="education-side-pro-pill"
                  aria-label={t('teacher.plan.pro')}
                  className="grid size-5 shrink-0 place-items-center rounded-full bg-neo-lime text-neo-black"
                >
                  <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
                </span>
              ) : null}
              <DirectionalIcon icon={ChevronRight} className="h-4 w-4 shrink-0" />
            </Link>
          ) : null}
          {account}
        </div>
      </nav>
    );
  }

  const activeIndex = nav.items.findIndex((item) => item.key === nav.activeKey);
  return (
    <nav
      data-testid="education-tabbar"
      aria-label={t('teacher.nav.tabsLabel')}
      style={{ gridTemplateColumns: `repeat(${nav.items.length}, minmax(0, 1fr))` }}
      className={cn(
        // Hidden the instant the sidebar arrives (lg): never carry both.
        'relative shrink-0 lg:hidden grid',
        'border-t-[3px] border-neo-cream bg-neo-navy px-2 pt-1',
        'pb-[max(0.25rem,env(safe-area-inset-bottom))]',
        className,
      )}
    >
      {activeIndex >= 0 ? <TabIndicator index={activeIndex} count={nav.items.length} /> : null}
      {links}
    </nav>
  );
}

export default EducationNav;
