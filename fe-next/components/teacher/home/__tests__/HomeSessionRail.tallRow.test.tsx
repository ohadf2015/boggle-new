import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { HomeSessionRail } from '../HomeSessionRail';

vi.mock('next/image', () => ({ default: (props: Record<string, unknown>) => <span data-src={String(props.src)} /> }));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const t = (k: string) => k;
const NOW = Date.UTC(2026, 9, 30, 9);

function renderRail() {
  return render(
    <HomeSessionRail classroomId="c1" languages={['en']} gradeBand={null} nowMs={NOW} lastPlayedMs={null} ready locale="en" t={t} />,
  );
}

describe('HomeSessionRail on a tall screen', () => {
  it('Given any screen, Then the first row is still exactly three cards', () => {
    renderRail();
    expect(screen.getAllByTestId('home-session-card')).toHaveLength(3);
  });

  it('Given leftover height, Then a second row of up to three more sessions fills it, sized by the space left, not the viewport', () => {
    renderRail();
    const more = screen.getByTestId('home-session-more');
    expect(more.className).toMatch(/\[container:session-more\/size\]/);
    expect(more.className).toMatch(/(^|\s)flex-1(\s|$)/);
    expect(more.className).toMatch(/(^|\s)min-h-0(\s|$)/);
    const row = within(more).getAllByRole('list')[0];
    expect(row.className).toMatch(/(^|\s)hidden(\s|$)/);
    expect(row.className).toMatch(/\[@container_session-more_\(min-height:[\d.]+rem\)\]:grid/);
    const extra = within(more).getAllByTestId('home-session-card-more');
    expect(extra.length).toBeGreaterThan(0);
    expect(extra.length).toBeLessThanOrEqual(3);
  });

  it('Given a phone or tablet carousel, Then the second row never shows', () => {
    renderRail();
    expect(screen.getByTestId('home-session-more').className).toMatch(/(^|\s)hidden @2xl:block(\s|$)/);
  });

  it('Given both rows, Then no session appears twice', () => {
    renderRail();
    const ids = [...screen.getAllByTestId('home-session-card'), ...screen.getAllByTestId('home-session-card-more')].map(
      (li) => li.querySelector('a')?.getAttribute('href'),
    );
    expect(new Set(ids).size).toBe(ids.length);
  });
});
