import { describe, it, expect } from 'vitest';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { StartButton } from '../StartButton';

const t = (k: string) => k;
const button = (playerCount: number) => (
  <StartButton onStartGame={() => {}} disabled={false} tournamentCreating={false} playerCount={playerCount} t={t} />
);
const pulsing = () => screen.getByTestId('lobby-start-pulse').hasAttribute('data-pulse');

describe('StartButton — ready-to-go pulse', () => {
  it('Given a room that opens with company, Then it does not pulse on mount', () => {
    render(button(2));
    expect(pulsing()).toBe(false);
  });

  it('Given a solo host, When the second player arrives, Then START pulses once and settles', () => {
    const { rerender } = render(button(1));
    rerender(button(2));
    expect(pulsing()).toBe(true);
    fireEvent.animationEnd(screen.getByTestId('lobby-start-pulse'));
    expect(pulsing()).toBe(false);
    rerender(button(3));
    expect(pulsing()).toBe(false);
  });

  it('presses down into its shadow instead of shrinking', () => {
    render(button(2));
    const cls = screen.getByTestId('lobby-start').className;
    expect(cls).toContain('active:shadow-none');
    expect(cls).not.toMatch(/active:scale-/);
  });
});
