import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/hooks/useMasterMute', () => ({ useMasterMute: () => ({ allMuted: false, toggle: () => {}, label: 'Mute', title: 'Mute' }) }));
vi.mock('@/contexts/NavigationContext', () => ({ useRegisterHeaderAudioControl: () => {} }));

import { MpResultsHeader } from '../MpResultsHeader';

const t = (k: string) => k;

describe('MpResultsHeader names a classroom-only mode', () => {
  it.each([
    ['wordcraft', 'teacher.classroom.gameModes.wordcraft'],
    ['vocab-quiz', 'teacher.classroom.gameModes.vocabQuiz'],
  ])('Given a %s round, Then the header says so instead of Surprise Mode', (mode, key) => {
    render(<MpResultsHeader branch="intermission" round={1} totalRounds={5} playedMode={mode} onLeave={vi.fn()} t={t} />);
    expect(screen.getByText(key)).toBeTruthy();
    expect(screen.queryByText('results.modeTease.label.random')).toBeNull();
  });

  it('keeps the registry label for a board mode', () => {
    render(<MpResultsHeader branch="intermission" round={1} totalRounds={5} playedMode="classic" onLeave={vi.fn()} t={t} />);
    expect(screen.getByText('results.modeTease.label.classic')).toBeTruthy();
  });
});
