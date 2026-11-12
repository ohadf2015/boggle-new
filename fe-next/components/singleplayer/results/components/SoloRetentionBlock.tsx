import dynamic from 'next/dynamic';

// Both cards read localStorage, so they stay out of SSR and reserve their own min-h (CLS=0).
const StreakIgnitionCard = dynamic(() => import('@/components/results/StreakIgnitionCard'), { ssr: false });
const TomorrowCard = dynamic(() => import('@/components/results/TomorrowCard'), { ssr: false });

interface Props {
  won: boolean;
  currentStreak: number;
  isStreakLoaded: boolean;
}

/** The visible streak plus the persistent tomorrow hook: two columns on lg, stacked on phones. */
export function SoloRetentionBlock({ won, currentStreak, isStreakLoaded }: Props) {
  return (
    <div className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-5 lg:space-y-0 lg:items-stretch">
      <StreakIgnitionCard won={won} currentStreak={currentStreak} isLoaded={isStreakLoaded} />
      <div className="flex flex-col gap-4">
        <TomorrowCard source="solo" streak={currentStreak} isStreakLoaded={isStreakLoaded} />
      </div>
    </div>
  );
}
