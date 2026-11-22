import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  buildTeacherProUpgradeShownEvent,
  buildTeacherProUpgradeClickedEvent,
  emitTeacherProUpgradeShown,
  emitTeacherProUpgradeClicked,
} from '../proFunnelServer';
import * as eduTelemetry from '@/backend/utils/educationTelemetry';

describe('teacherProUpgradeTelemetry builders and emitters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('builds teacher_pro_upgrade_shown with standard properties', () => {
    const ev = buildTeacherProUpgradeShownEvent('teacher-1', {
      placement: 'student_cap_dashboard',
      reason: 'free_tier_limit',
      count: 50,
      limit: 50,
      locale: 'en',
    });
    expect(ev).toEqual({
      distinctId: 'teacher-1',
      event: 'teacher_pro_upgrade_shown',
      properties: {
        product: 'teacher_pro',
        provider: 'polar',
        teacher_id: 'teacher-1',
        placement: 'student_cap_dashboard',
        reason: 'free_tier_limit',
        count: 50,
        limit: 50,
        locale: 'en',
      },
    });
  });

  it('builds teacher_pro_upgrade_clicked with standard properties', () => {
    const ev = buildTeacherProUpgradeClickedEvent('teacher-2', {
      placement: 'weekly_digest',
      reason: 'practice',
      locale: 'es',
    });
    expect(ev).toEqual({
      distinctId: 'teacher-2',
      event: 'teacher_pro_upgrade_clicked',
      properties: {
        product: 'teacher_pro',
        provider: 'polar',
        teacher_id: 'teacher-2',
        placement: 'weekly_digest',
        reason: 'practice',
        locale: 'es',
      },
    });
  });

  it('emitTeacherProUpgradeShown passes event to captureEduServerEvents', () => {
    const spy = vi.spyOn(eduTelemetry, 'captureEduServerEvents').mockImplementation(() => {});
    emitTeacherProUpgradeShown({
      teacherId: 'teacher-3',
      placement: 'class_cap_meter',
      reason: 'free_tier_limit',
      count: 3,
      limit: 3,
      locale: 'he',
    });
    expect(spy).toHaveBeenCalledTimes(1);
    const [events] = spy.mock.calls[0];
    expect(events[0]).toMatchObject({
      distinctId: 'teacher-3',
      event: 'teacher_pro_upgrade_shown',
      properties: {
        placement: 'class_cap_meter',
        reason: 'free_tier_limit',
        count: 3,
        limit: 3,
        locale: 'he',
      },
    });
  });

  it('emitTeacherProUpgradeClicked passes event to captureEduServerEvents', () => {
    const spy = vi.spyOn(eduTelemetry, 'captureEduServerEvents').mockImplementation(() => {});
    emitTeacherProUpgradeClicked({
      teacherId: 'teacher-4',
      placement: 'student_limit_modal',
      reason: 'free_tier_limit',
      count: 50,
      limit: 50,
      locale: 'ja',
    });
    expect(spy).toHaveBeenCalledTimes(1);
    const [events] = spy.mock.calls[0];
    expect(events[0]).toMatchObject({
      distinctId: 'teacher-4',
      event: 'teacher_pro_upgrade_clicked',
      properties: {
        placement: 'student_limit_modal',
        reason: 'free_tier_limit',
        count: 50,
        limit: 50,
        locale: 'ja',
      },
    });
  });
});
