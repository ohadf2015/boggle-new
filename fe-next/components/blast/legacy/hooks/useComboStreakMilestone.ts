import { useEffect, useRef, useState } from 'react';

export interface ComboStreakMilestone {
  id: string;
  tier: 1 | 2;
  level: number;
}

const MILESTONE_LEVELS: Record<number, 1 | 2> = {
  5: 1,
  10: 2,
};

export function useComboStreakMilestone(level: number): ComboStreakMilestone | null {
  const [milestone, setMilestone] = useState<ComboStreakMilestone | null>(null);
  const armedRef = useRef(true);
  const seqRef = useRef(0);

  useEffect(() => {
    if (level === 0) {
      armedRef.current = true;
      setMilestone(null);
      return;
    }
    const tier = MILESTONE_LEVELS[level];
    if (tier && armedRef.current) {
      armedRef.current = false;
      seqRef.current += 1;
      setMilestone({ id: `combo-milestone-${level}-${seqRef.current}`, tier, level });
    }
  }, [level]);

  return milestone;
}
