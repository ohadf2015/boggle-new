import { describe, expect, it } from 'vitest';
import { promoteDecision } from '../promoteStudentToTeacher';

const student = {
  userId: 'u1',
  email: 'teacher@schools.nyc.gov',
  emailConfirmedAt: '2026-11-03T16:19:00Z',
  userRole: 'student',
};

describe('promoteDecision', () => {
  it('promotes a confirmed student so a header signup does not need a second account', () => {
    expect(promoteDecision(student)).toBe('promote');
    expect(promoteDecision({ ...student, userRole: null })).toBe('promote');
    expect(promoteDecision({ ...student, userRole: 'player' })).toBe('promote');
  });

  it('does not promote a guest, an unconfirmed email, or someone who is already a teacher', () => {
    expect(promoteDecision({ ...student, isAnonymous: true, email: null })).toBe('anonymous');
    expect(promoteDecision({ ...student, emailConfirmedAt: null })).toBe('unconfirmed');
    expect(promoteDecision({ ...student, userRole: 'teacher' })).toBe('already_teacher');
    expect(promoteDecision({ ...student, isAdmin: true })).toBe('already_teacher');
  });

  it('refuses a missing session', () => {
    expect(promoteDecision({})).toBe('refused');
  });
});
