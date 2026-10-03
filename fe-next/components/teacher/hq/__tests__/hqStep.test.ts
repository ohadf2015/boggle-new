import { describe, it, expect } from 'vitest';
import { pickHqStep, type HqStepInput } from '../hqStep';

const base: HqStepInput = {
  classroomsLoading: false,
  classroomsError: false,
  classroomCount: 1,
  justCreatedClass: false,
  hasSelectedClass: true,
  studentCount: 5,
  assignmentCount: 1,
  hasActiveRoom: false,
};

describe('pickHqStep — Teacher HQ asks for one thing at a time', () => {
  it('Given the class read is open, Then it waits instead of guessing a step', () => {
    expect(pickHqStep({ ...base, classroomsLoading: true })).toEqual({ step: 'loading', offerFirstAssignment: false });
  });

  it('Given the class read failed, Then the error card is the step', () => {
    expect(pickHqStep({ ...base, classroomsError: true }).step).toBe('error');
  });

  it('Given no class, Then the one ask is create a class', () => {
    expect(pickHqStep({ ...base, classroomCount: 0, hasSelectedClass: false }).step).toBe('createClass');
  });

  it('Given a class created a moment ago, Then the new code stays on screen (create step) until the teacher moves on', () => {
    expect(pickHqStep({ ...base, justCreatedClass: true }).step).toBe('createClass');
  });

  it('Given classes but the default not picked yet, Then it waits', () => {
    expect(pickHqStep({ ...base, hasSelectedClass: false }).step).toBe('loading');
  });

  it('Given a class with no students, Then the one ask is get students in', () => {
    expect(pickHqStep({ ...base, studentCount: 0, assignmentCount: 0 }).step).toBe('getStudents');
  });

  it('Given students and nothing played or assigned yet, Then go live leads and homework is offered as the quiet alternative', () => {
    expect(pickHqStep({ ...base, assignmentCount: 0 })).toEqual({ step: 'goLive', offerFirstAssignment: true });
  });

  it('Given students and a live room already open, Then no first-homework offer', () => {
    expect(pickHqStep({ ...base, assignmentCount: 0, hasActiveRoom: true })).toEqual({ step: 'goLive', offerFirstAssignment: false });
  });

  it('Given the assignment count still loading, Then go live leads and the homework offer waits (no flash then vanish)', () => {
    expect(pickHqStep({ ...base, assignmentCount: null })).toEqual({ step: 'goLive', offerFirstAssignment: false });
  });

  it('Given an active class, Then go live leads without the first-homework offer', () => {
    expect(pickHqStep(base)).toEqual({ step: 'goLive', offerFirstAssignment: false });
  });
});
