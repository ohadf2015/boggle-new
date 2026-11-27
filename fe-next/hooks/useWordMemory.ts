'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { getWithAuth } from '@/utils/authFetch';
import type { WordMemoryResponse } from '@/lib/education/wordMemoryRead';

async function fetchWordMemory(lessonId: string | undefined): Promise<WordMemoryResponse> {
  const qs = lessonId ? `?lessonId=${encodeURIComponent(lessonId)}` : '';
  const res = await getWithAuth(`/api/education/word-memory${qs}`);
  if (!res.ok) throw new Error(`word-memory ${res.status}`);
  return (await res.json()) as WordMemoryResponse;
}

/** The student's word memory from the server (one lesson, or every lesson when omitted). */
export function useWordMemory(lessonId?: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.wordMemory.byLesson(lessonId ?? ''),
    queryFn: () => fetchWordMemory(lessonId),
    enabled,
  });
}
