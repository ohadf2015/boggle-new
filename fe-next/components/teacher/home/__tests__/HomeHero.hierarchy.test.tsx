import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('../HomeShareSheet', () => ({ HomeShareSheet: () => null }));

import { HomeHero } from '../HomeHero';
import { HERO_SECONDARY } from '../homeStyles';

const t = (k: string) => k;
const CLASS = { id: 'c1', name: 'Period 3', join_code: 'AB12CD', member_count: 4 };
const classes = (s: string) => s.split(/\s+/);

describe('<HomeHero> hierarchy', () => {
  it('Given a class that played, When the desk renders with its secondary, Then Play again is the one hero action and the secondary is a small outlined chip', () => {
    render(
      <HomeHero
        classrooms={[CLASS]}
        selectedId="c1"
        onSelect={vi.fn()}
        language="en"
        t={t}
        replay={{ kind: 'ready', href: '/again', detail: 'Word Hunt' }}
        rehearse={<button type="button" data-testid="rehearse" className={HERO_SECONDARY}>try</button>}
      />,
    );
    const heroes = document.querySelectorAll('[data-hero="true"]');
    expect(heroes).toHaveLength(1);
    expect(heroes[0]).toBe(screen.getByTestId('home-play-again'));

    const primary = classes(screen.getByTestId('home-play-again').className);
    const secondary = classes(screen.getByTestId('rehearse').className);
    expect(secondary).not.toContain('bg-neo-cyan');
    expect(secondary).toContain('rounded-neo-pill');
    expect(primary).toContain('shadow-[0_6px_0_0]');
    expect(secondary).toContain('shadow-[0_2px_0_0]');
    expect(secondary).not.toContain('min-h-[72px]');
    expect(secondary).not.toContain('min-h-[60px]');
  });
});
