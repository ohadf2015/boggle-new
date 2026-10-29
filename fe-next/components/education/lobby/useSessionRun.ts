'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { VocabularyLesson } from '@/lib/supabase/education';
import type { ClassroomCatalogueId } from '@/lib/education/classroomCatalogueId';
import type { ClassroomPresetId } from '@/lib/education/classroomPresets';
import { findThemedPack, packLessonInput, type PackLessonInput } from '@/lib/education/themedPacks';
import type { SessionRun } from '@/components/teacher/StarterPacksSection';
import type { StarterPackInput } from './useTeacherLobbyData';
import type { LobbyRoundOptions } from './useLobbyRoundOptions';

interface Args {
  isLoading: boolean;
  lessons: VocabularyLesson[];
  setSelectedLessonIds: (ids: string[]) => void;
  createLessonFromPack: (pack: StarterPackInput) => Promise<void>;
  opts: LobbyRoundOptions;
  setPickedGameMode: (id: ClassroomCatalogueId) => void;
  /** `?pack=` / `?preset=` from a "Run this" link; applied once per mount. */
  sessionPack?: string;
  initialPreset?: ClassroomPresetId;
  initialMinutes?: number;
}

/** A ready-to-run session (themed pack + mode + round shape), from a link or from "Run this" inside the lobby. */
export function useSessionRun({ isLoading, lessons, setSelectedLessonIds, createLessonFromPack, opts, setPickedGameMode, sessionPack, initialPreset, initialMinutes }: Args) {
  const selectOrCreate = useCallback(
    async (input: PackLessonInput) => {
      const existing = lessons.find((l) => l.name === input.name && l.language === input.language);
      if (existing) setSelectedLessonIds([existing.id]);
      else await createLessonFromPack(input as StarterPackInput);
    },
    [lessons, setSelectedLessonIds, createLessonFromPack]
  );

  // Held until the link's list and preset are applied, so the auto-picked list never paints under GO LIVE (pitfall class 1).
  const [packPending, setPackPending] = useState(!!sessionPack);
  const [presetPending, setPresetPending] = useState(!!initialPreset);
  const packApplied = useRef(false);
  useEffect(() => {
    if (!sessionPack || packApplied.current || isLoading) return;
    packApplied.current = true;
    void findThemedPack(sessionPack)
      .then((pack) => (pack ? selectOrCreate(packLessonInput(pack)) : undefined))
      .catch(() => undefined)
      .finally(() => setPackPending(false));
  }, [sessionPack, isLoading, selectOrCreate]);

  const presetApplied = useRef(false);
  const { applyPreset, setTimerMinutes } = opts;
  useEffect(() => {
    if (!initialPreset || presetApplied.current || isLoading) return;
    presetApplied.current = true;
    applyPreset(initialPreset);
    // The session's own round length wins over the preset's.
    if (initialMinutes) setTimerMinutes(initialMinutes);
    setPresetPending(false);
  }, [initialPreset, initialMinutes, isLoading, applyPreset, setTimerMinutes]);

  const runSession = useCallback(
    ({ session, pack }: SessionRun) => {
      setPickedGameMode(session.mode);
      if (session.preset) opts.applyPreset(session.preset);
      opts.setTimerMinutes(session.timerMinutes);
      if (session.quiz) {
        opts.setVocabQuizQuestionCount(session.quiz.questionCount);
        opts.setVocabQuizSeconds(session.quiz.seconds);
      }
      if (pack) void selectOrCreate(pack);
    },
    [opts, setPickedGameMode, selectOrCreate]
  );

  return { runSession, pending: packPending || presetPending };
}
