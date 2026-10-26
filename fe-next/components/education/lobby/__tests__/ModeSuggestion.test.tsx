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

import { ModeSuggestion } from '../ModeSuggestion';

const t = (key: string, params?: Record<string, string | number>) => (params ? `${key}|${JSON.stringify(params)}` : key);
const real = (gameMode: string) => ({ gameMode, playerCount: 20 });

beforeEach(() => {
  capture.mockReset();
  pro.loading = false;
  pro.hasPro = false;
  rounds.value = [real('classic'), real('vocab-quiz'), real('classic')];
});

describe('<ModeSuggestion>', () => {
  it('Given recent classic and quiz rounds, when it loads, then it offers one other mode and logs one shown event', async () => {
    render(<ModeSuggestion selected="classic" isBlocked={() => false} onPick={vi.fn()} t={t} />);
    const chip = await screen.findByTestId('mode-suggestion');
    expect(chip.textContent).toContain('eg2Modes.trySomethingNew');
    expect(chip.getAttribute('data-mode')).not.toMatch(/^(classic|vocab-quiz|boss-battle)$/);
    expect(capture).toHaveBeenCalledTimes(1);
    expect(capture).toHaveBeenCalledWith('edu_mode_suggestion_shown', expect.objectContaining({ suggested_mode: chip.getAttribute('data-mode') }));
  });

  it('Given the chip, when tapped, then the lobby switches to that mode, an accepted event fires and the chip goes away', async () => {
    const onPick = vi.fn();
    const { rerender } = render(<ModeSuggestion selected="classic" isBlocked={() => false} onPick={onPick} t={t} />);
    const chip = await screen.findByTestId('mode-suggestion');
    const mode = chip.getAttribute('data-mode');
    fireEvent.click(chip);
    expect(onPick).toHaveBeenCalledWith(mode);
    expect(capture).toHaveBeenCalledWith('edu_mode_suggestion_accepted', expect.objectContaining({ suggested_mode: mode }));
    rerender(<ModeSuggestion selected={mode as 'blast'} isBlocked={() => false} onPick={onPick} t={t} />);
    expect(screen.queryByTestId('mode-suggestion')).toBeNull();
  });

  it('Given the Pro check still loading, when rounds arrive, then nothing renders and nothing is logged', async () => {
    pro.loading = true;
    render(<ModeSuggestion selected="classic" isBlocked={() => false} onPick={vi.fn()} t={t} />);
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByTestId('mode-suggestion')).toBeNull();
    expect(capture).not.toHaveBeenCalled();
  });

  it('Given a teacher with no rounds yet, when it loads, then it renders nothing', async () => {
    rounds.value = [];
    render(<ModeSuggestion selected="classic" isBlocked={() => false} onPick={vi.fn()} t={t} />);
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByTestId('mode-suggestion')).toBeNull();
  });

  it('Given every other mode blocked by the lobby, when it loads, then it renders nothing', async () => {
    render(<ModeSuggestion selected="classic" isBlocked={() => true} onPick={vi.fn()} t={t} />);
    await waitFor(() => expect(screen.queryByTestId('mode-suggestion')).toBeNull());
  });
});
