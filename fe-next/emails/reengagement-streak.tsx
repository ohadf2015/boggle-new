/**
 * Re-engagement Email — Streak / Comeback focused variant
 * Uses the "comeback" hero image (mascot flexing with streak energy).
 * Tailored copy for loss aversion + streak recovery.
 * Uses the same robust structure as v3 but opinionated for streak campaigns.
 */

import ReengagementMascotV3, { getReengagementSubjectV3 } from './reengagement-mascot-v3';

interface Props {
  recipientName: string;
  firstLetter: string;
  language?: string;
  playUrl: string;
  unsubscribeUrl: string;
  wordLength?: number;
  daysSinceLastPlay?: number;
  playersToday?: number;
  hoursUntilReset?: number;
}

export default function ReengagementStreak(props: Props) {
  return (
    <ReengagementMascotV3
      {...props}
      heroVariant="comeback"
    />
  );
}

export { getReengagementSubjectV3 as getReengagementStreakSubject };

ReengagementStreak.PreviewProps = {
  recipientName: 'Word Hunter',
  firstLetter: 'S',
  language: 'en',
  playUrl: 'https://lexiclash.live/en/daily',
  unsubscribeUrl: 'https://lexiclash.live/unsub',
  wordLength: 5,
  daysSinceLastPlay: 14,
  playersToday: 1240,
  hoursUntilReset: 7,
};
