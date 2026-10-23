'use client';

import { useState } from 'react';
import { GetStudentsInCard, type HqClassroom } from '../hq/GetStudentsInCard';
import { HqProjectorSheet } from '../hq/HqProjectorSheet';
import { EndedCodeTriesNotice } from '../hq/EndedCodeTriesNotice';
import { belowStudentGoal } from '../hq/studentGoal';

export function HomeGetStudentsIn({ classroom }: { classroom: HqClassroom }) {
  const [projectorOpen, setProjectorOpen] = useState(false);

  return (
    <>
      <EndedCodeTriesNotice classroomId={classroom.id} />
      {belowStudentGoal(classroom.member_count) ? (
        <GetStudentsInCard classroom={classroom} onOpenProjector={() => setProjectorOpen(true)} />
      ) : null}
      {projectorOpen ? <HqProjectorSheet classroom={classroom} onClose={() => setProjectorOpen(false)} /> : null}
    </>
  );
}
