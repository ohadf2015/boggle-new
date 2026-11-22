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
  it('Given a class that played, When the desk renders with its secondary, Then Play again is the one hero action and the secondary is a smaller, lighter cyan button', () => {
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
    expect(secondary).toContain('bg-neo-cyan');
    expect(primary).toContain('shadow-hard-xl');
    expect(secondary).not.toContain('shadow-hard-xl');
    expect(secondary).not.toContain('min-h-[72px]');
    expect(secondary).not.toContain('min-h-[60px]');
  });
});
