'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import useReducedMotion from '@/hooks/useReducedMotion';
import { useHeroCheer } from '@/lib/quickPlay/useHeroCheer';
import { getOrCreateStoredCustomAvatar } from '@/utils/profileStorage';
import { ResultsAvatarStage } from '@/components/results/stage/ResultsAvatarStage';

const MP_ACCENT = '#ff4d9a';

/** A one-row standings board says nothing; a lone player gets the avatar stage instead. */
export function MpSoloStage({ scored }: { scored: boolean }) {
  const { user, profile } = useAuth();
  const [guestAvatar] = useState(() => (user ? null : getOrCreateStoredCustomAvatar()));
  const animate = !useReducedMotion();
  const mood = useHeroCheer(scored, animate);
  return (
    <div data-testid="mp-solo-stage" className="relative flex min-h-0 flex-1 items-center justify-center">
      <ResultsAvatarStage
        avatar={{ userId: user?.id ?? 'guest', customAvatar: profile?.avatar_config ?? guestAvatar }}
        mood={mood}
        accentHex={MP_ACCENT}
        animate={animate}
        cheering={scored}
        confettiCount={10}
      />
    </div>
  );
}
