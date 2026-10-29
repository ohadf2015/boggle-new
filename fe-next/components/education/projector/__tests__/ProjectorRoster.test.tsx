import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';

const playPlayerJoinedSound = vi.fn();
vi.mock('@/contexts/SoundEffectsContext', () => ({ useSoundEffects: () => ({ playPlayerJoinedSound }) }));
vi.mock('@/components/Avatar', () => ({ default: () => <span data-testid="avatar" /> }));
vi.mock('@/components/ui/ConfirmationDialog', () => ({
  ConfirmationDialog: ({ open, title, description, onConfirm }: { open: boolean; title?: string; description?: string; onConfirm: () => void }) =>
    open ? (
      <div>
        <p data-testid="remove-confirm-title">{title}</p>
        <p data-testid="remove-confirm-body">{description}</p>
        <button type="button" data-testid="remove-confirm-ok" onClick={onConfirm} />
      </div>
    ) : null,
}));

import ProjectorRoster from '../ProjectorRoster';
import { rosterTier } from '../projectorLobbyModel';

const t = (key: string, params?: Record<string, string | number>) => (params ? `${key}:${JSON.stringify(params)}` : key);
const classOf = (n: number, from = 0) => Array.from({ length: n }, (_, i) => ({ username: `Student${from + i + 1}` }));

describe('ProjectorRoster — who is in the room', () => {
  beforeEach(() => playPlayerJoinedSound.mockClear());

  it.each([25, 32, 40])('Given %i students, Then every name is on the wall, each with a face', (count) => {
    render(<ProjectorRoster students={classOf(count)} t={t} />);
    expect(screen.getAllByTestId('projector-student')).toHaveLength(count);
    expect(screen.getAllByTestId('avatar')).toHaveLength(count);
  });

  it('Given students, Then the heading counts them in words', () => {
    render(<ProjectorRoster students={classOf(3)} t={t} />);
    expect(screen.getByTestId('projector-count')).toHaveTextContent('eduLiveRoom.lobby.joined:{"count":3}');
  });

  it('Given a long name, Then the chip truncates but the full name stays on its title', () => {
    render(<ProjectorRoster students={[{ username: 'Maximiliana-Alexandrova' }]} t={t} />);
    expect(screen.getByTestId('projector-student').querySelector('[title]')).toHaveAttribute('title', 'Maximiliana-Alexandrova');
  });

  it('Given nobody yet, Then the mascot shows the class how to join and no ready bar shows', () => {
    render(<ProjectorRoster students={[]} t={t} />);
    expect(screen.getByTestId('projector-roster-empty').querySelector('img')?.getAttribute('src')).toContain('edu-scanJoin');
    expect(screen.queryByTestId('projector-ready-count')).toBeNull();
  });

  it('plays the join sound for a new arrival, never for students already in the room', () => {
    const { rerender } = render(<ProjectorRoster students={classOf(1)} t={t} />);
    expect(playPlayerJoinedSound).not.toHaveBeenCalled();
    rerender(<ProjectorRoster students={classOf(2)} t={t} />);
    expect(playPlayerJoinedSound).toHaveBeenCalledTimes(1);
  });
});

describe('ProjectorRoster — one sting per arrival', () => {
  it('Given an unrelated re-render with a new sound handler, Then the last arrival is not announced again', async () => {
    const mod = await import('@/contexts/SoundEffectsContext');
    const first = vi.fn();
    const second = vi.fn();
    const spy = vi.spyOn(mod, 'useSoundEffects').mockReturnValue({ playPlayerJoinedSound: first } as never);
    const { rerender } = render(<ProjectorRoster students={classOf(1)} t={t} />);
    rerender(<ProjectorRoster students={classOf(2)} t={t} />);
    spy.mockReturnValue({ playPlayerJoinedSound: second } as never);
    rerender(<ProjectorRoster students={classOf(2)} t={t} readyUsernames={['Student1']} />);
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe('ProjectorRoster — readiness', () => {
  it('Given 3 of 10 ready, Then a progress bar reads 3 of 10 and the ready chips carry a check', () => {
    const students = classOf(10);
    render(<ProjectorRoster students={students} readyUsernames={['Student1', 'Student2', 'Student3']} t={t} />);
    const bar = screen.getByTestId('projector-ready-count');
    expect(bar).toHaveAttribute('role', 'progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '3');
    expect(bar).toHaveAttribute('aria-valuemax', '10');
    expect(screen.getAllByTestId('projector-ready-check')).toHaveLength(3);
  });

  it('dims the chips still waiting once someone is ready, never before', () => {
    const { rerender } = render(<ProjectorRoster students={classOf(2)} readyUsernames={[]} t={t} />);
    expect(screen.getAllByTestId('projector-student').map((c) => c.dataset.dim)).toEqual(['false', 'false']);
    rerender(<ProjectorRoster students={classOf(2)} readyUsernames={['Student1']} t={t} />);
    expect(screen.getAllByTestId('projector-student').map((c) => c.dataset.dim)).toEqual(['false', 'true']);
  });
});

describe('ProjectorRoster — fits any frame', () => {
  it('is its own inline-size container so chips size from the roster, not the viewport', () => {
    render(<ProjectorRoster students={classOf(5)} t={t} />);
    expect(screen.getByTestId('projector-roster').className).toMatch(/(^|\s)@container(\s|$)/);
    expect(screen.getByTestId('projector-roster').outerHTML).not.toMatch(/\d(vw|vh)\b/);
  });

  it.each([5, 20, 35, 60])('Given %i students, Then the list and chips take that tier', (n) => {
    render(<ProjectorRoster students={classOf(n)} t={t} />);
    const tier = rosterTier(n);
    for (const cls of tier.grid.split(' ')) expect(screen.getByTestId('projector-roster-list').className).toContain(cls);
    for (const cls of tier.chip.split(' ')) expect(screen.getAllByTestId('projector-student')[0].className).toContain(cls);
  });
});

describe('ProjectorRoster — arrivals pop, bursts land still', () => {
  it('pops a chip in at 300ms or less, only when motion is allowed', () => {
    const { rerender } = render(<ProjectorRoster students={classOf(1)} t={t} />);
    rerender(<ProjectorRoster students={classOf(2)} t={t} />);
    const pop = screen.getAllByTestId('projector-student')[1].className.match(/motion-safe:animate-\[edu-live-pop_(\d+)ms/);
    expect(pop).not.toBeNull();
    expect(Number(pop![1])).toBeLessThanOrEqual(300);
  });

  it('Given more than 30 arrivals in a second, Then the new chips land without the pop', () => {
    vi.useFakeTimers();
    try {
      const { rerender } = render(<ProjectorRoster students={classOf(1)} t={t} />);
      act(() => {
        rerender(<ProjectorRoster students={classOf(32)} t={t} />);
      });
      expect(screen.getByTestId('projector-roster-list')).toHaveAttribute('data-burst', 'true');
      expect(screen.getAllByTestId('projector-student')[31].className).not.toMatch(/edu-live-pop/);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('ProjectorRoster — teacher removes a student', () => {
  it('Given no remove handler, Then there is no edit control', () => {
    render(<ProjectorRoster students={classOf(3)} t={t} />);
    expect(screen.queryByTestId('projector-edit-roster')).toBeNull();
  });

  it('Given a remove handler, Then remove buttons appear only after the teacher opens edit', () => {
    render(<ProjectorRoster students={classOf(3)} t={t} onRemove={vi.fn()} />);
    expect(screen.queryByTestId('projector-remove')).toBeNull();
    fireEvent.click(screen.getByTestId('projector-edit-roster'));
    expect(screen.getAllByTestId('projector-remove')).toHaveLength(3);
  });

  it('Given edit mode, When the teacher confirms a removal, Then it fires once and the confirm says they cannot rejoin', () => {
    const onRemove = vi.fn();
    render(<ProjectorRoster students={[{ username: 'Noa' }, { username: 'Ido' }]} t={t} onRemove={onRemove} />);
    fireEvent.click(screen.getByTestId('projector-edit-roster'));
    fireEvent.click(screen.getAllByTestId('projector-remove')[1]);
    expect(onRemove).not.toHaveBeenCalled();
    expect(screen.getByTestId('remove-confirm-title')).toHaveTextContent('eduLiveRoom.lobby.removeConfirmTitle:{"name":"Ido"}');
    expect(screen.getByTestId('remove-confirm-body')).toHaveTextContent('eduLiveRoom.lobby.removeConfirmBody');
    fireEvent.click(screen.getByTestId('remove-confirm-ok'));
    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onRemove).toHaveBeenCalledWith('Ido');
  });

  it('Given a removal the server never confirmed, Then that chip says it failed', () => {
    render(<ProjectorRoster students={[{ username: 'Noa' }]} t={t} onRemove={vi.fn()} removeStatusOf={() => 'failed'} />);
    fireEvent.click(screen.getByTestId('projector-edit-roster'));
    expect(screen.getByTestId('projector-remove-failed')).toHaveTextContent('eduLiveRoom.lobby.removeFailed');
  });

  it('Given a removal in flight, Then the remove button is busy and cannot double-fire', () => {
    render(<ProjectorRoster students={[{ username: 'Noa' }]} t={t} onRemove={vi.fn()} removeStatusOf={() => 'removing'} />);
    fireEvent.click(screen.getByTestId('projector-edit-roster'));
    expect(screen.getByTestId('projector-remove')).toBeDisabled();
  });

  it('Given edit mode, Then each remove button is a 44px touch target', () => {
    render(<ProjectorRoster students={classOf(45)} t={t} onRemove={vi.fn()} />);
    fireEvent.click(screen.getByTestId('projector-edit-roster'));
    const cls = screen.getAllByTestId('projector-remove')[0].className;
    expect(cls).toContain('min-h-11');
    expect(cls).toContain('min-w-11');
  });

  it('never offers to remove a bot', () => {
    render(<ProjectorRoster students={[{ username: 'Bot', isBot: true }, { username: 'Noa' }]} t={t} onRemove={vi.fn()} />);
    fireEvent.click(screen.getByTestId('projector-edit-roster'));
    expect(screen.getAllByTestId('projector-remove')).toHaveLength(1);
  });
});
