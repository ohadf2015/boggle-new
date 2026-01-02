'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

export interface Tab {
  id: string;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}

interface MobileTabBarProps {
  tabs: Tab[];
  activeTab: string | null;
  onTabChange: (tabId: string) => void;
  className?: string;
  /**
   * When true (default), the tab bar is fixed at the bottom of the screen.
   * Set to false for inline/embedded usage.
   */
  fixed?: boolean;
  /**
   * Whether to scroll to top when switching tabs. Defaults to true.
   */
  scrollToTopOnChange?: boolean;
}

/**
 * Mobile tab bar for switching between content panels.
 * By default, fixed at the bottom of the screen with Neo-Brutalist styling.
 *
 * @example
 * // Fixed at bottom (default) - no wrapper needed
 * <MobileTabBar
 *   tabs={[{ id: 'results', icon: <Trophy />, label: 'Results' }]}
 *   activeTab={activeTab}
 *   onTabChange={setActiveTab}
 * />
 *
 * @example
 * // Inline/embedded usage
 * <MobileTabBar
 *   tabs={tabs}
 *   activeTab={activeTab}
 *   onTabChange={setActiveTab}
 *   fixed={false}
 * />
 */
export function MobileTabBar({
  tabs,
  activeTab,
  onTabChange,
  className,
  fixed = true,
  scrollToTopOnChange = true,
}: MobileTabBarProps) {
  const tabBar = (
    <nav className={cn('mobile-tab-bar', !fixed && 'lg:hidden', className)}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => {
              onTabChange(isActive ? '' : tab.id);
              if (scrollToTopOnChange) {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
            className={cn(
              'flex flex-col items-center justify-center px-4 py-2 min-w-[64px]',
              'transition-all duration-100',
              isActive
                ? 'text-neo-yellow scale-110'
                : 'text-neo-white/70 hover:text-neo-white'
            )}
          >
            <div className="relative">
              <span className="text-xl">{tab.icon}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-2 bg-neo-pink text-neo-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center border-2 border-neo-black"
                >
                  {tab.badge > 99 ? '99+' : tab.badge}
                </motion.span>
              )}
            </div>
            <span className="text-xs font-bold uppercase tracking-wide mt-1">
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );

  if (fixed) {
    return (
      <div className="flex-shrink-0 fixed bottom-0 inset-x-0 z-[100] lg:hidden safe-area-bottom">
        {tabBar}
      </div>
    );
  }

  return tabBar;
}

export default MobileTabBar;
