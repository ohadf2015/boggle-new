'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  BarChart3,
  ShieldAlert,
  BookOpen,
  Users,
  Settings,
} from 'lucide-react';

interface NavItem {
  key: string;
  labelKey: string;
  icon: React.ElementType;
  path: string;
  badge?: number;
}

interface AdminSidebarProps {
  moderationCount?: number;
}

export function AdminSidebar({ moderationCount = 0 }: AdminSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { t, language } = useLanguage();

  const navItems: NavItem[] = [
    { key: 'overview', labelKey: 'admin.sidebar.overview', icon: LayoutDashboard, path: '' },
    { key: 'analytics', labelKey: 'admin.sidebar.analytics', icon: BarChart3, path: '/analytics' },
    { key: 'moderation', labelKey: 'admin.sidebar.moderation', icon: ShieldAlert, path: '/moderation', badge: moderationCount },
    { key: 'content', labelKey: 'admin.sidebar.content', icon: BookOpen, path: '/content' },
    { key: 'players', labelKey: 'admin.sidebar.players', icon: Users, path: '/players' },
    { key: 'teacherAccess', labelKey: 'admin.nav.teacherAccess', icon: Users, path: '/teacher-access' },
    { key: 'system', labelKey: 'admin.sidebar.system', icon: Settings, path: '/system' },
  ];

  const basePath = `/${language}/admin`;

  function isActive(item: NavItem): boolean {
    const fullPath = `${basePath}${item.path}`;
    if (item.path === '') {
      return pathname === basePath || pathname === `${basePath}/`;
    }
    return pathname.startsWith(fullPath);
  }

  return (
    <nav
      className={cn(
        'flex flex-col gap-1 py-4 px-2',
        'w-56 shrink-0',
        'border-e border-slate-700/50',
        'bg-neo-navy/50',
        // Tablet: icon-only
        'md:w-56 sm:w-14',
        // Mobile: hidden (use bottom tabs via AdminBottomNav)
        'hidden sm:flex'
      )}
      aria-label="Admin navigation"
    >
      {navItems.map((item) => {
        const active = isActive(item);
        const Icon = item.icon;

        return (
          <button
            key={item.key}
            onClick={() => router.push(`${basePath}${item.path}`)}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-neo text-sm font-medium transition-colors',
              'hover:bg-neo-navy-light hover:text-neo-white',
              'focus-visible:outline-2 focus-visible:outline-neo-lime focus-visible:outline-offset-2',
              active
                ? 'bg-neo-lime/10 text-neo-lime border border-neo-lime/20'
                : 'text-slate-400 border border-transparent'
            )}
          >
            <Icon className="w-5 h-5 shrink-0" />
            <span className="truncate hidden md:inline">{t(item.labelKey)}</span>

            {/* Moderation badge */}
            {item.badge && item.badge > 0 ? (
              <span className="ms-auto bg-neo-pink text-neo-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center hidden md:inline">
                {item.badge > 99 ? '99+' : item.badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}
