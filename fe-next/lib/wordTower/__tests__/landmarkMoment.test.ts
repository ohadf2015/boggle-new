import { describe, it, expect } from 'vitest';
import { landmarkCrossed } from '../landmarkMoment';

describe('landmarkCrossed — calm "you just passed X" beat', () => {
  it('fires when you climb past a landmark altitude', () => {
    // cloudBase sits at 100m
    expect(landmarkCrossed(90, 110)?.id).toBe('cloudBase');
  });

  it('counts the exact altitude as crossed (m > prev, m <= next)', () => {
    expect(landmarkCrossed(99, 100)?.id).toBe('cloudBase');
  });

  it('does not fire when no landmark sits in the gap', () => {
    expect(landmarkCrossed(110, 130)).toBeNull();
  });

  it('never fires when descending (view pan / hazard topple)', () => {
    expect(landmarkCrossed(250, 100)).toBeNull();
    expect(landmarkCrossed(100, 100)).toBeNull();
  });

  it('on a big jump, returns the highest landmark crossed (most impressive)', () => {
    // 20→250 crosses skyscraper(30), cloudBase(100), mountainTop(220)
    expect(landmarkCrossed(20, 250)?.id).toBe('mountainTop');
  });

  it('returns the landmark with its i18n key and icon for the toast', () => {
    const hit = landmarkCrossed(90, 110);
    expect(hit?.key).toBe('wordTower.landmark.cloudBase');
    expect(hit?.icon).toBe('☁️');
  });
});
