import { describe, it, expect } from 'vitest';
import { en } from '@/translations/en';
import { MODE_COACH } from '@/lib/tutorial/modeCoachContent';

describe('Word Bridge coach', () => {
  it('Given a first visit to /connections/play, Then the coach teaches the linking word, not grouping four words', () => {
    const coach = MODE_COACH.connections;
    expect(coach.steps.map((s) => s.demo)).not.toContain('connectGroup');
    const step1 = coach.steps[0].captionKey.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], en);
    expect(String(step1)).not.toMatch(/group|four/i);
    expect(String(step1)).toMatch(/link/i);
  });
});
