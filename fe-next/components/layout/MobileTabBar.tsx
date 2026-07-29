'use client';

import React from 'react';
import { m } from 'framer-motion';
import { cn } from '../../lib/utils';

interface Tab {
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
  /** Optional slot rendered at the trailing edge of the tab bar */
  endSlot?: React.ReactNode;
}

/**
 * Mobile tab bar for switching between content panels.
 * Fixed at the bottom of the screen with Neo-Brutalist styling.
 */
export function MobileTabBar({
  tabs,
  activeTab,
  onTabChange,
  className,
  endSlot,
}: MobileTabBarProps) {
  return (
    <nav className={cn('mobile-tab-bar md:hidden', className)}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => {
              onTabChange(isActive ? '' : tab.id);
              // Scroll to top when switching tabs
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={cn(
              'flex flex-col items-center justify-center px-4 py-2 min-w-[64px]',
              'transition-all duration-100',
              isActive
                ? 'text-neo-lime scale-110'
                : 'text-neo-white hover:text-neo-white'
            )}
          >
            <div className="relative">
              <span className="text-xl">{tab.icon}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <m.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-2 rtl:-right-auto rtl:-left-2 bg-neo-pink text-neo-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center border-2 border-neo-black"
                >
                  {tab.badge > 99 ? '99+' : tab.badge}
                </m.span>
              )}
            </div>
            <span className="text-xs font-bold uppercase tracking-wide mt-1">
              {tab.label}
            </span>
          </button>
        );
      })}
      {endSlot && (
        <div className="ms-auto flex items-center pe-2">
          {endSlot}
        </div>
      )}
    </nav>
  );
}

export default MobileTabBar;
