import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('../HomeShareSheet', () => ({ HomeShareSheet: () => null }));

import { HomeHero } from '../HomeHero';

const t = (k: string) => k;
const A = { id: 'c1', name: 'Period 3', join_code: 'AB12CD', member_count: 4 };
const B = { id: 'c2', name: 'Period 5', join_code: 'ZZ99YY', member_count: 2 };

describe('<HomeHero> class page link', () => {
  it('Given a selected class, Then a quiet link beside the meta opens that class page', () => {
    render(<HomeHero classrooms={[A, B]} selectedId="c2" onSelect={vi.fn()} language="he" t={t} meta={<span data-testid="meta">4</span>} />);
    const link = screen.getByTestId('home-class-page');
    expect(link).toHaveAttribute('href', '/he/teacher/classroom/c2');
    expect(link).toHaveTextContent('eduShell.home.classPage');
    expect(link.className).toContain('min-h-[44px]');
    expect(screen.getByTestId('home-hero-meta-row')).toContainElement(screen.getByTestId('meta'));
    expect(screen.getByTestId('home-hero-meta-row')).toContainElement(link);
  });

  it('Given the class link, Then Start stays the only primary action', () => {
    render(<HomeHero classrooms={[A]} selectedId="c1" onSelect={vi.fn()} language="en" t={t} />);
    expect(screen.getByTestId('home-class-page')).toHaveAttribute('href', '/en/teacher/classroom/c1');
    expect(screen.getAllByTestId('home-start-live')).toHaveLength(1);
  });
});
