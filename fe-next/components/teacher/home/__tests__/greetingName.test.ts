import { describe, it, expect } from 'vitest';
import { greetingName } from '../greetingName';

describe('greetingName', () => {
  it('Given a plain full name, Then it greets by first name', () => {
    expect(greetingName('Dana Levi')).toBe('Dana');
  });

  it('Given an honorific first, Then it keeps the honorific with the surname', () => {
    expect(greetingName('Ms Polish')).toBe('Ms Polish');
    expect(greetingName('Mr. Cohen David')).toBe('Mr. Cohen');
    expect(greetingName('dr levi')).toBe('dr levi');
  });

  it('Given only an honorific, Then it greets with no name', () => {
    expect(greetingName('Mrs')).toBe('');
  });

  it('Given nothing, Then it greets with no name', () => {
    expect(greetingName(null)).toBe('');
    expect(greetingName('   ')).toBe('');
  });
});
