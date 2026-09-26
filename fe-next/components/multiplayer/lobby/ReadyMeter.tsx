/**
 * One pip per human guest, lit lime with a stamped check once the server says
 * they are ready. Seats come from `lobbySeats` (the one roster source), so the
 * meter can never disagree with the seat grid above it.
 */
import { Check } from 'lucide-react';
import type { LobbySeat } from './lobbySeats';
import { cn } from '@/lib/utils';
import styles from './lobby.module.css';

export function ReadyMeter({ seats, meId, className }: { seats: readonly LobbySeat[]; meId: string; className?: string }) {
  const guests = seats.filter((s) => !s.isHost && !s.isBot);
  if (guests.length === 0) return null;
  return (
    <div data-testid="lobby-ready-meter" aria-hidden="true" className={cn('flex items-center justify-center flex-wrap gap-2', className)}>
      {guests.map((s) => (
        <span
          key={s.id}
          data-testid="lobby-ready-pip"
          data-player={s.name}
          data-ready={s.isReady ? 'true' : 'false'}
          title={s.name}
          className={cn(
            'inline-flex items-center justify-center w-[calc(28px*var(--mp-u,1))] h-[calc(28px*var(--mp-u,1))] rounded-full border-2',
            s.isReady ? cn('bg-neo-lime border-neo-black text-neo-black shadow-hard-sm', styles.stamp) : 'border-dashed border-neo-white/40 text-neo-white/50',
            s.id === meId && !s.isReady && 'border-neo-lime text-neo-lime',
          )}
        >
          {s.isReady ? <Check className="w-4 h-4" strokeWidth={3} /> : <span className="text-[11px] font-bold uppercase">{s.name.slice(0, 1)}</span>}
        </span>
      ))}
    </div>
  );
}
