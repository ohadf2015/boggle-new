import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WordCraftPlayFriendControl } from '../WordCraftPlayFriendControl';

const t = (path: string, fallbackOrParams?: string | Record<string, string | number>) => {
  if (path === 'wordcraft.duel.playFriend') return 'Play vs a friend';
  if (path === 'wordcraft.duel.passPlay') return 'Same device — Pass & Play';
  if (path === 'wordcraft.duel.challengeFriend') return 'Challenge a friend';
  if (path === 'wordcraft.duel.shareText') return `I scored ${(fallbackOrParams as Record<string, string | number>)?.score} in WordCraft — can you beat my board?`;
  if (path === 'wordcraft.duel.shareTitleChallenge') return 'Challenge me at WordCraft';
  if (path === 'wordcraft.duel.linkCopied') return 'Invite link copied!';
  if (path === 'wordcraft.duel.unnamedChallenger') return 'A challenger';
  return `[${path}]`;
};

describe('WordCraftPlayFriendControl', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('renders the control with both buttons', () => {
    render(
      <WordCraftPlayFriendControl
        t={t}
        seed={123456}
        playerScore={150}
        locale="en"
      />
    );
    expect(screen.getByText('Play vs a friend')).toBeTruthy();
    expect(screen.getByText('Same device — Pass & Play')).toBeTruthy();
    expect(screen.getByText('Challenge a friend')).toBeTruthy();
  });

  it('displays with pink accent (versus color)', () => {
    const { container } = render(
      <WordCraftPlayFriendControl
        t={t}
        seed={123456}
        playerScore={150}
        locale="en"
      />
    );
    const wrapper = container.querySelector('div');
    expect(wrapper?.className).toContain('border-neo-pink');
  });

  it('has two action buttons with distinct colors', () => {
    const { container } = render(
      <WordCraftPlayFriendControl
        t={t}
        seed={123456}
        playerScore={100}
        locale="en"
      />
    );
    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBe(2);
    // First button: cyan (Pass & Play)
    expect(buttons[0]?.className).toContain('bg-neo-cyan');
    // Second button: pink (Challenge)
    expect(buttons[1]?.className).toContain('bg-neo-pink');
  });

  it('disables buttons when disabled prop is true', () => {
    render(
      <WordCraftPlayFriendControl
        t={t}
        seed={123456}
        playerScore={150}
        locale="en"
        disabled={true}
      />
    );
    const buttons = screen.getAllByRole('button');
    buttons.forEach((btn) => {
      expect(btn.hasAttribute('disabled')).toBe(true);
    });
  });

  it('renders the control in a compact bordered container', () => {
    const { container } = render(
      <WordCraftPlayFriendControl
        t={t}
        seed={123456}
        playerScore={150}
        locale="en"
      />
    );
    const wrapper = container.firstElementChild;
    expect(wrapper?.className).toContain('border-2');
    expect(wrapper?.className).toContain('rounded-neo');
    expect(wrapper?.className).toContain('shadow-hard-sm');
  });
});
