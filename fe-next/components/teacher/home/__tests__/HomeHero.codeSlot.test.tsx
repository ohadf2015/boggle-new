import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('@/components/teacher/hq/HqProjectorSheet', () => ({ HqProjectorSheet: () => null }));

import { HomeHero } from '../HomeHero';

const t = (k: string) => k;
const CLASS = { id: 'c1', name: 'Period 3', join_code: 'AB12CD', member_count: 1 };

describe('<HomeHero> code slot', () => {
  it('Given a size-contained card in the code slot, When the desk lays out in two columns, Then the slot owns a grid column instead of collapsing to its padding', () => {
    render(
      <HomeHero
        classrooms={[CLASS]}
        selectedId="c1"
        onSelect={vi.fn()}
        language="en"
        t={t}
        showCode={false}
        codeSlot={<section data-testid="slot-card" className="@container" />}
      />,
    );
    const wrapper = screen.getByTestId('slot-card').parentElement!;
    expect(wrapper).toHaveAttribute('data-testid', 'home-hero-code-slot');
    expect(wrapper.className.split(/\s+/)).toEqual(expect.arrayContaining(['min-w-0', '@3xl/hero:col-start-2']));
    expect(wrapper.parentElement).toHaveAttribute('data-testid', 'home-hero-grid');
  });
});
