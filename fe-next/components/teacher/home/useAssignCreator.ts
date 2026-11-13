'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

/** Open state of Home's assignment creator; `?assign=1` opens it once and is dropped so a refresh doesn't reopen it. */
export function useAssignCreator(openFromLink: boolean, language: string) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(() => openFromLink);
  const [lessonId, setLessonId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!openFromLink) return;
    setOpen(true);
    const rest = new URLSearchParams(searchParams?.toString() ?? '');
    rest.delete('assign');
    const query = rest.toString();
    router.replace(`/${language}/teacher${query ? `?${query}` : ''}`, { scroll: false });
  }, [openFromLink, searchParams, router, language]);

  const openWith = (listId?: string | null) => {
    setLessonId(listId ?? undefined);
    setOpen(true);
  };

  return { open, lessonId, openWith, close: () => setOpen(false) };
}
