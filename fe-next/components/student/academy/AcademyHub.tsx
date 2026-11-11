'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { useActiveClassroomGame, type ActiveGame } from '@/hooks/useActiveClassroomGame';
import { useClassroomRewardListener } from '@/hooks/useClassroomRewardListener';
import { useClassroomGameJoin } from '@/components/student/useClassroomGameJoin';
import { useAcademyData } from './useAcademyData';
import { ReviewCountBridge } from './ReviewCountBridge';
import { AcademyHubView, type AcademyHubProps } from './AcademyHubView';

export type { AcademyHubProps } from './AcademyHubView';

type LiveState = { activeGame: ActiveGame | null; socket: Socket | null };
const NO_LIVE: LiveState = { activeGame: null, socket: null };

/** A sibling of the view, so a late classroom mounts the socket without remounting the hub. */
function LiveGameBridge({ classroomId, onChange }: { classroomId: string; onChange: (s: LiveState) => void }) {
  const { activeGame, socket } = useActiveClassroomGame(classroomId);
  useEffect(() => { onChange({ activeGame, socket }); }, [activeGame, socket, onChange]);
  useEffect(() => () => onChange(NO_LIVE), [onChange]);
  return null;
}

/** Student home: wires the live-game socket, acked join, lessons and rewards into the view. */
export function AcademyHub(props: AcademyHubProps) {
  const { userId, studentName, classroomId, level } = props;
  const [live, setLive] = useState<LiveState>(NO_LIVE);
  const liveGame = classroomId ? live.activeGame : null;
  const socket = classroomId ? live.socket : null;
  const base = useAcademyData(level);
  const [reviewCount, setReviewCount] = useState<number | null>(null);
  const reviewPending = !!base.reviewLessonId && reviewCount === null;
  const data = useMemo(
    () => ({ ...base, reviewCount: base.reviewLessonId ? reviewCount ?? 0 : 0, reviewPending }),
    [base, reviewCount, reviewPending],
  );
  const { join, isJoining, joinError } = useClassroomGameJoin({ activeGame: liveGame, socket, userId, username: studentName });
  const { reward, clearReward } = useClassroomRewardListener(userId);

  return (
    <>
      {classroomId && <LiveGameBridge classroomId={classroomId} onChange={setLive} />}
      {base.reviewLessonId && <ReviewCountBridge key={base.reviewLessonId} lessonId={base.reviewLessonId} words={base.reviewWords} onCount={setReviewCount} />}
      <AcademyHubView
        {...props}
        data={data}
        liveGame={liveGame}
        join={join}
        isJoining={isJoining}
        joinError={joinError}
        reward={reward}
        clearReward={clearReward}
      />
    </>
  );
}
