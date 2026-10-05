/**
 * Server-persisted teacher activation checklist progress.
 *
 * Timestamps on the teacher profile are the source of truth. A missing
 * column (migration not applied) must look like "nothing persisted", never
 * like a crash that hides the checklist.
 */

export interface TeacherActivationProgress {
  inviteCopied: boolean;
  liveStarted: boolean;
  dismissed: boolean;
}

export const EMPTY_TEACHER_ACTIVATION_PROGRESS: TeacherActivationProgress = {
  inviteCopied: false,
  liveStarted: false,
  dismissed: false,
};

export const TEACHER_ACTIVATION_PROFILE_COLUMNS = [
  'teacher_activation_invite_copied_at',
  'teacher_activation_live_started_at',
  'teacher_activation_checklist_dismissed_at',
] as const;

export type TeacherActivationProfileRow = {
  teacher_activation_invite_copied_at?: string | null;
  teacher_activation_live_started_at?: string | null;
  teacher_activation_checklist_dismissed_at?: string | null;
};

export function progressFromProfileRow(
  row: TeacherActivationProfileRow | null | undefined,
): TeacherActivationProgress {
  if (!row) return { ...EMPTY_TEACHER_ACTIVATION_PROGRESS };
  return {
    inviteCopied: Boolean(row.teacher_activation_invite_copied_at),
    liveStarted: Boolean(row.teacher_activation_live_started_at),
    dismissed: Boolean(row.teacher_activation_checklist_dismissed_at),
  };
}

export type TeacherActivationPatch = {
  inviteCopied?: boolean;
  liveStarted?: boolean;
  dismissed?: boolean;
};

/** Merge a patch onto existing progress. Flags only turn on, never off. */
export function applyActivationPatch(
  current: TeacherActivationProgress,
  patch: TeacherActivationPatch,
): TeacherActivationProgress {
  return {
    inviteCopied: patch.inviteCopied === true ? true : current.inviteCopied,
    liveStarted: patch.liveStarted === true ? true : current.liveStarted,
    dismissed: patch.dismissed === true ? true : current.dismissed,
  };
}

export function profileUpdateFromPatch(
  patch: TeacherActivationPatch,
  nowIso: string,
): Partial<TeacherActivationProfileRow> {
  const update: Partial<TeacherActivationProfileRow> = {};
  if (patch.inviteCopied === true) {
    update.teacher_activation_invite_copied_at = nowIso;
  }
  if (patch.liveStarted === true) {
    update.teacher_activation_live_started_at = nowIso;
  }
  if (patch.dismissed === true) {
    update.teacher_activation_checklist_dismissed_at = nowIso;
  }
  return update;
}
