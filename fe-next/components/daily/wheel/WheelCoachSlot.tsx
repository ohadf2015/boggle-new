'use client';

import React from 'react';
import PracticeCoachTip from '@/components/practice/PracticeCoachTip';

/** The practice tip rotates and hides on the first word; a fixed slot keeps the wheel under the finger the same size. */
const WheelCoachSlot: React.FC<{ wordsFound: number }> = ({ wordsFound }) => (
  <div data-testid="wheel-coach-slot" className="w-full h-[56px] short:h-[48px] shrink-0 overflow-hidden flex items-center pb-1.5 short:pb-1">
    <PracticeCoachTip
      mode="wheelRush"
      wordsFound={wordsFound}
      className="mx-auto w-full max-w-md max-h-full overflow-hidden flex items-center gap-2 px-3 py-1.5 rounded-neo border-[2px] border-neo-black bg-neo-cream/95 text-neo-black shadow-hard-sm text-xs [&>span:nth-child(2)]:line-clamp-2 [&>span:nth-child(2)]:min-w-0"
    />
  </div>
);

export default WheelCoachSlot;
