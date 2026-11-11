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
  it('Given a class, Then the desk offers Start game and Share code once each; results live in the tile row under it', () => {
    render(<HomeHero classrooms={[CLASS]} selectedId="c1" onSelect={vi.fn()} language="en" t={t} />);
    expect(screen.getAllByTestId('home-start-live')).toHaveLength(1);
    expect(screen.getAllByTestId('home-share-code')).toHaveLength(1);
    expect(screen.queryByTestId('home-see-results')).toBeNull();
    const panel = screen.getByTestId('home-desk-code-panel');
    expect(panel).toContainElement(screen.getByTestId('home-desk-code'));
    expect(panel).toContainElement(screen.getByTestId('home-share-code'));
  });

  it('When the teacher taps Share code, Then the one share sheet opens', () => {
    render(<HomeHero classrooms={[CLASS]} selectedId="c1" onSelect={vi.fn()} language="en" t={t} />);
    expect(screen.queryByTestId('home-share-sheet')).toBeNull();
    fireEvent.click(screen.getByTestId('home-share-code'));
    expect(screen.getByTestId('home-share-sheet')).toBeInTheDocument();
    expect(screen.getByTestId('home-share-code')).toHaveTextContent('eduShell.home.shareCode');
  });
});
