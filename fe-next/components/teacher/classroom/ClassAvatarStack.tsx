'use client';

import { useEffect, useState } from 'react';
import AvatarLite from '@/components/AvatarLite';
import { getClassroomStudents } from '@/lib/supabase/education/classrooms';

const VISIBLE = 4;

/** A few student faces for a class card; the full roster lives one tap away. */
export function ClassAvatarStack({ classroomId }: { classroomId: string }) {
  const [ids, setIds] = useState<string[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getClassroomStudents(classroomId)
      .then(({ data }) => {
        if (!cancelled) setIds((data ?? []).map((s) => s.student_id));
      })
      .catch(() => {
        if (!cancelled) setIds([]);
      });
    return () => {
      cancelled = true;
    };
  }, [classroomId]);

  if (!ids || ids.length === 0) return null;
  const extra = ids.length - VISIBLE;

  return (
    <span data-testid="class-avatar-stack" aria-hidden="true" className="flex shrink-0 items-center ps-2">
      {ids.slice(0, VISIBLE).map((id) => (
        <AvatarLite key={id} userId={id} pixelSize={30} className="-ms-2 rounded-full ring-2 ring-neo-navy-light" />
      ))}
      {extra > 0 ? (
        <span
          data-testid="avatar-stack-more"
          className="-ms-2 grid h-[30px] min-w-[30px] place-items-center rounded-full border-2 border-neo-cream/40 bg-neo-navy px-1 font-neo-display text-[0.7rem] font-bold tabular-nums text-neo-cream ring-2 ring-neo-navy-light"
        >
          +{extra}
        </span>
      ) : null}
    </span>
  );
}

export default ClassAvatarStack;
