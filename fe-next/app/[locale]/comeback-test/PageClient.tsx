'use client';

import { useState } from 'react';
import { ComebackBonusModal } from '@/components/engagement/ComebackBonusModal';
import type { ComebackTier } from '@/shared/types/engagement';

const MOCK_TIER: ComebackTier = {
  xpMultiplier: 2.5,
  durationHours: 24,
  hints: 3,
  streakFreezes: 1,
  title: 'Comeback King',
  message: 'Welcome back!',
};

export default function ComebackTestPageClient() {
  const [open, setOpen] = useState(true);

  return (
    <div className="min-h-screen bg-neo-navy flex items-center justify-center">
      <button type="button"
        onClick={() => setOpen(true)}
        className="px-6 py-3 bg-neo-lime text-neo-navy font-bold rounded-neo border-neo border-black shadow-hard"
      >
        Open Comeback Modal
      </button>
      <ComebackBonusModal
        isOpen={open}
        daysAway={7}
        tier={MOCK_TIER}
        playerName="WordMaster42"
        onClose={() => setOpen(false)}
        onClaimed={() => setOpen(false)}
      />
    </div>
  );
}
