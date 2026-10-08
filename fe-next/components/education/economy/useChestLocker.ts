'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSocketEmit, useSocketEvent } from '@/utils/SocketContext';
import { CLASSROOM_ECONOMY_EVENTS as E, type ClassroomLockerEntry } from '@/shared/constants/classroomEconomy';

/** The student's own chests, newest first. Server-read; refresh after each collect. */
export function useChestLocker() {
  const emit = useSocketEmit();
  const [items, setItems] = useState<ClassroomLockerEntry[]>([]);
  useSocketEvent<ClassroomLockerEntry[]>(E.locker, setItems);

  const refresh = useCallback(() => {
    emit(E.requestLocker, {});
  }, [emit]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { items, refresh };
}
