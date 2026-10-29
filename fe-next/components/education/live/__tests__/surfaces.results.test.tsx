import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EduLiveSurfacesProvider } from '@/components/education/live/eduLiveSurfaces';
import ClassroomTvResultsScreen, { type ClassroomTvResultsScreenProps } from '@/host/components/tv-results/ClassroomTvResultsScreen';
import type { ClassroomSummary } from '@/shared/types/classroom';

vi.mock('@/components/education/live/EduHostResults', () => ({
  default: () => <div data-testid="real-edu-host-results" />,
  EduHostResults: () => <div data-testid="real-edu-host-results" />,
}));

const summary = { podium: [] } as unknown as ClassroomSummary;

function Override(props: ClassroomTvResultsScreenProps) {
  return <button type="button" data-testid="edu-host-results" onClick={props.onRematch} />;
}

describe('edu live surfaces — host results', () => {
  it('given the edu live provider, when a classroom round ends, then the edu results own the screen', () => {
    render(
      <EduLiveSurfacesProvider value={{ ClassroomResults: Override }}>
        <ClassroomTvResultsScreen summary={summary} t={(k) => k} onRematch={vi.fn()} />
      </EduLiveSurfacesProvider>,
    );
    expect(screen.getByTestId('edu-host-results')).toBeInTheDocument();
    expect(screen.queryByTestId('real-edu-host-results')).not.toBeInTheDocument();
  });

  it('given no provider, when a classroom round ends, then the edu host results still own the screen', () => {
    render(<ClassroomTvResultsScreen summary={summary} t={(k) => k} />);
    expect(screen.getByTestId('real-edu-host-results')).toBeInTheDocument();
  });
});
