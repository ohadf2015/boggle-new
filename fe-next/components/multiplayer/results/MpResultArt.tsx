'use client';

import { useState, type ReactNode } from 'react';
import { Equal, Fingerprint, Swords, Timer, TrendingUp, Trophy, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ResultCallout } from './mpResultsStory';
import fx from './mpResults.module.css';

type TFn = (key: string, params?: Record<string, string | number>) => string;

const ART = '/images/mp-results';

/** Art files are optional: a missing or broken one falls back instead of leaving a gap. */
export function ResultArt({ src, className, fallback }: { src: string; className?: string; fallback: ReactNode }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <>{fallback}</>;
  // eslint-disable-next-line @next/next/no-img-element -- small decorative sprite with an onError fallback
  return <img src={src} alt="" aria-hidden="true" draggable={false} onError={() => setFailed(true)} className={className} />;
}

export const MEDAL_SRC: Record<1 | 2 | 3, string> = {
  1: `${ART}/medal-1st.webp`,
  2: `${ART}/medal-2nd.webp`,
  3: `${ART}/medal-3rd.webp`,
};
export const CROWN_SRC = `${ART}/crown-winner.webp`;
export const SPOTLIGHT_SRC = `${ART}/spotlight-burst.webp`;

const CALLOUT: Record<ResultCallout['kind'], { badge?: string; icon: LucideIcon; tone: string }> = {
  photoFinish: { badge: `${ART}/badge-photo-finish.webp`, icon: Timer, tone: 'bg-neo-yellow' },
  comeback: { badge: `${ART}/badge-comeback.webp`, icon: TrendingUp, tone: 'bg-neo-lime' },
  beat: { badge: `${ART}/badge-rival-beat.webp`, icon: Trophy, tone: 'bg-neo-lime' },
  lost: { badge: `${ART}/badge-rival-lost.webp`, icon: Swords, tone: 'bg-neo-pink' },
  tied: { icon: Equal, tone: 'bg-neo-cyan' },
  unique: { icon: Fingerprint, tone: 'bg-neo-cyan' },
};

function calloutText(c: ResultCallout, t: TFn): string {
  switch (c.kind) {
    case 'photoFinish':
      return t(c.won ? 'mpUi.results.calloutPhotoWon' : 'mpUi.results.calloutPhotoLost', { name: c.name, points: c.points });
    case 'comeback':
      return t('mpUi.results.calloutComeback', { places: c.places });
    case 'beat':
      return t('mpUi.results.ahead', { points: c.points, name: c.name });
    case 'lost':
      return t('mpUi.results.behind', { points: c.points, name: c.name });
    case 'tied':
      return c.more > 0 ? t('mpUi.results.tiedWithMore', { name: c.name, more: c.more }) : t('mpUi.results.tiedWith', { name: c.name });
    case 'unique':
      return t('mpUi.results.calloutUnique', { count: c.count });
  }
}

export function MpCalloutLine({ callout, revealed, t }: { callout: ResultCallout; revealed: boolean; t: TFn }) {
  const art = CALLOUT[callout.kind];
  const Icon = art.icon;
  const icon = (
    <span className={cn('grid place-items-center shrink-0 rounded-full border-2 border-neo-black text-neo-black w-[calc(22px*var(--mp-u,1))] h-[calc(22px*var(--mp-u,1))]', art.tone)}>
      <Icon aria-hidden="true" className="w-3.5 h-3.5" />
    </span>
  );
  return (
    <p data-testid="mp-my-callout" data-kind={callout.kind} className="flex items-center gap-1.5 min-w-0 font-neo-body font-bold leading-tight text-[calc(12px*var(--mp-u,1))]">
      <span className={cn('shrink-0', revealed && fx.badgeIn)}>
        {art.badge ? (
          <ResultArt src={art.badge} fallback={icon} className="block object-contain w-[calc(26px*var(--mp-u,1))] h-[calc(26px*var(--mp-u,1))] drop-shadow-[2px_2px_0_rgb(var(--neo-black))]" />
        ) : icon}
      </span>
      <span dir="auto" className="min-w-0 truncate">{calloutText(callout, t)}</span>
    </p>
  );
}
