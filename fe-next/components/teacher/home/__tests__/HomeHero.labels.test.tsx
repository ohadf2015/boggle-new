import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('@/components/teacher/hq/HqProjectorSheet', () => ({ HqProjectorSheet: () => null }));

import { HomeHero } from '../HomeHero';

const t = (k: string, p?: Record<string, string | number>) => (p ? `${k}:${JSON.stringify(p)}` : k);
const CLASS = { id: 'c1', name: 'Period 3', join_code: 'AB12CD', member_count: 4 };

describe('<HomeHero> labels', () => {
  it('Given the share button, Then it names what it does in words, not only an icon', () => {
    render(<HomeHero classrooms={[CLASS]} selectedId="c1" onSelect={vi.fn()} language="en" t={t} />);
    expect(screen.getByTestId('home-share-code')).toHaveTextContent('eduShell.home.shareCode');
  });

  it('Given the main button only opens the game picker, Then it says so', () => {
    render(<HomeHero classrooms={[CLASS]} selectedId="c1" onSelect={vi.fn()} language="en" t={t} />);
    expect(screen.getByTestId('home-start-live')).toHaveTextContent('eduShell.home.startLive');
  });
});
