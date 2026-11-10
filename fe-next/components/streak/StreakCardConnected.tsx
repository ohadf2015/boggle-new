'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/contexts/AuthContext';
import { useStreakView } from '@/hooks/useStreakView';
import { StreakCard } from './StreakCard';
import { StreakFreezeSheet } from './StreakFreezeSheet';

const StreakMilestoneReveal = dynamic(() => import('./StreakMilestoneReveal'), { ssr: false });
const AuthModal = dynamic(() => import('@/components/auth/AuthModal'), { ssr: false });

interface StreakCardConnectedProps {
  source: string;
  className?: string;
}

/** The streak card wired to the account: buy freezes, claim a ready reward. */
export function StreakCardConnected({ source, className }: StreakCardConnectedProps) {
  const view = useStreakView();
  // The coin counter reads profile.total_coins.
  const { refreshProfile } = useAuth();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  if (view.loading) {
    return <div aria-hidden="true" data-testid="streak-card-loading" className={`h-[260px] w-full rounded-neo-lg skeleton ${className ?? ''}`} />;
  }

  const claimable = view.milestone?.claimable ?? null;
  const afterChange = () => {
    view.refresh(true);
    void refreshProfile?.();
  };

  return (
    <>
      <StreakCard
        view={view}
        className={className}
        onOpenFreezes={() => setSheetOpen(true)}
        onClaim={claimable ? () => setClaiming(true) : undefined}
      />
      <StreakFreezeSheet
        open={sheetOpen}
        freezes={view.freezes}
        isGuest={view.isGuest}
        onSignIn={() => {
          setSheetOpen(false);
          setAuthOpen(true);
        }}
        onClose={() => setSheetOpen(false)}
        onBought={afterChange}
      />
      {claiming && claimable && (
        <StreakMilestoneReveal
          milestone={claimable}
          source={source}
          onClaimed={afterChange}
          onClose={() => setClaiming(false)}
        />
      )}
      {authOpen && <AuthModal isOpen onClose={() => setAuthOpen(false)} initialMode="signup" />}
    </>
  );
}

export default StreakCardConnected;
