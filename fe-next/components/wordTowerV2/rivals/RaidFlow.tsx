'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { revengeLedger, wreckAccuracy, wreckableTower } from '@/lib/wordTowerV2/wreck';
import type { RaidResult, RivalView, UseEstate } from '../useEstate';
import { PaybackChip, type Grievance } from './Payback';
import { WreckScene } from '../WreckScene';
import { RaidResultCard } from './RaidResultCard';
import { RivalBuilding } from './RivalBuilding';
import { type T, rivalName } from './rivalUtils';

/**
 * One raid, start to finish: see their building → swing at it → find out what
 * it cost them. The damage you do here is the accuracy the SERVER scores the
 * raid with; it recomputes the payout from their stored estate, so a client
 * that lies about the swing changes nothing.
 */

interface Props {
  t: T;
  estate: UseEstate;
  rival: RivalView;
  /**
   * The raid this swing answers. Present = payback, and its numbers ride every
   * screen of the flow so the payout can be read as settling THIS debt.
   */
  grievance?: Grievance | null;
  revenge: boolean;
  /** Wrecking balls this raid gets (a run banks more). */
  balls: number;
  reducedMotion: boolean;
  onClose: () => void;
  /** Back to the board instead of out of the raid entirely. */
  onPickAnother?: () => void;
}

export function RaidFlow({ t, estate, rival, revenge, grievance, balls, reducedMotion, onClose, onPickAnother }: Props) {
  const { playSound } = useSoundEffects();
  const [phase, setPhase] = useState<'reveal' | 'wreck' | 'result'>('reveal');
  /**
   * The swing landed. Set the moment the last ball settles — BEFORE the server
   * answers — so the camera closes in on the damaged building while the raid
   * posts, instead of cutting to a card over an empty background.
   */
  const [swingOver, setSwingOver] = useState(false);
  const [result, setResult] = useState<RaidResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [knocked, setKnocked] = useState(0);
  /** The floor they called on the reveal — marked through the whole swing. */
  const [target, setTarget] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const refreshed = useRef(false);
  const { refresh } = estate;

  // Charges are banked by the run that just ended — read them fresh, once.
  useEffect(() => {
    if (refreshed.current) return;
    refreshed.current = true;
    void refresh();
  }, [refresh]);

  const start = useCallback(
    (targetIndex: number | null) => {
      void playSound('bossEntrance', { volume: 0.5 });
      setTarget(targetIndex);
      setPhase('wreck');
    },
    [playSound],
  );

  const finish = useCallback(
    async ({ wrecked, total }: { wrecked: number; total: number }) => {
      setKnocked(wrecked);
      setSwingOver(true);
      setBusy(true);
      try {
        const res = await estate.raid(rival.userId, wreckAccuracy(wrecked, total), revenge);
        if (!res) setError('guest');
        else if ('error' in res) setError(res.error);
        else setResult(res);
      } catch {
        // A thrown post (offline, aborted) must not strand the player on a
        // wreck with no overlay and no buttons — say it failed and let them out.
        setError('raid_error');
      }
      setBusy(false);
      setPhase('result');
    },
    [estate, rival.userId, revenge],
  );

  if (phase === 'reveal') {
    return (
      <RivalBuilding
        t={t}
        rival={rival}
        revenge={revenge}
        grievance={grievance ?? null}
        charges={estate.estate.raidCharges}
        busy={busy}
        onWreck={start}
        onClose={onClose}
      />
    );
  }

  // One mounted scene from the first swing to the payout. Returning a different
  // component for the result would unmount Pixi and take the wreckage with it —
  // which is exactly why round 1's payout floated over a blank background.
  return (
    <WreckScene
      t={t}
      title={t('wordTowerV2.rivals.target', { name: rivalName(rival, t) })}
      /* The face and the name ride the swing itself: a still of the wreck names
         who is under the ball, and on a payback says why. */
      titleChip={<PaybackChip t={t} rival={rival} revenge={revenge} />}
      tower={rival.lastTower}
      balls={Math.max(2, balls)}
      targetIndex={target}
      hideDamage={result?.outcome.kind === 'blocked'}
      targetWord={(wreckableTower(rival.lastTower)[target ?? -1]?.word ?? '').toUpperCase()}
      reducedMotion={reducedMotion}
      aftermath={swingOver}
      overlay={
        phase === 'result' ? (
          <RaidResultCard
            t={t}
            rival={rival}
            result={result}
            error={error}
            floorsKnocked={knocked}
            ledger={
              revenge && grievance
                ? revengeLedger({
                    theyTook: grievance.coinsStolen,
                    youTook: result?.outcome.kind === 'damaged' ? result.outcome.coinsStolen : 0,
                    blocked: result?.outcome.kind === 'blocked',
                  })
                : null
            }
            reducedMotion={reducedMotion}
            onAgain={onPickAnother}
            onClose={onClose}
          />
        ) : null
      }
      onFinish={finish}
      onClose={onClose}
    />
  );
}
