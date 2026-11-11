'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { revealPartNameKey } from '@/lib/avatar/revealTrigger';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import { LockedUnlockThumb } from './LockedUnlockThumb';
import { RarityChip } from './RarityChip';
import { getUpcomingUnlocks } from './nextUnlockModel';

export interface UpNextRailProps {
  level: number | null | undefined;
  config?: CustomAvatarConfig | null;
}

export function UpNextRail({ level, config }: UpNextRailProps) {
  const { t } = useLanguage();
  const upcoming = getUpcomingUnlocks(level, 3);
  if (upcoming.length === 0) return null;
  return (
    <section data-testid="up-next-rail" className="rounded-neo-lg border-3 border-neo-black bg-neo-navy-light p-3 shadow-hard">
      <h3 className="mb-2 font-neo-display text-sm font-black uppercase tracking-wide text-neo-white">
        {t('progression.unlock.upNext')}
      </h3>
      <ol className="grid grid-cols-3 gap-2">
        {upcoming.map(u => (
          <li
            key={`${u.category}:${u.partId}`}
            data-testid="up-next-item"
            className="flex min-w-0 flex-col items-center gap-1 text-center"
          >
            <LockedUnlockThumb unlock={u} config={config} size={44} />
            <span className="text-[11px] font-black text-neo-white">{t('progression.unlock.atLevel', { level: u.level })}</span>
            <span className="w-full truncate text-[10px] font-bold text-neo-cream/60">{t(revealPartNameKey(u))}</span>
            <RarityChip rarity={u.rarity} size="xs" />
          </li>
        ))}
      </ol>
    </section>
  );
}

export default UpNextRail;
