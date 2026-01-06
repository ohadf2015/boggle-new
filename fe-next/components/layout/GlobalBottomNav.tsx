'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
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
 */
export function GlobalBottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { isInGame } = useNavigation();
  const { t, language } = useLanguage();

  // Don't render on desktop or during gameplay
  if (isInGame) {
    return null;
  }

  const tabs: NavTab[] = [
    {
      id: 'home',
      icon: <Gamepad2 className="w-6 h-6" />,
      labelKey: 'brain.nav.home',
      href: `/${language}`,
    },
    {
      id: 'brain',
      icon: <Brain className="w-6 h-6" />,
      labelKey: 'brain.nav.brain',
      href: `/${language}/brain`,
    },
    {
      id: 'profile',
      icon: <User className="w-6 h-6" />,
      labelKey: 'brain.nav.profile',
      href: `/${language}/profile`,
    },
  ];

  // Determine active tab from pathname
  const getActiveTab = (): 'home' | 'brain' | 'profile' => {
    if (pathname?.includes('/brain')) return 'brain';
    if (pathname?.includes('/profile')) return 'profile';
    return 'home';
  };

  const activeTab = getActiveTab();

  const handleNavigation = (tab: NavTab) => {
    router.push(tab.href);
  };

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
            <motion.button
              key={tab.id}
              onClick={() => handleNavigation(tab)}
              whileTap={{ scale: 0.95 }}
              className={cn(
                'flex flex-col items-center justify-center',
                'px-6 py-2 min-w-[72px]',
                'transition-all duration-150',
                isActive
                  ? 'text-neo-yellow'
                  : 'text-neo-white/60 hover:text-neo-white/80'
              )}
            >
              <motion.div
                className="relative"
                animate={isActive ? { scale: 1.1 } : { scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                {tab.icon}
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-neo-yellow rounded-full"
                    initial={false}
                  />
                )}
              </motion.div>
              <span className="text-[10px] font-bold uppercase tracking-wider mt-1">
                {t(tab.labelKey) || tab.id}
              </span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}

export default GlobalBottomNav;
