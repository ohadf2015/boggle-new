import { getModeLabel, type GameModeOption } from '@/components/GameModeSelector';
import { getModePresentation, type ModeColorFamily } from '@/lib/multiplayer/modePresentation';
import { cn } from '@/lib/utils';

type T = (path: string, params?: Record<string, string | number>) => string;

const TEXT: Record<ModeColorFamily, string> = {
  lime: 'text-neo-lime border-neo-lime',
  pink: 'text-neo-pink border-neo-pink',
  cyan: 'text-neo-cyan border-neo-cyan',
  purple: 'text-neo-purple border-neo-purple',
  orange: 'text-neo-orange border-neo-orange',
};

/** Read-only mode tag for a joiner: what the host picked. */
export function LobbyModeChip({ mode, t, className }: { mode: GameModeOption; t: T; className?: string }) {
  const color = getModePresentation(mode).color;
  return (
    <span
      data-testid="lobby-mode-chip"
      className={cn(
        'inline-flex items-center gap-1.5 max-w-full rounded-full border-2 bg-neo-navy px-3 py-1 shadow-hard-sm',
        'font-neo-display text-xs font-bold uppercase tracking-wider truncate',
        TEXT[color] ?? TEXT.cyan,
        className,
      )}
    >
      <span className="sr-only">{t('mpUi.lobby.hostPicked')}: </span>
      {getModeLabel(mode, t)}
    </span>
  );
}
