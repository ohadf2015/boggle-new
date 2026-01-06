'use client';

import React, { memo, useMemo, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Gamepad2, Brain, User } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useNavigation } from '../../contexts/NavigationContext';
import { useLanguage } from '../../contexts/LanguageContext';

interface NavTab {
  id: 'home' | 'brain' | 'profile';
  icon: React.ReactNode;
  labelKey: string;
  href: string;
}

/**
 * Global Bottom Navigation for mobile devices.
 * Fixed at the bottom of the screen, hidden during active gameplay.
 * Provides navigation between Home, Brain Training, and Profile.
 * Memoized to prevent unnecessary re-renders.
 */
export const GlobalBottomNav = memo(function GlobalBottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { isInGame } = useNavigation();
  const { t, language } = useLanguage();

  // Memoize tabs to prevent recreation on every render
  const tabs: NavTab[] = useMemo(() => [
    {
      id: 'home' as const,
      icon: <Gamepad2 className="w-6 h-6" />,
      labelKey: 'brain.nav.home',
      href: `/${language}`,
    },
    {
      id: 'brain' as const,
      icon: <Brain className="w-6 h-6" />,
      labelKey: 'brain.nav.brain',
      href: `/${language}/brain`,
    },
    {
      id: 'profile' as const,
      icon: <User className="w-6 h-6" />,
      labelKey: 'brain.nav.profile',
      href: `/${language}/profile`,
    },
  ], [language]);

  // Determine active tab from pathname - memoized
  const activeTab = useMemo((): 'home' | 'brain' | 'profile' => {
    if (pathname?.includes('/brain')) return 'brain';
    if (pathname?.includes('/profile')) return 'profile';
    return 'home';
  }, [pathname]);

  // Memoize navigation handler
  const handleNavigation = useCallback((tab: NavTab) => {
    router.push(tab.href);
  }, [router]);

  // Don't render on desktop or during gameplay
  if (isInGame) {
    return null;
  }

  return (
    <nav
      className={cn(
        'fixed bottom-0 inset-x-0 z-50',
        'bg-neo-navy/95 backdrop-blur-sm',
        'border-t-4 border-neo-black',
        'pb-[env(safe-area-inset-bottom)]',
        'lg:hidden' // Hide on desktop
      )}
    >
      <div className="flex items-center justify-around h-16">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => handleNavigation(tab)}
              className={cn(
                'flex flex-col items-center justify-center',
                'px-6 py-2 min-w-[72px]',
                'transition-all duration-150',
                'active:scale-95', // CSS-based tap animation (replaces whileTap)
                isActive
                  ? 'text-neo-yellow'
                  : 'text-neo-white/60 hover:text-neo-white/80'
              )}
            >
              <div
                className={cn(
                  'relative transition-transform duration-300 ease-out',
                  isActive ? 'scale-110' : 'scale-100'
                )}
              >
                {tab.icon}
                {isActive && (
                  <div
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-neo-yellow rounded-full"
                  />
                )}
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider mt-1">
                {t(tab.labelKey) || tab.id}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
});

GlobalBottomNav.displayName = 'GlobalBottomNav';

export default GlobalBottomNav;
