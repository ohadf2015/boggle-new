import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const rounds = vi.hoisted(() => ({ value: [] as { gameMode: string; playerCount: number }[] }));
const pro = vi.hoisted(() => ({ loading: false, hasPro: false }));
const capture = vi.hoisted(() => vi.fn());

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'teacher-1' } }) }));
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => ({ ...pro, known: true }) }));
vi.mock('@/lib/education/recentTeacherRounds', () => ({
  fetchRecentTeacherRounds: vi.fn(async () => rounds.value),
}));
vi.mock('@/lib/education/telemetryCore', () => ({ safeCapture: capture }));

import { useState } from 'react';
import { useModeSuggestion } from '../ModeSuggestion';
import { LobbyModeGrid } from '../LobbyModeGrid';
import type { ClassroomCatalogueId } from '@/lib/education/classroomCatalogueId';

const t = (key: string, params?: Record<string, string | number>) => (params ? `${key}|${JSON.stringify(params)}` : key);
const real = (gameMode: string) => ({ gameMode, playerCount: 20 });

function Lobby({ isBlocked = () => false, onPick = vi.fn(), ready = true }: { isBlocked?: (id: ClassroomCatalogueId) => boolean; onPick?: (id: ClassroomCatalogueId) => void; ready?: boolean }) {
  const [selected, setSelected] = useState<ClassroomCatalogueId>('classic');
  const suggestion = useModeSuggestion({ selected, isBlocked, ready });
  return (
    <LobbyModeGrid
      selected={selected}
      suggested={suggestion.suggested}
      onPick={(id) => {
        suggestion.onPicked(id);
        onPick(id);
        setSelected(id);
      }}
      t={t}
    />
  );
}

beforeEach(() => {
  capture.mockReset();
  pro.loading = false;
  pro.hasPro = false;
  rounds.value = [real('classic'), real('vocab-quiz'), real('classic')];
});

describe('useModeSuggestion: a small New tag on one tile', () => {
  it('Given recent classic and quiz rounds, when it loads, then one other tile carries the tag and one shown event logs', async () => {
    render(<Lobby />);
    const tag = await screen.findByTestId('mode-suggestion');
    const mode = tag.getAttribute('data-mode');
    expect(mode).not.toMatch(/^(classic|vocab-quiz|boss-battle)$/);
    expect(screen.getByTestId(`mode-tile-${mode}`)).toContainElement(tag);
    expect(screen.getAllByTestId('mode-suggestion')).toHaveLength(1);
    expect(capture).toHaveBeenCalledTimes(1);
    expect(capture).toHaveBeenCalledWith('edu_mode_suggestion_shown', expect.objectContaining({ suggested_mode: mode }));
  });

  it('Given the tag, then it is a quiet outline, not a colored fill competing with GO LIVE', async () => {
    render(<Lobby />);
    const tag = await screen.findByTestId('mode-suggestion');
    expect(tag.className).not.toMatch(/bg-neo-(yellow|lime|cyan|pink|purple)/);
  });

  it('Given the tag, when its tile is picked, then the lobby switches, an accepted event fires and the tag goes away', async () => {
    const onPick = vi.fn();
    render(<Lobby onPick={onPick} />);
    const mode = (await screen.findByTestId('mode-suggestion')).getAttribute('data-mode')!;
    fireEvent.click(screen.getByTestId(`mode-tile-${mode}`));
    expect(onPick).toHaveBeenCalledWith(mode);
    expect(capture).toHaveBeenCalledWith('edu_mode_suggestion_accepted', expect.objectContaining({ suggested_mode: mode }));
    expect(screen.queryByTestId('mode-suggestion')).toBeNull();
  });

  it('Given another tile is picked, then no accepted event fires', async () => {
    render(<Lobby />);
    const mode = (await screen.findByTestId('mode-suggestion')).getAttribute('data-mode');
    const other = mode === 'blast' ? 'word-hunt' : 'blast';
    fireEvent.click(screen.getByTestId(`mode-tile-${other}`));
    expect(capture).not.toHaveBeenCalledWith('edu_mode_suggestion_accepted', expect.anything());
  });

  it('Given the Pro check still loading, when rounds arrive, then nothing renders and nothing is logged', async () => {
    pro.loading = true;
    render(<Lobby />);
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByTestId('mode-suggestion')).toBeNull();
    expect(capture).not.toHaveBeenCalled();
  });

  it('Given the lobby still settling its list and mode, when rounds arrive, then nothing is decided or logged yet', async () => {
    render(<Lobby ready={false} />);
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByTestId('mode-suggestion')).toBeNull();
    expect(capture).not.toHaveBeenCalled();
  });

  it('Given a teacher with no rounds yet, when it loads, then it renders nothing', async () => {
    rounds.value = [];
    render(<Lobby />);
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByTestId('mode-suggestion')).toBeNull();
  });

  it('Given every other mode blocked by the lobby, when it loads, then it renders nothing', async () => {
    render(<Lobby isBlocked={() => true} />);
    await waitFor(() => expect(screen.queryByTestId('mode-suggestion')).toBeNull());
  });
});
