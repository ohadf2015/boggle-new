import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { StartButton } from '../StartButton';

const t = (k: string) => k;

describe('StartButton — default seat count sublabel', () => {
  it('a 26-player room reads 26/50, never 26/8', () => {
    render(<StartButton onStartGame={() => {}} disabled={false} tournamentCreating={false} playerCount={26} t={t} />);
    expect(screen.getByTestId('lobby-start')).toHaveTextContent('26/50');
  });

  it('a 5-player room keeps the familiar 5/8', () => {
    render(<StartButton onStartGame={() => {}} disabled={false} tournamentCreating={false} playerCount={5} t={t} />);
    expect(screen.getByTestId('lobby-start')).toHaveTextContent('5/8');
  });
});
