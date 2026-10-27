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
    ).toEqual({ inviteCopied: true, liveStarted: false, roomOpened: false, dismissed: true });
  });

  it('maps the room-opened stamp independently of live-started', () => {
    expect(
      progressFromProfileRow({ teacher_activation_room_opened_at: '2026-10-27T00:00:00Z' }),
    ).toEqual({ inviteCopied: false, liveStarted: false, roomOpened: true, dismissed: false });
  });

  it('only turns flags on', () => {
    const next = applyActivationPatch(
      { inviteCopied: true, liveStarted: false, roomOpened: false, dismissed: false },
      { inviteCopied: false, liveStarted: true },
    );
    expect(next).toEqual({ inviteCopied: true, liveStarted: true, roomOpened: false, dismissed: false });
  });

  it('writes only the timestamps the patch asked for', () => {
    expect(profileUpdateFromPatch({ dismissed: true }, '2026-10-05T12:00:00.000Z')).toEqual({
      teacher_activation_checklist_dismissed_at: '2026-10-05T12:00:00.000Z',
    });
  });

  it('writes the room-opened timestamp when the patch asks for it', () => {
    expect(profileUpdateFromPatch({ roomOpened: true }, '2026-10-27T12:00:00.000Z')).toEqual({
      teacher_activation_room_opened_at: '2026-10-27T12:00:00.000Z',
    });
  });
});
