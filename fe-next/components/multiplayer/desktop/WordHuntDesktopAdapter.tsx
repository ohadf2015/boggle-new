import { memo, useMemo } from 'react';
import { ModeDesktopAdapter, type DesktopAdapterBaseProps, type ModeDesktopConfig } from './ModeDesktopAdapter';
import { CategoryBanner } from './insights/CategoryBanner';
import { HuntProgressMeter } from './insights/HuntProgressMeter';

export interface WordHuntDesktopAdapterProps extends DesktopAdapterBaseProps {
  targetCategory: string;
  huntFound?: number;
  huntTarget?: number;
}

/** Word Hunt desktop shell — config over the shared ModeDesktopAdapter. */
function WordHuntDesktopAdapterImpl({ targetCategory, huntFound, huntTarget, ...base }: WordHuntDesktopAdapterProps) {
  const config = useMemo<ModeDesktopConfig>(
    () => ({
      mode: 'word-hunt',
      testPrefix: 'hunt',
      modeNameKey: 'mp.modeName.wordHunt',
      timerColor: 'purple',
      timerSize: 80,
      secondaryExtra: (
        <>
          <CategoryBanner mode="word-hunt" category={targetCategory} />
          {huntFound != null && huntTarget != null && (
            <HuntProgressMeter mode="word-hunt" found={huntFound} target={huntTarget} />
          )}
        </>
      ),
    }),
    [targetCategory, huntFound, huntTarget],
  );
  return <ModeDesktopAdapter {...base} config={config} />;
}

export const WordHuntDesktopAdapter = memo(WordHuntDesktopAdapterImpl);
