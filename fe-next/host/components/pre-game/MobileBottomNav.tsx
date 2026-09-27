'use client';

import React, { memo } from 'react';
import { Users, MessageSquare } from 'lucide-react';
import { cn } from '../../../lib/utils';

// ==================== Types ====================

export type MobileTab = 'lobby' | 'chat';

// ==================== Props ====================

interface MobileBottomNavProps {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
  playerCount: number;
  unreadChatCount: number;
  t: (path: string, params?: Record<string, string | number>) => string;
}

// ==================== Component ====================

export const MobileBottomNav = memo<MobileBottomNavProps>(function MobileBottomNav({
  activeTab,
  onTabChange,
  playerCount,
  unreadChatCount,
  t,
}) {
  return (
    <nav className="shrink-0 bg-neo-navy/98 border-t border-neo-black/50 pb-[env(safe-area-inset-bottom)] lg:hidden relative z-75">
      <div className="flex items-center h-12">
        {/* Lobby Tab */}
        <button
          type="button"
          onClick={() => onTabChange('lobby')}
          className={cn(
            'flex-1 flex flex-col items-center justify-center h-full transition-all',
            activeTab === 'lobby'
              ? 'text-neo-yellow bg-neo-navy-light/50'
              : 'text-neo-white/60'
          )}
        >
          <div className="relative">
            <Users className="w-5 h-5" />
            {playerCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-neo-pink text-neo-white text-[8px] font-bold rounded-full min-w-[12px] h-[12px] flex items-center justify-center border border-neo-black">
                {playerCount > 9 ? '9+' : playerCount}
              </span>
            )}
          </div>
          <span className="text-[9px] font-bold uppercase mt-0.5">
            {t('hostView.lobby')}
          </span>
        </button>

        {/* Chat Tab */}
        <button
          type="button"
          onClick={() => onTabChange('chat')}
          className={cn(
            'flex-1 flex flex-col items-center justify-center h-full transition-all',
            activeTab === 'chat'
              ? 'text-neo-yellow bg-neo-navy-light/50'
              : 'text-neo-white/60'
          )}
        >
          <div className="relative">
            <MessageSquare className="w-5 h-5" />
            {unreadChatCount > 0 && activeTab !== 'chat' && (
              <span className="absolute -top-1 -right-2 bg-neo-red text-neo-white text-[8px] font-bold rounded-full min-w-[12px] h-[12px] flex items-center justify-center border border-neo-black">
                {unreadChatCount > 9 ? '9+' : unreadChatCount}
              </span>
            )}
          </div>
          <span className="text-[9px] font-bold uppercase mt-0.5">
            {t('hostView.chat')}
          </span>
        </button>
      </div>
    </nav>
  );
});

export default MobileBottomNav;
