import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { HomeSessionRail } from '../HomeSessionRail';

vi.mock('next/image', () => ({ default: (props: Record<string, unknown>) => <span data-src={String(props.src)} /> }));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const t = (k: string, p?: Record<string, string | number>) => (p ? `${k}:${JSON.stringify(p)}` : k);
const NOW = Date.UTC(2026, 9, 30, 9);

describe('HomeSessionRail compact strip', () => {
  it('Given compact, Then the ready-made games are one row of three small links, not big cards', () => {
    render(<HomeSessionRail classroomId="c1" languages={['en']} gradeBand={null} nowMs={NOW} lastPlayedMs={null} ready locale="en" compact t={t} />);
    expect(screen.queryByTestId('home-session-card')).toBeNull();
    expect(screen.queryByTestId('home-session-more')).toBeNull();
    const chips = screen.getAllByTestId('home-session-chip');
    expect(chips).toHaveLength(3);
    expect(chips[0]).toHaveAttribute('href', expect.stringContaining('c1'));
    expect(chips[0]).toHaveTextContent('education.modePicker.minutes');
  });
});
