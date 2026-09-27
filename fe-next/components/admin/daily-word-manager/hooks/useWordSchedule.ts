'use client';

import { useState, useCallback, useEffect } from 'react';
import type { Language } from '@/types';
import type { DailyTargetWord } from '../types';
import { captureError } from '@/utils/sentry';

interface UseWordScheduleReturn {
  schedule: DailyTargetWord[];
  isLoading: boolean;
  editingDate: string | null;
  editWordValue: string;
  fetchSchedule: () => Promise<void>;
  startEdit: (date: string, currentWord: string) => void;
  cancelEdit: () => void;
  setEditWordValue: (value: string) => void;
  saveSingleWord: (date: string) => Promise<boolean>;
}

export function useWordSchedule(
  selectedLang: Language,
  accessToken: string | null
): UseWordScheduleReturn {
  const [schedule, setSchedule] = useState<DailyTargetWord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [editWordValue, setEditWordValue] = useState('');

  const fetchSchedule = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    try {
      const start = new Date();
      start.setDate(start.getDate() - 5);
      const end = new Date();
      end.setDate(end.getDate() + 35);

      const params = new URLSearchParams({
        language: selectedLang,
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
      });

      const res = await fetch(`/api/admin/daily-word/schedule?${params}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const data = await res.json();
      if (data.data) {
        setSchedule(data.data);
      }
    } catch (e) {
      console.error('Failed to fetch schedule:', e);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, selectedLang]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  const startEdit = useCallback((date: string, currentWord: string) => {
    setEditingDate(date);
    setEditWordValue(currentWord);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingDate(null);
    setEditWordValue('');
  }, []);

  const saveSingleWord = useCallback(async (date: string): Promise<boolean> => {
    if (!accessToken || !editWordValue.trim()) return false;

    try {
      const response = await fetch('/api/admin/daily-word/bulk-generate', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          language: selectedLang,
          words: [{ date, word: editWordValue.trim() }],
        }),
      });

      if (!response.ok) throw new Error('Failed to update');

      await fetchSchedule();
      setEditingDate(null);
      setEditWordValue('');
      return true;
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      console.error('Failed to save word:', err.message);
      captureError(err, { action: 'saveSingleWord', date, language: selectedLang });
      return false;
    }
  }, [accessToken, editWordValue, selectedLang, fetchSchedule]);

  return {
    schedule,
    isLoading,
    editingDate,
    editWordValue,
    fetchSchedule,
    startEdit,
    cancelEdit,
    setEditWordValue,
    saveSingleWord,
  };
}
