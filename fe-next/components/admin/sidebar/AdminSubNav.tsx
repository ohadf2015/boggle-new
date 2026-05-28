'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import {
  BookOpen, AlertTriangle, BookCheck, Calendar, Globe, Database,
  Activity,
} from 'lucide-react';
import { useRef, useEffect } from 'react';

interface SubNavItem {
  key: string;
  icon: typeof BookOpen;
  labelKey: string;
  path: string;
}

const CONTENT_ITEMS: SubNavItem[] = [
  { key: 'dictionary', icon: BookOpen, labelKey: 'admin.nav.dictionary', path: '/dictionary' },
  { key: 'invalid-words', icon: AlertTriangle, labelKey: 'admin.nav.invalidWords', path: '/invalid-words' },
  { key: 'milog-words', icon: BookCheck, labelKey: 'admin.nav.milogWords', path: '/milog-words' },
  { key: 'words', icon: Calendar, labelKey: 'admin.nav.dailyChallenge', path: '/words' },
  { key: 'wikipedia-words', icon: Globe, labelKey: 'admin.nav.wikipediaWords', path: '/wikipedia-words' },
  { key: 'word-bank', icon: Database, labelKey: 'admin.nav.wordBank', path: '/word-bank' },
];

const SYSTEM_ITEMS: SubNavItem[] = [
  { key: 'web-vitals', icon: Activity, labelKey: 'admin.nav.webVitals', path: '/web-vitals' },
];

/**
 * Horizontal scrollable sub-navigation for admin sections with children.
 * Shows on mobile only (sm:hidden), sits below the page header.
 * Renders when inside /admin/content/* or /admin/system/* sub-pages.
 */
export function AdminSubNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { t, language } = useLanguage();
  const scrollRef = useRef<HTMLDivElement>(null);

  const basePath = `/${language}/admin`;
  const cleanPath = pathname.replace(basePath, '');

  // Determine which section we're in
  let items: SubNavItem[] | null = null;
  if (cleanPath.startsWith('/content') || CONTENT_ITEMS.some(i => cleanPath === i.path || cleanPath.startsWith(i.path + '/'))) {
    items = CONTENT_ITEMS;
  } else if (cleanPath.startsWith('/system') || SYSTEM_ITEMS.some(i => cleanPath === i.path || cleanPath.startsWith(i.path + '/'))) {
    items = SYSTEM_ITEMS;
  }

  // Auto-scroll active item into view
  useEffect(() => {
    if (!scrollRef.current || !items) return;
    const active = scrollRef.current.querySelector('[data-active="true"]');
    if (active) {
      active.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [pathname, items]);

  if (!items) return null;

  const isActive = (itemPath: string) => {
    return cleanPath === itemPath || cleanPath.startsWith(itemPath + '/');
  };

  return (
    <div className="sm:hidden bg-neo-navy/80 border-b border-slate-700/50 sticky top-0 z-40">
      <div
        ref={scrollRef}
        className="flex gap-1.5 px-3 py-2 overflow-x-auto scrollbar-hide"
      >
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <button
              key={item.key}
              data-active={active}
              onClick={() => router.push(`${basePath}${item.path}`)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors shrink-0',
                active
                  ? 'bg-neo-lime/20 text-neo-lime border border-neo-lime/40'
                  : 'bg-neo-navy-light text-slate-400 border border-slate-700 active:bg-neo-navy-elevated'
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
