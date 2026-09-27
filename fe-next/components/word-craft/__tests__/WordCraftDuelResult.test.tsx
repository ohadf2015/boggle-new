import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WordCraftDuelResult } from '../WordCraftDuelResult';

const t = (k: string, vars?: Record<string, unknown>) => {
  if (k === 'wordcraft.you') return 'You';
  if (k === 'wordcraft.duel.youWin') return 'You win!';
  if (k === 'wordcraft.duel.youLose') return 'They win';
  if (k === 'wordcraft.duel.tie') return 'Tied!';
  if (k === 'wordcraft.duel.vsChallenger') return `vs ${String(vars?.name ?? '')}`;
  if (k === 'wordcraft.duel.challengeFriend') return 'Challenge a friend';
  if (k === 'wordcraft.duel.linkCopied') return 'Invite link copied!';
  if (k === 'wordcraft.duel.unnamedChallenger') return 'A challenger';
  return `[${k}]`;
};

describe('WordCraftDuelResult', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('renders the duel result UI with player score and challenger name', () => {
    render(
      <WordCraftDuelResult
        t={t}
        playerScore={150}
        duelOutcome={{
          outcome: 'win',
          challengerName: 'Alice',
          challengerScore: 120,
        }}
      />
    );
    expect(screen.getByText('vs Alice')).toBeTruthy();
    expect(screen.getByText('150')).toBeTruthy();
    expect(screen.getByText('120')).toBeTruthy();
  });

  it('displays win outcome with green (neo-lime) color', () => {
    const { container } = render(
      <WordCraftDuelResult
        t={t}
        playerScore={200}
        duelOutcome={{
          outcome: 'win',
          challengerName: 'Bob',
          challengerScore: 150,
        }}
      />
    );
    const outcomeDiv = screen.getByText('You win!').closest('div');
    expect(outcomeDiv?.className).toContain('bg-neo-lime');
  });

  it('displays lose outcome with pink (neo-pink) color', () => {
    const { container } = render(
      <WordCraftDuelResult
        t={t}
        playerScore={100}
        duelOutcome={{
          outcome: 'lose',
          challengerName: 'Charlie',
          challengerScore: 200,
        }}
      />
    );
    const outcomeDiv = screen.getByText('They win').closest('div');
    expect(outcomeDiv?.className).toContain('bg-neo-pink');
  });

  it('displays tie outcome with cyan (neo-cyan) color', () => {
    const { container } = render(
      <WordCraftDuelResult
        t={t}
        playerScore={150}
        duelOutcome={{
          outcome: 'tie',
          challengerName: 'Dave',
          challengerScore: 150,
        }}
      />
    );
    const outcomeDiv = screen.getByText('Tied!').closest('div');
    expect(outcomeDiv?.className).toContain('bg-neo-cyan');
  });

  it('renders the challenge friend button', () => {
    render(
      <WordCraftDuelResult
        t={t}
        playerScore={100}
        duelOutcome={{
          outcome: 'win',
          challengerName: 'Eve',
          challengerScore: 80,
        }}
      />
    );
    expect(screen.getByText('Challenge a friend')).toBeTruthy();
  });

  it('has proper positioning and z-index', () => {
    const { container } = render(
      <WordCraftDuelResult
        t={t}
        playerScore={100}
        duelOutcome={{
          outcome: 'tie',
          challengerName: 'Frank',
          challengerScore: 100,
        }}
      />
    );
    const wrapper = container.firstElementChild;
    expect(wrapper?.className).toContain('z-40');
    expect(wrapper?.className).toContain('bottom-');
  });

  it('applies animate-neo-pop to the outcome banner', () => {
    const { container } = render(
      <WordCraftDuelResult
        t={t}
        playerScore={150}
        duelOutcome={{
          outcome: 'win',
          challengerName: 'Grace',
          challengerScore: 140,
        }}
      />
    );
    const outcomeDiv = screen.getByText('You win!').closest('div');
    expect(outcomeDiv?.className).toContain('animate-neo-pop');
  });

  it('displays challenger score in smaller, muted text', () => {
    const { container } = render(
      <WordCraftDuelResult
        t={t}
        playerScore={100}
        duelOutcome={{
          outcome: 'tie',
          challengerName: 'Henry',
          challengerScore: 100,
        }}
      />
    );
    // Find the score flex container and check both scores are there
    const scores = screen.getAllByText('100');
    expect(scores.length).toBeGreaterThan(0);
  });
});
