import { describe, it, expect } from 'vitest';
import { accessHandoffHref } from '../AccessRequestHandoff';

const fresh = { paidDay0: false, alreadyApproved: false };

describe('accessHandoffHref', () => {
  it('Given a fresh approval, Then the teacher lands in class setup', () => {
    expect(accessHandoffHref('en', fresh, null)).toBe('/en/teacher/classroom/new');
  });

  it('Given a TeacherGate bounce, Then the teacher returns to the page they were heading to', () => {
    expect(accessHandoffHref('he', fresh, '/he/teacher/reports')).toBe('/he/teacher/reports');
  });

  it('Given a paid campaign teacher, Then the day-0 class is provisioned first', () => {
    expect(accessHandoffHref('es', { paidDay0: true, alreadyApproved: false }, '/es/teacher')).toBe('/es/teacher/class-ready');
  });

  it('Given an account that already had access, Then it goes to teacher home, not a second first class', () => {
    expect(accessHandoffHref('sv', { paidDay0: false, alreadyApproved: true }, null)).toBe('/sv/teacher');
    expect(accessHandoffHref('sv', { paidDay0: false, alreadyApproved: true }, '/sv/teacher/curriculum')).toBe('/sv/teacher/curriculum');
  });
});
