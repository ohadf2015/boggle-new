'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { COSMETICS } from '@/lib/cosmetics';
import AvatarRenderer from '@/components/avatar/AvatarRenderer';
import { CoinArt } from '@/components/ui/CoinArt';
import { RARITY_TOKENS } from '@/lib/avatar/rarity';
import { REVEAL_CATEGORY_KEY, applyUnlockToConfig, revealPartNameKey } from '@/lib/avatar/revealTrigger';
import { chestPartUnlock } from '@/backend/modules/classroomEconomyPool';
import type { ClassroomChestReveal } from '@/shared/constants/classroomEconomy';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import { XpIcon, type RewardChip } from '@/components/education/rewards/RewardChipRow';
import { chestArtSrc, chestRays } from './chestPhase';

/** Only what the server sent: the round's cash (skipped at 0), the chest's XP, and its item. */
export function useChestChips(reveal: ClassroomChestReveal, wearing: CustomAvatarConfig): RewardChip[] {
  const { t } = useLanguage();
  const unlock = chestPartUnlock(reveal.itemId);
  const legacyName = unlock ? undefined : COSMETICS.find((c) => c.id === reveal.itemId)?.name;
  const chips: RewardChip[] = [];

  if (reveal.roundCash > 0) {
    chips.push({
      id: 'cash',
      landing: true,
      icon: <CoinArt size={48} />,
      value: <span dir="ltr">{`+${reveal.roundCash}`}</span>,
      label: t('economy.chest.chip.cash'),
    });
  }
  chips.push({
    id: 'xp',
    icon: <XpIcon />,
    value: <span dir="ltr">{`+${reveal.xp}`}</span>,
    label: t('economy.chest.chip.xp'),
  });
  chips.push(
    unlock
      ? {
          id: 'item',
          icon: <AvatarRenderer config={applyUnlockToConfig(wearing, unlock)} size={56} />,
          value: <span className="text-base">{t(revealPartNameKey(unlock))}</span>,
          label: t(REVEAL_CATEGORY_KEY[unlock.category]),
          badge: t(RARITY_TOKENS[unlock.rarity].labelKey),
          badgeHex: RARITY_TOKENS[unlock.rarity].hex,
        }
      : {
          id: 'item',
          // eslint-disable-next-line @next/next/no-img-element -- pre-sized chest art
          icon: <img src={chestArtSrc(reveal.rarity, true)} alt="" className="h-12 w-12 object-contain" />,
          value: <span className="text-base">{legacyName ? t(legacyName) : t('economy.chest.chip.item')}</span>,
          label: t('economy.chest.chip.item'),
          badge: t(`economy.chest.rarity.${reveal.rarity}`),
          badgeHex: chestRays(reveal.rarity).hex,
        }
  );
  return chips;
}
