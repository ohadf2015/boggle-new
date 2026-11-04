import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('@/components/teacher/hq/HqProjectorSheet', () => ({ HqProjectorSheet: () => null }));
vi.mock('next/link', () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));

import { HomeHero } from '../HomeHero';

const t = (k: string) => k;
const CLASS = { id: 'c1', name: 'Period 3', join_code: 'AB12CD', member_count: 1 };

function renderHero() {
  return render(
    <HomeHero
      classrooms={[CLASS]}
      selectedId="c1"
      onSelect={vi.fn()}
      language="en"
      t={t}
      rehearse={<button type="button" data-testid="rehearse">bots</button>}
      showCode={false}
      codeSlot={<section data-testid="slot-card" />}
    />,
  );
}

describe('<HomeHero> layout', () => {
  it('Given a phone, Then the desk reads top to bottom: which class, then the code, then Start', () => {
    renderHero();
    const title = screen.getByRole('heading', { level: 2 });
    const slot = screen.getByTestId('home-hero-code-slot');
    const start = screen.getByTestId('home-start-live');
    expect(title.compareDocumentPosition(slot) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(slot.compareDocumentPosition(start) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('Given a wide desk, Then the class and Start share one column and the code card fills the other', () => {
    renderHero();
    const grid = screen.getByTestId('home-hero-grid');
    expect(grid.className).toMatch(/@3xl\/hero:grid-cols-/);
    const slot = screen.getByTestId('home-hero-code-slot');
    expect(slot.className.split(/\s+/)).toEqual(expect.arrayContaining(['min-w-0', '@3xl/hero:col-start-2', '@3xl/hero:row-span-2']));
    const startRow = screen.getByTestId('home-hero-start-row');
    expect(startRow.className.split(/\s+/)).toEqual(expect.arrayContaining(['@3xl/hero:col-start-1', '@3xl/hero:row-start-2']));
  });

  it('Given a phone, Then Start spans the card and the practice button sits under it with its words', () => {
    renderHero();
    const startRow = screen.getByTestId('home-hero-start-row');
    expect(startRow.className).toMatch(/(^|\s)flex-col(\s|$)/);
    expect(screen.getByTestId('home-start-live').className).toMatch(/(^|\s)w-full(\s|$)/);
    expect(startRow.contains(screen.getByTestId('rehearse'))).toBe(true);
  });

  it('Then the desk has one even border, no thick colored edge on one side', () => {
    renderHero();
    expect(screen.getByTestId('home-hero').className).not.toMatch(/border-s-\[/);
  });
});
