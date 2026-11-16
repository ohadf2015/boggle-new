'use client';

/**
 * The one-tap card a student sees when a class or team round ends.
 * Each mode is its own tap — no menu between the results and the next game.
 */
import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ClassModeBridgeOffer } from '@/lib/education/classModeBridge';
import { trackClassModeBridgeAccepted, trackClassModeBridgeOffered } from '@/lib/education/classModeBridgeTelemetry';

export interface ClassModeBridgeCardProps {
  offer: ClassModeBridgeOffer;
  className?: string;
}

export function ClassModeBridgeCard({ offer, className }: ClassModeBridgeCardProps) {
  const seen = useRef<string | null>(null);

  useEffect(() => {
    if (seen.current === offer.event.class_id) return;
    seen.current = offer.event.class_id;
    trackClassModeBridgeOffered(offer.event);
  }, [offer.event]);

  return (
    <aside
      data-testid="class-mode-bridge"
      dir={offer.dir}
      className={cn(
        'w-full rounded-neo border-[3px] border-neo-black bg-neo-yellow p-3 text-neo-black shadow-hard',
        className,
      )}
    >
      <h2 className="font-neo-display text-lg font-black leading-snug">{offer.title}</h2>
      {offer.context && (
        <p data-testid="class-mode-bridge-context" className="mt-1 font-neo-body text-sm font-bold leading-snug">
          {offer.context}
        </p>
      )}
      <div className="mt-3 flex flex-col gap-2">
        {offer.modes.map((mode, index) => (
          <Link
            key={mode.id}
            href={mode.href}
            data-testid={`class-mode-bridge-${mode.id}`}
            onClick={() => trackClassModeBridgeAccepted({ class_id: offer.event.class_id, mode: mode.id })}
            className={cn(
              'flex min-h-12 w-full items-center justify-center gap-2 rounded-neo border-[3px] border-neo-black px-4 font-neo-display text-base font-black',
              'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan active:translate-x-[2px] active:translate-y-[2px]',
              index === 0 ? 'bg-neo-lime shadow-hard' : 'bg-neo-cream shadow-hard-sm',
            )}
          >
            <Play className="size-4 shrink-0 fill-current" aria-hidden="true" />
            {mode.label}
          </Link>
        ))}
      </div>
    </aside>
  );
}

export default ClassModeBridgeCard;
