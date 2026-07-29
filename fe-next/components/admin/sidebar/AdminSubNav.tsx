'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { useRef, useEffect } from 'react';
import {
  ADMIN_BUCKET_CHILDREN,
  getActiveAdminTab,
  type AdminNavLeaf,
} from '@/lib/admin/adminNav';
import { getAdminNavIcon } from './adminNavIcons';

// Overflow sub-pages (System currently has Web Vitals as its only child).
const SYSTEM_ITEMS: AdminNavLeaf[] = [
  { key: 'web-vitals', labelKey: 'admin.nav.webVitals', iconKey: 'Activity', defaultPath: '/web-vitals' },
];

/**
 * Horizontal scrollable sub-navigation for admin buckets that have children.
 * Mobile only (sm:hidden), sits below the page header. Driven by the shared
 * ADMIN_BUCKET_CHILDREN so it never drifts from the sidebar/bottom-nav IA.
 */
export function AdminSubNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { t, language } = useLanguage();
  const scrollRef = useRef<HTMLDivElement>(null);

  const basePath = `/${language}/admin`;
  const cleanPath = pathname.startsWith(basePath)
    ? pathname.slice(basePath.length)
    : pathname;

  const activeTab = getActiveAdminTab(cleanPath);

  // Resolve which leaf set to show.
  let items: AdminNavLeaf[] | null = null;
  if (activeTab && ADMIN_BUCKET_CHILDREN[activeTab]) {
    items = ADMIN_BUCKET_CHILDREN[activeTab];
  } else if (
    cleanPath === '/system' ||
    cleanPath.startsWith('/system/') ||
    cleanPath === '/web-vitals'
  ) {
    items = SYSTEM_ITEMS;
  }

  const isActive = (itemPath: string) =>
    cleanPath === itemPath || cleanPath.startsWith(itemPath + '/');

  // Auto-scroll active item into view.
  useEffect(() => {
    if (!scrollRef.current || !items) return;
    const active = scrollRef.current.querySelector('[data-active="true"]');
    if (active) {
      active.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [pathname, items]);

  if (!items) return null;

  return (
    <div className="sm:hidden bg-neo-navy/80 border-b border-slate-700/50 sticky top-0 z-30">
      <div
        ref={scrollRef}
        className="flex gap-1.5 px-3 py-2 overflow-x-auto scrollbar-hide"
      >
        {items.map((item) => {
          const Icon = getAdminNavIcon(item.iconKey);
          const active = isActive(item.defaultPath);
          return (
            <button
              key={item.key}
              data-active={active}
              onClick={() => router.push(`${basePath}${item.defaultPath}`)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors shrink-0',
                active
                  ? 'bg-neo-lime/20 text-neo-lime border border-neo-lime/40'
                  : 'bg-neo-navy-light text-slate-400 border border-slate-700 active:bg-neo-navy-elevated',
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {t(item.labelKey)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
