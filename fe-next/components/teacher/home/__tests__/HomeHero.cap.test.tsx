import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('@/components/teacher/hq/HqProjectorSheet', () => ({ HqProjectorSheet: () => null }));

import { HomeHero } from '../HomeHero';

const t = (k: string, p?: Record<string, string | number>) => (p ? `${k}:${JSON.stringify(p)}` : k);
const CLASSES = [
  { id: 'c1', name: 'Period 3', join_code: 'AB12', member_count: 4 },
  { id: 'c2', name: 'Period 4', join_code: 'CD34', member_count: 5 },
];

describe('<HomeHero> free-class count', () => {
  it('Given a free teacher, Then the class count sits inside the class menu, not on the hero', () => {
    render(<HomeHero classrooms={CLASSES} selectedId="c1" onSelect={vi.fn()} language="en" t={t} capLabel="2 of 3 free classes used" />);
    expect(screen.queryByText('2 of 3 free classes used')).not.toBeInTheDocument();
    fireEvent.pointerDown(screen.getByTestId('home-class-switcher'), { button: 0, ctrlKey: false, pointerType: 'mouse' });
    expect(screen.getByTestId('home-class-menu-cap')).toHaveTextContent('2 of 3 free classes used');
  });

  it('Given a Pro teacher, Then the class menu shows no count', () => {
    render(<HomeHero classrooms={CLASSES} selectedId="c1" onSelect={vi.fn()} language="en" t={t} />);
    fireEvent.pointerDown(screen.getByTestId('home-class-switcher'), { button: 0, ctrlKey: false, pointerType: 'mouse' });
    expect(screen.getAllByTestId('home-class-option')).toHaveLength(2);
    expect(screen.queryByTestId('home-class-menu-cap')).not.toBeInTheDocument();
  });

  it('Given no insight is passed, Then the hero has no filler line under the button', () => {
    render(<HomeHero classrooms={CLASSES} selectedId="c1" onSelect={vi.fn()} language="en" t={t} />);
    expect(screen.queryByTestId('home-insight')).not.toBeInTheDocument();
  });
});
