import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('@/components/teacher/hq/HqProjectorSheet', () => ({ HqProjectorSheet: () => null }));
vi.mock('../HomeShareSheet', () => ({
  HomeShareSheet: ({ open }: { open: boolean }) => (open ? <div data-testid="home-share-sheet" /> : null),
}));

import { HomeHero } from '../HomeHero';

const t = (k: string, p?: Record<string, string | number>) => (p ? `${k}:${JSON.stringify(p)}` : k);
const CLASS = { id: 'c1', name: 'Period 3', join_code: 'AB12CD', member_count: 4, language: 'he' };

describe('<HomeHero> three actions', () => {
  it('Given a class, Then Home offers Start game, Share code and See results, each once', () => {
    render(<HomeHero classrooms={[CLASS]} selectedId="c1" onSelect={vi.fn()} language="en" resultsHref="/en/teacher/reports?classroomId=c1" t={t} />);
    expect(screen.getAllByTestId('home-start-live')).toHaveLength(1);
    expect(screen.getAllByTestId('home-share-code')).toHaveLength(1);
    expect(screen.getByTestId('home-see-results')).toHaveAttribute('href', '/en/teacher/reports?classroomId=c1');
    expect(screen.getByTestId('home-see-results')).toHaveTextContent('eduShell.home.seeResults');
  });

  it('When the teacher taps Share code, Then the one share sheet opens', () => {
    render(<HomeHero classrooms={[CLASS]} selectedId="c1" onSelect={vi.fn()} language="en" t={t} />);
    expect(screen.queryByTestId('home-share-sheet')).toBeNull();
    fireEvent.click(screen.getByTestId('home-share-code'));
    expect(screen.getByTestId('home-share-sheet')).toBeInTheDocument();
    expect(screen.getByTestId('home-share-code')).toHaveTextContent('eduShell.home.shareCode');
  });
});
