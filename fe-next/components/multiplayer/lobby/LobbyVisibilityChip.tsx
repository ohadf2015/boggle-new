import { Globe, Lock, Users } from 'lucide-react';
import type { RoomVisibility } from '@/shared/types/game';
import { cn } from '@/lib/utils';

const LOOK = {
  public: { icon: Globe, label: 'mpUi.entry.visibilityPublic', tone: 'text-neo-cyan' },
  friends: { icon: Users, label: 'mpUi.entry.visibilityFriends', tone: 'text-neo-lime' },
  private: { icon: Lock, label: 'mpUi.entry.visibilityPrivate', tone: 'text-neo-pink' },
} as const;

/** Tells the host who can find this room. Icon-only on phones, labelled from 720px. */
export function LobbyVisibilityChip({ visibility, t }: { visibility: RoomVisibility; t: (key: string) => string }) {
  const { icon: Icon, label, tone } = LOOK[visibility];
  const name = `${t('mpUi.entry.visibility')}: ${t(label)}`;
  return (
    <span
      role="img"
      aria-label={name}
      title={name}
      data-testid="lobby-visibility-chip"
      data-visibility={visibility}
      className={cn('inline-flex shrink-0 items-center gap-1 h-7 px-1.5 rounded-neo border-2 border-neo-black bg-neo-navy-light text-[11px] font-bold uppercase tracking-wider shadow-hard-sm', tone)}
    >
      <Icon aria-hidden="true" className="w-4 h-4" />
      <span aria-hidden="true" className="hidden min-[720px]:inline">{t(label)}</span>
    </span>
  );
}
