import { describe, it, expect, vi, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('@/contexts/SoundEffectsContext', () => ({ useSoundEffects: () => ({ playPlayerJoinedSound: vi.fn() }) }));
vi.mock('@/components/Avatar', () => ({ default: () => <span data-testid="avatar" /> }));

import ProjectorRoster from '../ProjectorRoster';

const t = (key: string, params?: Record<string, string | number>) => (params ? `${key}:${JSON.stringify(params)}` : key);
const classOf = (n: number) => Array.from({ length: n }, (_, i) => ({ username: `Student${i + 1}` }));
const tokens = (el: Element) => el.className.split(/\s+/);

describe('ProjectorRoster — hosting from a phone', () => {
  afterEach(cleanup);

  it('Given nobody joined, Then the how-to-join hint is shown at every width, phone included', () => {
    render(<ProjectorRoster students={[]} t={t} />);
    const hint = screen.getByText('eduLiveRoom.lobby.waitingHint');
    expect(tokens(hint).some((c) => c === 'hidden' || c.endsWith(':hidden'))).toBe(false);
  });

  it('Given more students than fit a phone, When the teacher taps the +N chip, Then every name is listed and the chip offers to show fewer', () => {
    render(<ProjectorRoster students={classOf(12)} t={t} />);
    const toggle = screen.getByRole('button', { name: 'eduLiveRoom.lobby.moreJoined:{"count":4}' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    const chips = screen.getAllByTestId('projector-student');
    expect(chips.every((c) => !tokens(c).includes('@max-md:hidden'))).toBe(true);
    const fewer = screen.getByRole('button', { name: 'eduLiveRoom.lobby.showFewer' });
    expect(fewer).toHaveAttribute('aria-expanded', 'true');
  });

  it('Given the full list is open, When Show fewer is tapped, Then it collapses back to the first names and the +N chip', () => {
    render(<ProjectorRoster students={classOf(12)} t={t} />);
    fireEvent.click(screen.getByRole('button', { name: 'eduLiveRoom.lobby.moreJoined:{"count":4}' }));
    fireEvent.click(screen.getByRole('button', { name: 'eduLiveRoom.lobby.showFewer' }));
    const chips = screen.getAllByTestId('projector-student');
    expect(chips.slice(8).every((c) => tokens(c).includes('@max-md:hidden'))).toBe(true);
    expect(screen.getByRole('button', { name: 'eduLiveRoom.lobby.moreJoined:{"count":4}' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('Given more students than fit a phone, When nothing is tapped, Then the TV layout keeps the chip hidden at large sizes', () => {
    render(<ProjectorRoster students={classOf(12)} t={t} />);
    const more = screen.getByTestId('projector-more-joined');
    expect(tokens(more)).toContain('hidden');
    expect(tokens(more)).toContain('@max-md:flex');
  });
});
