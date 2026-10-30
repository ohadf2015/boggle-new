import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('@/components/teacher/hq/HqProjectorSheet', () => ({ HqProjectorSheet: () => null }));

import { HomeHero } from '../HomeHero';

const t = (k: string, p?: Record<string, string | number>) => (p ? `${k}:${JSON.stringify(p)}` : k);
const CLASS = { id: 'c1', name: 'Period 3', join_code: 'AB12CD', member_count: 4 };

describe('<HomeHero> labels', () => {
  it('Given the projector button goes icon-only on phones, Then it still names what it does on hover', () => {
    render(<HomeHero classrooms={[CLASS]} selectedId="c1" onSelect={vi.fn()} language="en" t={t} />);
    const button = screen.getByTestId('home-class-code');
    expect(button).toHaveAttribute('title', 'academy.hq.openProjector');
    expect(button).toHaveTextContent('academy.hq.openProjector');
  });

  it('Given the main button only opens the game picker, Then it says so', () => {
    render(<HomeHero classrooms={[CLASS]} selectedId="c1" onSelect={vi.fn()} language="en" t={t} />);
    expect(screen.getByTestId('home-start-live')).toHaveTextContent('eduShell.home.startLive');
  });
});
