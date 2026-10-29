import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('@/contexts/NavigationContext', () => ({ useNavigation: () => ({ setIsInGame: vi.fn() }) }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ language: 'en', t: (k: string) => k }) }));
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams('') }));
vi.mock('../LiveResultsPreviews', () => ({
  HostResultsPreview: () => <div data-testid="host-results-preview" />,
  PhoneResultsPreview: () => null,
  QuizPreview: () => null,
  DuelPreview: () => null,
  EndedPreview: () => null,
}));
vi.mock('../StudentQuizPreview', () => ({ StudentQuizPreview: () => null }));
vi.mock('../InGamePreview', () => ({ InGamePreview: () => null }));
vi.mock('@/components/education/projector/ProjectorLobby', () => ({ default: () => null }));
vi.mock('@/components/education/live/EduStudentLobby', () => ({ default: () => <div data-testid="real-student-lobby" />, EduStudentLobby: () => <div data-testid="real-student-lobby" /> }));
vi.mock('@/components/education/lobby/ClassroomWaitingStage', () => ({ ClassroomWaitingStage: () => <div data-testid="legacy-waiting-stage" /> }));
vi.mock('@/components/education/EducationHeader', () => ({ EducationHeader: () => <div data-testid="legacy-education-header" /> }));
vi.mock('@/components/Avatar', () => ({ default: () => null }));

import LiveSurfacePreview from '../LiveSurfacePreview';

describe('LiveSurfacePreview podium', () => {
  it('given ?preview=podium, when it renders, then it shows the real live host results, not a parallel recap', () => {
    render(<LiveSurfacePreview kind="podium" />);
    expect(screen.getByTestId('host-results-preview')).toBeInTheDocument();
  });

  it('given ?preview=waiting, when it renders, then it shows the student lobby /education/live mounts', () => {
    render(<LiveSurfacePreview kind="waiting" />);
    expect(screen.getByTestId('real-student-lobby')).toBeInTheDocument();
    expect(screen.queryByTestId('legacy-waiting-stage')).toBeNull();
    expect(screen.queryByTestId('legacy-education-header')).toBeNull();
  });
});
