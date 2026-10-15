'use client';

/**
 * DEV-ONLY harness for the post-round classroom chest. Mounts RewardChest with a
 * fixture reveal so every rarity can be captured without a live round.
 * Route: /[locale]/dev/reward-chest?rarity=common|rare|epic&cash=18&rank=3&size=20&item=eyes:heartEye
 * (`item=legacy` uses an old cosmetic id; `rank=none` drops the placing line).
 * `surface=daily` mounts the daily chest; `surface=goal&cash=4` the between-round goal line.
 */

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import RewardChest from '@/components/education/economy/RewardChest';
import ShopGoalLine from '@/components/education/economy/ShopGoalLine';
import { DailyChest } from '@/components/student/academy/DailyChest';
import { useLanguage } from '@/contexts/LanguageContext';
import { DEFAULT_AVATAR_CONFIG } from '@/shared/types/customAvatar';
import { CHEST_RARITIES, type ChestRarity } from '@/shared/constants/classroomEconomy';

const ITEM: Record<ChestRarity, string> = { common: 'accessory:headphones', rare: 'accessory:headphones', epic: 'eyes:heartEye' };
const XP: Record<ChestRarity, number> = { common: 10, rare: 25, epic: 60 };

function RewardChestHarness() {
  const params = useSearchParams();
  const { t } = useLanguage();
  const [open, setOpen] = useState(true);
  if (process.env.NODE_ENV === 'production') return null;

  const surface = params.get('surface');
  if (surface === 'daily' || surface === 'goal') {
    return (
      <main className="flex min-h-screen flex-col items-center gap-6 bg-neo-navy p-6 text-white">
        {surface === 'daily' ? (
          <DailyChest userId="dev-harness" reducedMotion={false} onGranted={() => {}} size="md" />
        ) : (
          <div className="w-full max-w-sm">
            <ShopGoalLine cash={Number(params.get('cash') ?? 4)} />
          </div>
        )}
      </main>
    );
  }

  const raw = params.get('rarity');
  const rarity: ChestRarity = CHEST_RARITIES.includes(raw as ChestRarity) ? (raw as ChestRarity) : 'epic';
  const item = params.get('item');
  const rankParam = params.get('rank');
  const reveal = {
    gameCode: 'DEV',
    roundId: 'dev-1',
    rarity,
    xp: XP[rarity],
    itemId: item === 'legacy' ? 'tile-neon' : item || ITEM[rarity],
    roundCash: Number(params.get('cash') ?? 18),
    rank: rankParam === 'none' ? null : Number(rankParam ?? 3),
    size: Number(params.get('size') ?? 20),
  };

  return (
    <main className="min-h-screen bg-neo-navy p-6 text-white">
      <button type="button" data-testid="harness-open" onClick={() => setOpen(true)} className="rounded-xl border-2 border-black bg-neo-lime px-4 py-2 font-bold text-neo-navy">
        {t('economy.chest.open')}
      </button>
      {open && <RewardChest key={rarity} reveal={reveal} wearing={DEFAULT_AVATAR_CONFIG} onClose={() => setOpen(false)} />}
    </main>
  );
}

export default function RewardChestHarnessPage() {
  return (
    <Suspense fallback={null}>
      <RewardChestHarness />
    </Suspense>
  );
}
