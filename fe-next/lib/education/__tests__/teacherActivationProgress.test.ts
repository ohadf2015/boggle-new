import { describe, it, expect } from 'vitest';
import {
  applyActivationPatch,
  progressFromProfileRow,
  profileUpdateFromPatch,
  EMPTY_TEACHER_ACTIVATION_PROGRESS,
} from '../teacherActivationProgress';

describe('teacherActivationProgress', () => {
  it('reads empty when the profile row is missing', () => {
    expect(progressFromProfileRow(null)).toEqual(EMPTY_TEACHER_ACTIVATION_PROGRESS);
  });

  it('treats timestamps as done flags', () => {
    expect(
      progressFromProfileRow({
        teacher_activation_invite_copied_at: '2026-10-05T00:00:00Z',
        teacher_activation_live_started_at: null,
        teacher_activation_checklist_dismissed_at: '2026-10-05T01:00:00Z',
      }),
    ).toEqual({ inviteCopied: true, liveStarted: false, dismissed: true });
  });

  it('only turns flags on', () => {
    const next = applyActivationPatch(
      { inviteCopied: true, liveStarted: false, dismissed: false },
      { inviteCopied: false, liveStarted: true },
    );
    expect(next).toEqual({ inviteCopied: true, liveStarted: true, dismissed: false });
  });

  it('writes only the timestamps the patch asked for', () => {
    expect(profileUpdateFromPatch({ dismissed: true }, '2026-10-05T12:00:00.000Z')).toEqual({
      teacher_activation_checklist_dismissed_at: '2026-10-05T12:00:00.000Z',
    });
  });
});
