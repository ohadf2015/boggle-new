import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('@/components/teacher/hq/HqProjectorSheet', () => ({ HqProjectorSheet: () => null }));
vi.mock('../HomeShareSheet', () => ({
  HomeShareSheet: ({ open }: { open: boolean }) => (open ? <div data-testid="home-share-sheet" /> : null),
}));

import { HomeHero } from '../HomeHero';

const t = (k: string, p?: Record<string, string | number>) => (p ? `${k}:${JSON.stringify(p)}` : k);
const CLASS = { id: 'c1', name: 'Period 3', join_code: 'AB12CD', member_count: 4, language: 'he' };

describe('<HomeHero> actions', () => {
  it('Given a class, Then the desk offers Start and Share once each, with each code letter on its own tile', () => {
    render(<HomeHero classrooms={[CLASS]} selectedId="c1" onSelect={vi.fn()} language="en" t={t} />);
    expect(screen.getAllByTestId('home-start-live')).toHaveLength(1);
    expect(screen.getAllByTestId('home-share-code')).toHaveLength(1);
    expect(screen.queryByTestId('home-see-results')).toBeNull();
    const row = screen.getByTestId('home-join-row');
    expect(within(row).getByTestId('home-desk-code')).toHaveTextContent('AB12CD');
    expect(within(row).getByTestId('home-share-code')).toBeInTheDocument();
    expect(within(row).getAllByTestId('home-desk-code-tile').map((el) => el.textContent).join('')).toBe('AB12CD');
  });

  it('When the teacher taps Share code, Then the one share sheet opens', () => {
    render(<HomeHero classrooms={[CLASS]} selectedId="c1" onSelect={vi.fn()} language="en" t={t} />);
    expect(screen.queryByTestId('home-share-sheet')).toBeNull();
    fireEvent.click(screen.getByTestId('home-share-code'));
    expect(screen.getByTestId('home-share-sheet')).toBeInTheDocument();
    expect(screen.getByTestId('home-share-code')).toHaveTextContent('eduShell.home.shareCode');
  });

  it('Given the page owns sharing, When Share is tapped, Then it asks the page and opens no second sheet', () => {
    const onShare = vi.fn();
    render(<HomeHero classrooms={[CLASS]} selectedId="c1" onSelect={vi.fn()} language="en" t={t} onShare={onShare} />);
    fireEvent.click(screen.getByTestId('home-share-code'));
    expect(onShare).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('home-share-sheet')).toBeNull();
  });

  it('Given the class page, Then Start goes where the page says and is the marked hero action', () => {
    render(<HomeHero classrooms={[CLASS]} selectedId="c1" onSelect={vi.fn()} language="en" t={t} startHref="/start" testIds={{ start: 'class-page-start', code: 'class-page-code', share: 'class-page-share' }} />);
    const start = screen.getByTestId('class-page-start');
    expect(start).toHaveAttribute('href', '/start');
    expect(start).toHaveAttribute('data-hero', 'true');
    expect(screen.getByTestId('class-page-code')).toHaveTextContent('AB12CD');
    expect(screen.getByTestId('class-page-share')).toBeInTheDocument();
  });

  it('Given the class page and a replay, Then Play again carries the page start id', () => {
    render(<HomeHero classrooms={[CLASS]} selectedId="c1" onSelect={vi.fn()} language="en" t={t} replay={{ kind: 'ready', href: '/r', detail: 'x' }} testIds={{ start: 'class-page-start' }} />);
    expect(screen.getByTestId('class-page-start')).toHaveAttribute('href', '/r');
  });
});
