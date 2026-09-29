/**
 * uniqueClassroomName — the prefilled default ("My Class") makes a duplicate
 * one tap away; the second tap should produce "My Class (2)", not a silent clone.
 */
import { describe, it, expect } from 'vitest';
import { uniqueClassroomName } from '../uniqueClassName';

describe('uniqueClassroomName', () => {
  it('returns the name untouched when it is free', () => {
    expect(uniqueClassroomName('My Class', [])).toBe('My Class');
    expect(uniqueClassroomName('Period 3', ['My Class'])).toBe('Period 3');
  });

  it('increments a taken name with a parenthesised suffix', () => {
    expect(uniqueClassroomName('My Class', ['My Class'])).toBe('My Class (2)');
  });

  it('finds the first free suffix', () => {
    expect(uniqueClassroomName('My Class', ['My Class', 'My Class (2)'])).toBe('My Class (3)');
  });

  it('treats case and surrounding whitespace as the same name', () => {
    expect(uniqueClassroomName('my class', ['My Class'])).toBe('my class (2)');
    expect(uniqueClassroomName('  My Class  ', ['my class'])).toBe('My Class (2)');
  });

  it('does not collide with names that merely share a prefix', () => {
    expect(uniqueClassroomName('My Class', ['My Class (2)'])).toBe('My Class');
  });
});
