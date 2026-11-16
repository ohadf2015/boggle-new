'use client';

import { createContext, useContext, useState } from 'react';
import dynamic from 'next/dynamic';
import { UserPlus } from 'lucide-react';
import posthog from '@/lib/analytics/lazyPosthog';
import { useFriendStatus } from '@/components/friends/FriendStatusContext';
import { FriendQuickAction } from '@/components/friends/FriendQuickAction';
import { useSocialCapabilities } from '@/hooks/useSocialCapabilities';

const AuthModal = dynamic(() => import('@/components/auth/AuthModal'), { ssr: false });

type TFn = (key: string, params?: Record<string, string | number>) => string;

// Off unless the results screen opts in: classroom students are guests, and must not be nudged to friend classmates.
const GuestAddPromptContext = createContext(false);
export const MpGuestAddPromptProvider = GuestAddPromptContext.Provider;

export function MpRowFriendAction({ userId, name, surface, t }: { userId?: string; name: string; surface: string; t: TFn }) {
  const ctx = useFriendStatus();
  const allowed = useContext(GuestAddPromptContext);
  if (!ctx) return null;
  if (ctx.isAuthenticated) return <FriendQuickAction userId={userId} name={name} surface={surface} />;
  if (!allowed || !userId) return null;
  return <GuestAddChip surface={surface} t={t} />;
}

function GuestAddChip({ surface, t }: { surface: string; t: TFn }) {
  const { tier } = useSocialCapabilities();
  const [authOpen, setAuthOpen] = useState(false);
  if (tier === 'child') return null;
  return (
    <>
      <button
        type="button"
        data-testid="mp-guest-add"
        onClick={(e) => {
          e.stopPropagation();
          posthog.capture('guest_add_friend_prompt_tapped', { surface });
          setAuthOpen(true);
        }}
        className="shrink-0 inline-flex items-center gap-1 h-9 px-2 rounded-neo border-2 border-neo-black bg-neo-cream text-neo-black font-neo-display text-[11px] font-bold uppercase shadow-hard-sm active:translate-y-0.5 active:shadow-none"
      >
        <UserPlus aria-hidden="true" className="w-4 h-4" />
        {t('brag2.mp.signInToAdd')}
      </button>
      {authOpen && <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} initialMode="signup" />}
    </>
  );
}
