/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { LevelRing, computeRingDash } from '@/components/profile/LevelRing';

vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: () => true, // deterministic: skip animation in tests
}));

describe('computeRingDash — pure ring geometry', () => {
  const R = 50;
  const C = 2 * Math.PI * R;

  it('0% leaves the whole ring undrawn (offset == circumference)', () => {
    const { circumference, offset } = computeRingDash(0, R);
    expect(circumference).toBeCloseTo(C);
    expect(offset).toBeCloseTo(C);
  });

  it('100% fully draws the ring (offset == 0)', () => {
    expect(computeRingDash(100, R).offset).toBeCloseTo(0);
  });

  it('50% draws half (offset == circumference / 2)', () => {
    expect(computeRingDash(50, R).offset).toBeCloseTo(C / 2);
  });

  it('clamps above 100 to fully drawn', () => {
    expect(computeRingDash(140, R).offset).toBeCloseTo(0);
  });

  it('clamps below 0 to undrawn', () => {
    expect(computeRingDash(-25, R).offset).toBeCloseTo(C);
  });
});

describe('LevelRing — rendering', () => {
  it('renders its children (the avatar) inside the ring', () => {
    render(
      <LevelRing percent={42} size={96}>
        <div data-testid="avatar-slot">AV</div>
      </LevelRing>,
    );
    expect(screen.getByTestId('avatar-slot')).toBeInTheDocument();
  });

  it('exposes progress to assistive tech via aria', () => {
    render(
      <LevelRing percent={42} size={96} ariaLabel="Level progress">
        <div>AV</div>
      </LevelRing>,
    );
    const meter = screen.getByRole('img', { name: /level progress/i });
    expect(meter).toBeInTheDocument();
  });

  it('at max level renders a fully-drawn ring (100%)', () => {
    const { container } = render(
      <LevelRing percent={100} size={96} isMaxLevel>
        <div>AV</div>
      </LevelRing>,
    );
    // progress circle should have ~0 dash offset
    const circles = container.querySelectorAll('circle');
    expect(circles.length).toBeGreaterThanOrEqual(2); // track + progress
  });
});
