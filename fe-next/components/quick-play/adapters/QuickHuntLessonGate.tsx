'use client';

import React, { useCallback, useState } from 'react';
import type { Language } from '@/types';
import { DailyChallengeTutorial } from '@/components/daily/DailyChallengeTutorial';
import { claimHuntLesson } from '@/components/daily/survival/howto/huntLessonGate';

/**
 * Quick Play drops players straight into a timed Word Hunt round. The first time, the lesson runs
 * before the round mounts, so its clock does not tick while they learn.
 */
export function QuickHuntLessonGate({ language, children }: { language: Language; children: React.ReactNode }) {
  const [lesson, setLesson] = useState(() => claimHuntLesson(language));
  const close = useCallback(() => setLesson(false), []);
  if (lesson) return <DailyChallengeTutorial source="quick_play" onComplete={close} onSkip={close} />;
  return <>{children}</>;
}
