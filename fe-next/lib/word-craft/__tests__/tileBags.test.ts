import { describe, it, expect } from 'vitest';
import { getTileBag } from '../tileBag';

describe('locale tile bags', () => {
  it('en bag total = 100', () => {
    const { distribution } = getTileBag('en');
    const total = Object.values(distribution).reduce((s, n) => s + n, 0);
    expect(total).toBe(100);
  });

  it('sv bag total = 100', () => {
    const { distribution } = getTileBag('sv');
    const total = Object.values(distribution).reduce((s, n) => s + n, 0);
    expect(total).toBe(100);
  });

  it('he bag total = 100', () => {
    const { distribution } = getTileBag('he');
    const total = Object.values(distribution).reduce((s, n) => s + n, 0);
    expect(total).toBe(100);
  });

  it('es bag total = 100', () => {
    const { distribution } = getTileBag('es');
    const total = Object.values(distribution).reduce((s, n) => s + n, 0);
    expect(total).toBe(100);
  });

  it('ja bag total = 100', () => {
    const { distribution } = getTileBag('ja');
    const total = Object.values(distribution).reduce((s, n) => s + n, 0);
    expect(total).toBe(100);
  });

  it('sv bag contains å (Å)', () => {
    const { distribution } = getTileBag('sv');
    expect(distribution['Å']).toBeGreaterThan(0);
  });

  it('he bag contains alef (א)', () => {
    const { distribution } = getTileBag('he');
    expect(distribution['א']).toBeGreaterThan(0);
  });

  it('es bag contains ñ (Ñ)', () => {
    const { distribution } = getTileBag('es');
    expect(distribution['Ñ']).toBeGreaterThan(0);
  });

  it('ja bag contains あ', () => {
    const { distribution } = getTileBag('ja');
    expect(distribution['あ']).toBeGreaterThan(0);
  });

  it('unknown locale falls back to en', () => {
    const { distribution } = getTileBag('xx' as any);
    expect(distribution['E']).toBeGreaterThan(0);
  });
});
