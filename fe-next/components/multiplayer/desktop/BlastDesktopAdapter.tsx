import { memo, useMemo } from 'react';
import { ModeDesktopAdapter, type DesktopAdapterBaseProps, type ModeDesktopConfig } from './ModeDesktopAdapter';
import { GoalBanner, type BlastGoal } from './insights/GoalBanner';
import { ComboCounter } from './insights/ComboCounter';
import { RetiredTilesChip } from './insights/RetiredTilesChip';
import { LuckyBoostChip } from './insights/LuckyBoostChip';

export interface BlastDesktopAdapterProps extends DesktopAdapterBaseProps {
  goal?: BlastGoal;
  comboCount?: number;
  comboMultiplier?: number;
  retiredTileCount?: number;
  luckyBoostActive?: boolean;
}

/** Blast desktop shell — config over the shared ModeDesktopAdapter. */
function BlastDesktopAdapterImpl({ goal, comboCount, comboMultiplier, retiredTileCount, luckyBoostActive, ...base }: BlastDesktopAdapterProps) {
  const goalType = goal?.type ?? 'classic';
  const config = useMemo<ModeDesktopConfig>(
    () => ({
      mode: 'blast',
      testPrefix: 'blast',
      modeNameKey: 'mp.modeName.blast',
      timerColor: 'lime',
      timerSize: 88,
      badgeExtra: (
        <div className="flex gap-1 flex-wrap mt-1">
          <RetiredTilesChip count={retiredTileCount ?? 0} />
          <LuckyBoostChip active={luckyBoostActive ?? false} />
        </div>
      ),
      secondaryExtra: goal && goalType !== 'classic' ? <GoalBanner mode="blast" goal={goal} /> : null,
      streamExtra: <ComboCounter mode="blast" count={comboCount ?? 0} multiplier={comboMultiplier ?? 1} />,
    }),
    [retiredTileCount, luckyBoostActive, goal, goalType, comboCount, comboMultiplier],
  );
  return <ModeDesktopAdapter {...base} config={config} />;
}

export const BlastDesktopAdapter = memo(BlastDesktopAdapterImpl);
