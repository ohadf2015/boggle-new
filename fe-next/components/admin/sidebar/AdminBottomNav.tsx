'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import {
  ADMIN_PRIMARY_TABS,
  ADMIN_OVERFLOW_ITEMS,
  getActiveAdminTab,
} from '@/lib/admin/adminNav';
import { getAdminNavIcon } from './adminNavIcons';

interface AdminBottomNavProps {
  moderationCount?: number;
}

/**
 * Mobile bottom tab bar for admin pages.
 * Consolidated IA: 4 destination tabs (Overview / Content / Moderation /
 * People) + a "More" sheet for lower-frequency routes (Analytics / System /
 * Web Vitals) and the exit-to-site action. Shares its config + active-route
 * logic with AdminSidebar via lib/admin/adminNav (no drift).
 */
export function AdminBottomNav({ moderationCount = 0 }: AdminBottomNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { t, language } = useLanguage();
  const [sheetOpen, setSheetOpen] = useState(false);

  const basePath = `/${language}/admin`;
  const cleanPath = pathname.startsWith(basePath)
    ? pathname.slice(basePath.length)
    : pathname;
  const activeKey = getActiveAdminTab(cleanPath);

  function badgeFor(key: string): number {
    return key === 'moderation' ? moderationCount : 0;
  }

  function go(path: string) {
    router.push(`${basePath}${path}`);
  }

  function onOverflowClick(itemKey: string, path: string) {
    setSheetOpen(false);
    if (itemKey === 'exit') {
      router.push(`/${language}`);
      return;
    }
    go(path);
  }

  return (
    <>
      {/* More sheet */}
      {sheetOpen ? (
        <div
          className="sm:hidden fixed inset-0 z-50"
          role="dialog"
          aria-modal="true"
          aria-label={t('admin.sidebar.more')}
        >
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/60"
            onClick={() => setSheetOpen(false)}
          />
          <div className="absolute bottom-0 inset-x-0 bg-neo-navy border-t-2 border-neo-lime/30 rounded-t-neo p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] safe-area-pb">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-600" />
            <div className="grid grid-cols-2 gap-2">
              {ADMIN_OVERFLOW_ITEMS.map((item) => {
                const Icon = getAdminNavIcon(item.iconKey);
                return (
                  <button
                    type="button"
                    key={item.key}
                    onClick={() => onOverflowClick(item.key, item.defaultPath)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-3 rounded-neo text-sm font-medium',
                      'bg-neo-navy-light text-slate-300 active:bg-neo-navy-elevated',
                      'border border-slate-700',
                      item.key === 'exit' && 'text-neo-pink',
                    )}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    <span className="truncate">{t(item.labelKey)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      <nav
        className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-neo-navy border-t border-slate-700/50 safe-area-pb"
        aria-label="Admin navigation"
      >
        <div className="flex justify-around">
          {ADMIN_PRIMARY_TABS.map((tab) => {
            const Icon = getAdminNavIcon(tab.iconKey);
            const active = activeKey === tab.key;
            const badge = badgeFor(tab.badge ?? '');

            return (
              <button
                type="button"
                key={tab.key}
                onClick={() =>
                  tab.isOverflow ? setSheetOpen((v) => !v) : go(tab.defaultPath)
                }
                aria-current={active ? 'page' : undefined}
                aria-expanded={tab.isOverflow ? sheetOpen : undefined}
                className={cn(
                  'flex flex-col items-center gap-0.5 py-2 px-1 flex-1 text-xs transition-colors',
                  active ? 'text-neo-lime' : 'text-slate-500',
                )}
              >
                <div className="relative">
                  <Icon className="w-5 h-5" />
                  {badge > 0 ? (
                    <span className="absolute -top-1 -inset-e-1.5 bg-neo-pink text-neo-white text-[10px] font-bold px-1 rounded-full min-w-[14px] text-center leading-tight">
                      {badge > 99 ? '99+' : badge}
                    </span>
                  ) : null}
                </div>
                <span className="truncate max-w-[64px]">{t(tab.labelKey)}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
