/**
 * The round at a glance: length · board · min word. Gartic's lobby spends a
 * whole tab on these; we spend one row. On the host's screen the row is the
 * door into the settings dialog; on the TV projector it is read-only.
 */
import { Pencil, Timer, Zap } from 'lucide-react';
import { formatTimeMMSS } from '@/shared/utils/timeFormatting';
import type { DifficultyLevel } from '@/shared/types/game';
import { cn } from '@/lib/utils';

type T = (path: string, params?: Record<string, string | number>) => string;

/** Board size per difficulty — one table for the host rail, the TV and the settings dialog's labels. */
export const BOARD_BY_DIFFICULTY: Record<string, string> = { EASY: '5×5', MEDIUM: '6×6', HARD: '7×7' };

interface LobbySettingsSummaryProps {
  timerValue: number;
  difficulty: DifficultyLevel;
  minWordLength?: number;
  t: T;
  /** Host: open the settings dialog. Absent = read-only (TV). */
  onPress?: () => void;
  className?: string;
}

function Stat({ icon, value, unit }: { icon: React.ReactNode; value: string; unit?: string }) {
  return (
    <span className="inline-flex items-baseline gap-1.5 min-w-0">
      <span aria-hidden="true" className="self-center shrink-0 [&_svg]:w-[calc(18px*var(--mp-u,1))] [&_svg]:h-[calc(18px*var(--mp-u,1))]">{icon}</span>
      <b className="font-neo-display font-bold text-neo-white tabular-nums">{value}</b>
      {unit && <span className="text-neo-white/70 text-[0.8em] font-bold truncate">{unit}</span>}
    </span>
  );
}

export function LobbySettingsSummary({ timerValue, difficulty, minWordLength, t, onPress, className }: LobbySettingsSummaryProps) {
  const whole = Number.isInteger(timerValue);
  const stats = (
    <>
      <Stat icon={<Timer className="text-neo-cyan" />} value={whole ? String(timerValue) : formatTimeMMSS(timerValue * 60)} unit={whole ? t('hostView.min') : undefined} />
      <Stat icon={<Zap className="text-neo-lime" />} value={BOARD_BY_DIFFICULTY[difficulty] ?? BOARD_BY_DIFFICULTY.MEDIUM} />
      {minWordLength != null && <Stat icon={<span className="font-neo-display font-bold text-neo-pink text-[0.85em] leading-none">Aa</span>} value={`${minWordLength}+`} unit={t('mpUi.lobby.letters')} />}
    </>
  );
  const base = cn(
    'flex items-center justify-center gap-x-[calc(18px*var(--mp-u,1))] gap-y-1 flex-wrap w-full min-w-0 rounded-neo border-2 border-neo-black bg-neo-navy px-3 py-2 text-[length:calc(15px*var(--mp-u,1))] shadow-hard-sm',
    className,
  );
  if (!onPress) {
    return <div data-testid="lobby-settings-summary" dir="ltr" className={base}>{stats}</div>;
  }
  return (
    <button
      type="button"
      data-testid="lobby-settings-summary"
      onClick={onPress}
      className={cn(base, 'group relative pe-9 transition-transform hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none focus-visible:outline-2 focus-visible:outline-neo-cyan')}
    >
      <span className="sr-only">{t('mpUi.lobby.editSettings')}: </span>
      <span dir="ltr" className="contents">{stats}</span>
      <Pencil aria-hidden="true" className="absolute end-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neo-white/60 group-hover:text-neo-cyan" />
    </button>
  );
}
