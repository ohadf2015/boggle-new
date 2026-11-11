import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AchievementIcon } from '../AchievementIcon';

describe('AchievementIcon', () => {
  it('shows the badge art when the manifest has it', () => {
    render(<AchievementIcon achievementKey="FIRST_BLOOD" emoji="🎯" />);
    expect(screen.getByTestId('achievement-art')).toHaveAttribute('src', '/progression/badges/first_blood.webp');
  });

  it('falls back to the emoji when the art fails to load', () => {
    render(<AchievementIcon achievementKey="FIRST_BLOOD" emoji="🎯" />);
    fireEvent.error(screen.getByTestId('achievement-art'));
    expect(screen.getByText('🎯')).toBeInTheDocument();
  });

  it('uses the emoji for keys with no art', () => {
    render(<AchievementIcon achievementKey="NOT_A_KEY" emoji="🏅" />);
    expect(screen.getByText('🏅')).toBeInTheDocument();
  });
});
