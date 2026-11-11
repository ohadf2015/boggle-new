'use client';

import { useClassrooms } from '@/hooks/useClassroom';

/** The teacher's own class list carries the code; a guest screen or an unknown class falls back to the room code. */
export function useProjectorClassCode(classroomId: string | null): string | null {
  const { classrooms } = useClassrooms();
  if (!classroomId) return null;
  return classrooms.find((c) => c.id === classroomId)?.join_code ?? null;
}
