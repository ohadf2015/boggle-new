'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import {
  ADMIN_PRIMARY_TABS,
  ADMIN_OVERFLOW_ITEMS,
  ADMIN_BUCKET_CHILDREN,
  getActiveAdminTab,
} from '@/lib/admin/adminNav';
import { getAdminNavIcon } from './adminNavIcons';

interface AdminSidebarProps {
  moderationCount?: number;
}

/**
 * Desktop admin sidebar. Two-level IA: 4 primary buckets, the active bucket
 * expands its leaf children inline, plus an overflow group (Analytics /
 * System / Web Vitals / Exit) rendered directly since desktop has the room.
 * Shares config + active-route resolution with AdminBottomNav (no drift).
 */
export function AdminSidebar({ moderationCount = 0 }: AdminSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { t, language } = useLanguage();

  const basePath = `/${language}/admin`;
  const cleanPath = pathname.startsWith(basePath)
    ? pathname.slice(basePath.length)
    : pathname;
  const activeKey = getActiveAdminTab(cleanPath);

  function go(path: string) {
    router.push(`${basePath}${path}`);
  }

  function isChildActive(childPath: string): boolean {
    return cleanPath === childPath || cleanPath.startsWith(childPath + '/');
  }

  // Primary buckets only (the mobile-only "more" affordance is dropped here).
  const buckets = ADMIN_PRIMARY_TABS.filter((t) => !t.isOverflow);

  return (
    <nav
      className={cn(
        'flex flex-col gap-1 py-4 px-2',
        'w-56 shrink-0',
        'border-e border-slate-700/50',
        'bg-neo-navy/50',
        'md:w-56 sm:w-14',
        'hidden sm:flex',
      )}
      aria-label="Admin navigation"
    >
      {buckets.map((bucket) => {
        const Icon = getAdminNavIcon(bucket.iconKey);
        const active = activeKey === bucket.key;
        const badge = bucket.badge === 'moderation' ? moderationCount : 0;
        const children = ADMIN_BUCKET_CHILDREN[bucket.key];

        return (
          <div key={bucket.key} className="flex flex-col">
            <button
              type="button"
              onClick={() => go(bucket.defaultPath)}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-neo text-sm font-medium transition-colors',
                'hover:bg-neo-navy-light hover:text-neo-white',
                'focus-visible:outline-2 focus-visible:outline-neo-lime focus-visible:outline-offset-2',
                active
                  ? 'bg-neo-lime/10 text-neo-lime border border-neo-lime/20'
                  : 'text-slate-400 border border-transparent',
              )}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span className="truncate hidden md:inline">{t(bucket.labelKey)}</span>
              {badge > 0 ? (
                <span className="ms-auto bg-neo-pink text-neo-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center hidden md:inline">
                  {badge > 99 ? '99+' : badge}
                </span>
              ) : null}
            </button>

            {/* Inline children for the active bucket */}
            {active && children ? (
              <div className="hidden md:flex flex-col gap-0.5 ms-3 mt-0.5 ps-3 border-s border-slate-700/50">
                {children.map((child) => {
                  const ChildIcon = getAdminNavIcon(child.iconKey);
                  const childActive = isChildActive(child.defaultPath);
                  return (
                    <button
                      type="button"
                      key={child.key}
                      onClick={() => go(child.defaultPath)}
                      aria-current={childActive ? 'page' : undefined}
                      className={cn(
                        'flex items-center gap-2 px-2.5 py-1.5 rounded-neo text-xs font-medium transition-colors text-start',
                        childActive
                          ? 'text-neo-lime bg-neo-lime/5'
                          : 'text-slate-500 hover:text-slate-300',
                      )}
                    >
                      <ChildIcon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{t(child.labelKey)}</span>
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        );
      })}

      {/* Overflow group — desktop has room, no need to hide behind "More" */}
      <div className="mt-2 pt-2 border-t border-slate-700/50 flex flex-col gap-1">
        {ADMIN_OVERFLOW_ITEMS.map((item) => {
          const Icon = getAdminNavIcon(item.iconKey);
          const itemActive =
            item.defaultPath !== '' &&
            (cleanPath === item.defaultPath ||
              cleanPath.startsWith(item.defaultPath + '/'));
          return (
            <button
              type="button"
              key={item.key}
              onClick={() =>
                item.key === 'exit'
                  ? router.push(`/${language}`)
                  : go(item.defaultPath)
              }
              aria-current={itemActive ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-neo text-sm font-medium transition-colors',
                'hover:bg-neo-navy-light hover:text-neo-white',
                item.key === 'exit'
                  ? 'text-neo-pink/80'
                  : itemActive
                    ? 'bg-neo-lime/10 text-neo-lime border border-neo-lime/20'
                    : 'text-slate-400 border border-transparent',
              )}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span className="truncate hidden md:inline">{t(item.labelKey)}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
