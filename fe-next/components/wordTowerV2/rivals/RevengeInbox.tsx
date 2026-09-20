'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { wreckableTower } from '@/lib/wordTowerV2/wreck';
import type { RivalView, UseEstate } from '../useEstate';
import { RaidFlow } from './RaidFlow';
import { PaybackBanner, type Grievance } from './Payback';
import type { T } from './rivalUtils';

/**
 * Someone hit your tower while you were away. Coin Master's strongest return
 * hook: the game opens with a face, a grievance and one button — and the
 * payback pays 50% more. Dismissing marks the raids seen, so it never nags twice.
 */

interface Props {
  t: T;
  estate: UseEstate;
  balls: number;
  reducedMotion: boolean;
  /** True while a full-screen raid is up (the parent pauses the game canvas). */
  onRaidOpen: (open: boolean) => void;
}

export function RevengeInbox({ t, estate, balls, reducedMotion, onRaidOpen }: Props) {
  const { authed, inbox, markSeen, rivals: fetchRivals } = estate;
  const [targets, setTargets] = useState<Map<string, RivalView>>(new Map());
  const [target, setTarget] = useState<{ rival: RivalView; grievance: Grievance } | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const raid = inbox[0];

  useEffect(() => {
    if (!authed || !raid) return;
    let live = true;
    fetchRivals()
      .then((r) => {
        if (!live || !r) return;
        setTargets(new Map(r.revenge.map((e) => [e.rival.userId, e.rival])));
      })
      .catch(() => {
        // No rival view = no REVENGE button; the banner still tells the story.
      });
    return () => {
      live = false;
    };
  }, [authed, raid, fetchRivals]);

  useEffect(() => {
    onRaidOpen(target !== null);
  }, [target, onRaidOpen]);

  // The global mute FAB only re-probes its corner on mount and on resize, so a
  // banner that arrives after it lands underneath. Poke it.
  useEffect(() => {
    window.dispatchEvent(new Event('resize'));
  }, []);

  if (target) {
    return (
      <RaidFlow
        t={t}
        estate={estate}
        rival={target.rival}
        grievance={target.grievance}
        revenge
        balls={balls}
        reducedMotion={reducedMotion}
        onClose={() => {
          setTarget(null);
          setDismissed(true);
          void markSeen();
        }}
      />
    );
  }

  if (!authed || !raid || dismissed) return null;
  const rival = targets.get(raid.attackerId) ?? null;

  return (
    <div className="pointer-events-auto absolute inset-x-3 top-3 z-40 mx-auto max-w-md md:max-w-lg">
      <PaybackBanner
        t={t}
        compact
        rival={rival}
        name={raid.attackerName ?? undefined}
        avatarUserId={raid.attackerId}
        avatarConfig={raid.attackerAvatar?.avatarConfig}
        grievance={{ coinsStolen: raid.coinsStolen, blocked: raid.blocked, plot: raid.plot }}
        tower={rival ? wreckableTower(rival.lastTower) : []}
        onRevenge={
          rival
            ? () =>
                setTarget({
                  rival,
                  grievance: { coinsStolen: raid.coinsStolen, blocked: raid.blocked, plot: raid.plot },
                })
            : undefined
        }
        action={
          <button
            type="button"
            onClick={() => {
              setDismissed(true);
              void markSeen();
            }}
            aria-label={t('wordTowerV2.rivals.dismiss')}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-neo border-neo border-black bg-neo-cream shadow-hard-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        }
      />
      {inbox.length > 1 ? (
        <p className="mt-1 text-center font-neo-display text-[11px] font-black uppercase text-neo-cream">
          {t('wordTowerV2.rivals.moreRaids', { n: inbox.length - 1 })}
        </p>
      ) : null}
    </div>
  );
}
