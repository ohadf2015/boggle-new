import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import RewardChipRow from '../RewardChipRow';

afterEach(() => cleanup());

const chips = [
  { id: 'cash', icon: <span>c</span>, value: '+42', label: 'cash', landing: true },
  { id: 'xp', icon: <span>x</span>, value: '+60', label: 'XP' },
  { id: 'item', icon: <span>i</span>, value: 'Star eyes', label: 'Eyes', badge: 'Epic' },
];

describe('RewardChipRow', () => {
  it('Given three rewards, Then each is one card in a labelled list with its value and label', () => {
    render(<RewardChipRow label="What you got" chips={chips} reduced />);
    const list = screen.getByRole('list', { name: 'What you got' });
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(within(items[0]).getByText('+42')).toBeTruthy();
    expect(within(items[1]).getByText('XP')).toBeTruthy();
  });

  it('Given a chip marked as the landing spot, Then coins can find it', () => {
    const { container } = render(<RewardChipRow label="x" chips={chips} reduced />);
    expect(container.querySelector('[data-reward-landing="cash"]')).toBeTruthy();
    expect(container.querySelector('[data-reward-landing="xp"]')).toBeNull();
  });

  it('Given a chip with a badge, Then the badge shows on that card only', () => {
    render(<RewardChipRow label="x" chips={chips} reduced />);
    const items = screen.getAllByRole('listitem');
    expect(within(items[2]).getByText('Epic')).toBeTruthy();
    expect(within(items[0]).queryByText('Epic')).toBeNull();
  });
});
