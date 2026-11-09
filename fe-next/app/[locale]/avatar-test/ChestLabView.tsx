'use client';

import { useEffect, useMemo, useState } from 'react';
import UnlockRevealOverlay from '@/components/avatar/reveal/UnlockRevealOverlay';
import WeeklyChestModal from '@/components/daily/WeeklyChestModal';
import { DayPrizeReveal } from '@/components/daily/prize/DayPrizeReveal';
import { CHEST_POOL, DUPLICATE_COINS, type ChestPartDrop, type ChestPartCategory } from '@/lib/avatar/chestDrops';
import { getPartRarity } from '@/lib/avatar/rarity';
import { chestDropToReveal } from '@/lib/avatar/chestReveal';
import { fixtureConfigForLevel } from './fixtures';

/**
 * Chest drops in the capture harness (2026-11):
 *   ?view=chest&box=day|weekly|reveal&part=hair:aurora&dup=1
 * `day` opens the real daily box; the claim answer is whatever the capture
 * script serves for /api/daily/*-clear/claim. `weekly` and `reveal` are fed
 * straight from the query.
 */
function dropFromKey(key: string, dup: boolean): ChestPartDrop {
  const fallback = CHEST_POOL.epic[0];
  const k = key.includes(':') ? key : fallback;
  const [category, partId] = [k.slice(0, k.indexOf(':')), k.slice(k.indexOf(':') + 1)];
  const r = getPartRarity(category, partId);
  const rarity = r === 'common' ? 'rare' : r;
  return { key: k, category: category as ChestPartCategory, partId, rarity, duplicate: dup, refundCoins: dup ? DUPLICATE_COINS[rarity] : 0 };
}

export function ChestView({ level }: { level: number }) {
  const [search, setSearch] = useState<string | null>(null);
  useEffect(() => { setSearch(window.location.search); }, []);
  const q = useMemo(() => new URLSearchParams(search ?? ''), [search]);
  if (search === null) return <div data-testid="avatar-lab-view-chest" />;
  const box = q.get('box') ?? 'weekly';
  const drop = dropFromKey(q.get('part') ?? '', q.get('dup') === '1');
  return (
    <div data-testid="avatar-lab-view-chest">
      {box === 'day' && <DayPrizeReveal kind="perfect" source="avatar_lab" onClose={() => {}} />}
      {box === 'weekly' && (
        <WeeklyChestModal chest={{ tier: 'gold', coins: 600, badgeId: 'badge_weekly_gold', labelKey: 'daily.weeklyChest.prize.dragonHoard', part: drop }} streak={7} onClose={() => {}} />
      )}
      {box === 'reveal' && (
        <UnlockRevealOverlay
          reveal={chestDropToReveal(drop, 'weekly_gold')}
          config={fixtureConfigForLevel(level)}
          isGuest={false}
          onEquip={async () => true}
          onSignUp={() => {}}
          onClose={() => {}}
        />
      )}
    </div>
  );
}
