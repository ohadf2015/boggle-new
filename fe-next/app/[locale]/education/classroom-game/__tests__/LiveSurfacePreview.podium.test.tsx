import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
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
import { catalogueEntry, catalogueKeys } from '@/components/education/ClassroomModeCatalogueData';

describe('LiveSurfacePreview podium', () => {
  it('given ?preview=podium, when it renders, then it shows the real live host results, not a parallel recap', () => {
    render(<LiveSurfacePreview kind="podium" />);
    expect(screen.getByTestId('host-results-preview')).toBeInTheDocument();
  });

  it('given ?preview=lobby, when a tile is picked, then the real ready panel follows it', () => {
    render(<LiveSurfacePreview kind="lobby" />);
    expect(screen.getByTestId('lobby-mode-grid')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('mode-tile-blast'));
    const blast = catalogueEntry('blast')!;
    expect(screen.getByTestId('mode-spotlight')).toHaveTextContent(catalogueKeys(blast).name);
  });

  it('given ?preview=setup, when it renders, then the real invite step shows the code, an empty roster and the projector as hero', () => {
    render(<LiveSurfacePreview kind="setup" />);
    expect(screen.getByTestId('setup-step-ready')).toBeInTheDocument();
    expect(screen.getByTestId('setup-join-code')).toHaveTextContent('BLDA7Q');
    expect(screen.getByTestId('setup-hero-slot')).toContainElement(screen.getByTestId('setup-projector'));
  });

  it('given ?preview=waiting, when it renders, then it shows the student lobby /education/live mounts', () => {
    render(<LiveSurfacePreview kind="waiting" />);
    expect(screen.getByTestId('real-student-lobby')).toBeInTheDocument();
    expect(screen.queryByTestId('legacy-waiting-stage')).toBeNull();
    expect(screen.queryByTestId('legacy-education-header')).toBeNull();
  });
});
