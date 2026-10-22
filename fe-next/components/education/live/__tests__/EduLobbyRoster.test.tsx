import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('@/components/Avatar', () => ({ default: () => <span data-testid="avatar" /> }));
vi.mock('@/components/ui/ConfirmationDialog', () => ({
  ConfirmationDialog: ({ open, title, description, onConfirm }: { open: boolean; title?: string; description?: string; onConfirm: () => void }) =>
    open ? (
      <div data-testid="remove-confirm">
        <p data-testid="remove-confirm-title">{title}</p>
        <p data-testid="remove-confirm-body">{description}</p>
        <button type="button" data-testid="remove-confirm-ok" onClick={onConfirm} />
      </div>
    ) : null,
}));

import { EduLobbyRoster } from '@/components/education/live/EduLobbyRoster';

const t = (key: string, params?: Record<string, string | number>) => (params ? `${key}:${JSON.stringify(params)}` : key);
const classOf = (n: number) => Array.from({ length: n }, (_, i) => ({ username: `Student${i + 1}` }));

describe('EduLobbyRoster', () => {
  it.each([25, 32, 40])('given %i students, when the wall shows the roster, then every name is on it', (count) => {
    render(<EduLobbyRoster students={classOf(count)} readyUsernames={[]} t={t} />);
    expect(screen.getAllByTestId('edu-lobby-student')).toHaveLength(count);
    expect(screen.queryByText(/eduLiveRoom\.lobby\.moreJoined/)).not.toBeInTheDocument();
  });

  it('given a long name, when its chip truncates, then the full name stays on title and aria-label', () => {
    const name = 'Maximiliana-Alexandrova';
    render(<EduLobbyRoster students={[{ username: name }]} readyUsernames={[]} t={t} />);
    const chip = screen.getByTestId('edu-lobby-student');
    expect(chip.querySelector('[title]')).toHaveAttribute('title', name);
  });

  it('given no remove handler, when the roster shows, then there is no edit control', () => {
    render(<EduLobbyRoster students={classOf(3)} readyUsernames={[]} t={t} />);
    expect(screen.queryByTestId('edu-lobby-edit-roster')).not.toBeInTheDocument();
    expect(screen.queryByTestId('edu-lobby-remove')).not.toBeInTheDocument();
  });

  it('given a remove handler, when the wall first shows, then no remove buttons clutter the chips until the teacher opens edit', () => {
    render(<EduLobbyRoster students={classOf(3)} readyUsernames={[]} t={t} onRemove={vi.fn()} />);
    expect(screen.queryByTestId('edu-lobby-remove')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('edu-lobby-edit-roster'));
    expect(screen.getAllByTestId('edu-lobby-remove')).toHaveLength(3);
  });

  it('given edit mode, when the teacher removes a student and confirms, then the removal fires once and the confirm says they cannot rejoin', () => {
    const onRemove = vi.fn();
    render(<EduLobbyRoster students={[{ username: 'Noa' }, { username: 'Ido' }]} readyUsernames={[]} t={t} onRemove={onRemove} />);
    fireEvent.click(screen.getByTestId('edu-lobby-edit-roster'));
    fireEvent.click(screen.getAllByTestId('edu-lobby-remove')[1]);
    expect(onRemove).not.toHaveBeenCalled();
    expect(screen.getByTestId('remove-confirm-title')).toHaveTextContent('eduLiveRoom.lobby.removeConfirmTitle:{"name":"Ido"}');
    expect(screen.getByTestId('remove-confirm-body')).toHaveTextContent('eduLiveRoom.lobby.removeConfirmBody');
    fireEvent.click(screen.getByTestId('remove-confirm-ok'));
    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onRemove).toHaveBeenCalledWith('Ido');
  });

  it('given a removal the server never confirmed, when the roster shows, then that chip says it failed instead of spinning', () => {
    render(
      <EduLobbyRoster
        students={[{ username: 'Noa' }]}
        readyUsernames={[]}
        t={t}
        onRemove={vi.fn()}
        removeStatusOf={() => 'failed'}
      />
    );
    fireEvent.click(screen.getByTestId('edu-lobby-edit-roster'));
    expect(screen.getByTestId('edu-lobby-remove-failed')).toHaveTextContent('eduLiveRoom.lobby.removeFailed');
  });

  it('given a removal in flight, when the roster shows, then the remove button is busy and cannot double-fire', () => {
    render(
      <EduLobbyRoster
        students={[{ username: 'Noa' }]}
        readyUsernames={[]}
        t={t}
        onRemove={vi.fn()}
        removeStatusOf={() => 'removing'}
      />
    );
    fireEvent.click(screen.getByTestId('edu-lobby-edit-roster'));
    expect(screen.getByTestId('edu-lobby-remove')).toBeDisabled();
  });
});
