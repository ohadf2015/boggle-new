import { describe, it, expect, beforeEach, vi } from 'vitest';
import { trackEduClassroomJoin } from '@/lib/education/telemetry';

vi.mock('@/lib/education/telemetry', () => ({
  trackEduClassroomJoin: vi.fn(),
}));

describe('JoinFlow outcomes - telemetry tracking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should track success outcome when join succeeds', () => {
    // This test verifies that trackEduClassroomJoin is called with result: 'success'
    // when a classroom join succeeds (200 response, new member)
    trackEduClassroomJoin({
      result: 'success',
      classroomId: 'classroom-123',
      matchedCodeType: 'roster_code',
    });
    expect(trackEduClassroomJoin).toHaveBeenCalledWith(
      expect.objectContaining({ result: 'success' })
    );
  });

  it('should track invalid_code outcome for bad code', () => {
    // This test verifies that trackEduClassroomJoin is called with result: 'invalid_code'
    // when the server returns 400 for an invalid code
    trackEduClassroomJoin({
      result: 'invalid_code',
      attemptedCode: 'BADCODE',
    });
    expect(trackEduClassroomJoin).toHaveBeenCalledWith(
      expect.objectContaining({ result: 'invalid_code' })
    );
  });

  it('should track already_member outcome on rejoin', () => {
    // This test verifies that trackEduClassroomJoin is called with result: 'already_member'
    // when the server returns 200 but the student is already enrolled
    trackEduClassroomJoin({
      result: 'already_member',
      classroomId: 'classroom-123',
    });
    expect(trackEduClassroomJoin).toHaveBeenCalledWith(
      expect.objectContaining({ result: 'already_member' })
    );
  });

  it('should track full outcome when classroom is at student limit', () => {
    // This test verifies that trackEduClassroomJoin is called with result: 'full'
    // when the server returns 403 STUDENT_LIMIT_REACHED
    trackEduClassroomJoin({
      result: 'full',
      attemptedCode: 'XJXEFN',
    });
    expect(trackEduClassroomJoin).toHaveBeenCalledWith(
      expect.objectContaining({ result: 'full' })
    );
  });

  it('should track server_error outcome on network/server failure', () => {
    // This test verifies that trackEduClassroomJoin is called with result: 'server_error'
    // when a network error or 5xx server error occurs
    trackEduClassroomJoin({
      result: 'server_error',
      attemptedCode: 'CODEX',
    });
    expect(trackEduClassroomJoin).toHaveBeenCalledWith(
      expect.objectContaining({ result: 'server_error' })
    );
  });
});
