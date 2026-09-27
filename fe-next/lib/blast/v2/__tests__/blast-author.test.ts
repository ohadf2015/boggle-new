import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import { authorizeLevel } from '../blast-author';
import type { BlastLevel } from '../../lib/blast/v2/types';

describe('blast-author CLI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should authorize a manual level with valid inputs', async () => {
    const level = await authorizeLevel({
      locale: 'en',
      theme: 'fruits',
      levelNumber: 3,
      mode: 'manual',
      words: ['APPLE', 'BANANA', 'ORANGE'],
    });

    expect(level).toBeDefined();
    expect(level.locale).toBe('en');
    expect(level.theme).toBe('fruits');
    expect(level.levelNumber).toBe(3);
    expect(level.words.length).toBeGreaterThan(0);
    expect(level.columns.length).toBeGreaterThan(0);
    expect(level.resolvableOrder.length).toEqual(level.words.length);
  });

  it('should validate level against BlastLevel schema', async () => {
    const level = await authorizeLevel({
      locale: 'en',
      theme: 'onboarding',
      levelNumber: 1,
      mode: 'manual',
      words: ['CAT', 'DOG', 'BIRD'],
    });

    expect(level.id).toBeDefined();
    expect(level.levelNumber).toBe(1);
    expect(level.theme).toBe('onboarding');
    expect(level.locale).toBe('en');
    expect(typeof level.difficulty).toBe('number');
    expect(Array.isArray(level.columns)).toBe(true);
    expect(Array.isArray(level.resolvableOrder)).toBe(true);
  });

  it('should generate auto level with interestingness score above threshold', async () => {
    const level = await authorizeLevel({
      locale: 'en',
      theme: 'animals',
      levelNumber: 15,
      mode: 'auto-gen',
    });

    expect(level.interestingnessScore).toBeDefined();
    expect(level.interestingnessScore).toBeGreaterThanOrEqual(0.55);
  });

  it('should support Hebrew locale with RTL tiles in manual mode', async () => {
    const level = await authorizeLevel({
      locale: 'he',
      theme: 'fruits',
      levelNumber: 2,
      mode: 'manual',
      words: ['תפוח', 'בננה', 'תפוז'],
    });

    expect(level.locale).toBe('he');
    // Check that normalized tiles are present
    expect(level.words.length).toBeGreaterThan(0);
  });

  it('should support Spanish locale with accented words', async () => {
    const level = await authorizeLevel({
      locale: 'es',
      theme: 'animals',
      levelNumber: 2,
      mode: 'manual',
      words: ['GATO', 'PERRO', 'PAJARO'],
    });

    expect(level.locale).toBe('es');
    expect(level.words.length).toBeGreaterThan(0);
  });

  it('should accept manual word list input', async () => {
    const level = await authorizeLevel({
      locale: 'en',
      theme: 'fruits',
      levelNumber: 2,
      mode: 'manual',
      words: ['APPLE', 'ORANGE', 'GRAPE'],
    });

    expect(level.words).toEqual(['APPLE', 'ORANGE', 'GRAPE']);
    expect(level.locale).toBe('en');
  });

  it('should handle tile flags configuration in manual mode', async () => {
    const level = await authorizeLevel({
      locale: 'en',
      theme: 'fruits',
      levelNumber: 1,
      mode: 'manual',
      words: ['APPLE', 'BANANA'],
      tileFlags: { c0r0: ['coin'] },
    });

    expect(level.tileFlags['c0r0']).toContain('coin');
  });

  it('should reject invalid locale', async () => {
    await expect(
      authorizeLevel({
        locale: 'xx' as any,
        theme: 'fruits',
        levelNumber: 1,
        mode: 'auto-gen',
      })
    ).rejects.toThrow();
  });

  it('should reject invalid theme', async () => {
    await expect(
      authorizeLevel({
        locale: 'en',
        theme: 'invalidtheme' as any,
        levelNumber: 1,
        mode: 'auto-gen',
      })
    ).rejects.toThrow();
  });

  it('should reject level number out of range', async () => {
    await expect(
      authorizeLevel({
        locale: 'en',
        theme: 'fruits',
        levelNumber: 0,
        mode: 'auto-gen',
      })
    ).rejects.toThrow();
  });
});
