'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import {
  Home,
  LayoutDashboard,
  BarChart3,
  ShieldAlert,
  BookOpen,
  Users,
  GraduationCap,
  Settings,
} from 'lucide-react';

interface AdminBottomNavProps {
  moderationCount?: number;
}

/**
 * Mobile bottom tab bar for admin pages.
 * Mirrors AdminSidebar sections as compact bottom tabs.
 */
export function AdminBottomNav({ moderationCount = 0 }: AdminBottomNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { t, language } = useLanguage();

  const basePath = `/${language}/admin`;

  const tabs: Array<{
    key: string;
    icon: typeof Home;
    label: string;
    path: string;
    isHome?: boolean;
    badge?: number;
  }> = [
    { key: 'home', icon: Home, label: t('nav.home'), path: '', isHome: true },
    { key: 'overview', icon: LayoutDashboard, label: t('admin.sidebar.overview'), path: '' },
    { key: 'analytics', icon: BarChart3, label: t('admin.sidebar.analytics'), path: '/analytics' },
    { key: 'moderation', icon: ShieldAlert, label: t('admin.sidebar.moderation'), path: '/moderation', badge: moderationCount },
    { key: 'content', icon: BookOpen, label: t('admin.sidebar.content'), path: '/content' },
    { key: 'players', icon: Users, label: t('admin.sidebar.players'), path: '/players' },
    { key: 'teacherAccess', icon: GraduationCap, label: t('admin.nav.teacherAccess', 'Teachers'), path: '/teacher-access' },
    { key: 'system', icon: Settings, label: t('admin.sidebar.system'), path: '/system' },
  ];

  function isActive(tab: { path: string; isHome?: boolean }): boolean {
    if (tab.isHome) return false;
    const fullPath = `${basePath}${tab.path}`;
    if (tab.path === '') return pathname === basePath || pathname === `${basePath}/`;
    return pathname.startsWith(fullPath);
  }

  return (
    <nav
      className="sm:hidden fixed bottom-0 inset-x-0 z-50 bg-neo-navy border-t border-slate-700/50 safe-area-pb"
      aria-label="Admin navigation"
    >
      <div className="flex justify-around">
        {tabs.map((tab) => {
          const active = isActive(tab);
          const Icon = tab.icon;

          return (
            <button
              key={tab.key}
              onClick={() => router.push(tab.isHome ? `/${language}` : `${basePath}${tab.path}`)}
              className={cn(
                'flex flex-col items-center gap-0.5 py-2 px-1 flex-1 text-xs transition-colors',
                active ? 'text-neo-lime' : 'text-slate-500'
              )}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {tab.badge && tab.badge > 0 ? (
                  <span className="absolute -top-1 -inset-e-1.5 bg-neo-pink text-neo-white text-[10px] font-bold px-1 rounded-full min-w-[14px] text-center leading-tight">
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                ) : null}
              </div>
              <span className="truncate max-w-[56px]">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
