import { vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import TvNotificationQueue from '../TvNotificationQueue';
import type { TvNotificationData } from '../TvNotification';

vi.mock('../../../../components/ui/Mascot', () => ({
  __esModule: true,
  default: () => <div data-testid="toast-mascot" />,
  Mascot: () => <div data-testid="toast-mascot" />,
}));

const monsterWord: TvNotificationData = {
  id: 'n1',
  type: 'achievement',
  tier: 'major',
  layout: 'mascot',
  mascotVariant: 'trophy',
  player: 'Omer',
  headline: 'MONSTER WORD!',
  duration: 60_000,
  timestamp: 0,
} as TvNotificationData;

describe('TvNotificationQueue — classroom header slot', () => {
  it('Given the inline placement, Then the toast sits in flow instead of floating over the board', () => {
    const { container } = render(
      <TvNotificationQueue notifications={[monsterWord]} onDismiss={() => {}} placement="inline" />,
    );
    const slot = container.firstElementChild as HTMLElement;
    expect(slot.className).not.toMatch(/\bfixed\b/);
    expect(screen.getByText('MONSTER WORD!')).toBeInTheDocument();
  });

  it('Given the inline placement, Then no mascot is drawn over the projector content', () => {
    render(<TvNotificationQueue notifications={[monsterWord]} onDismiss={() => {}} placement="inline" />);
    expect(screen.queryByTestId('toast-mascot')).toBeNull();
    expect(screen.getByText('Omer')).toBeInTheDocument();
  });

  it('Given the default placement (arcade TV), Then the mascot toast still floats at the bottom', () => {
    const { container } = render(<TvNotificationQueue notifications={[monsterWord]} onDismiss={() => {}} />);
    expect((container.firstElementChild as HTMLElement).className).toMatch(/\bfixed\b/);
    expect(screen.getByTestId('toast-mascot')).toBeInTheDocument();
  });
});

describe('TvNotificationQueue — floating overlay above the teacher strip', () => {
  it('Given the overlay placement, Then its bottom edge clears the docked teacher strip', () => {
    const { container } = render(<TvNotificationQueue notifications={[monsterWord]} onDismiss={() => {}} />);
    expect((container.firstElementChild as HTMLElement).className).not.toContain('bottom-8');
  });
});

describe('TvNotificationQueue — classroom header pill keeps long names whole', () => {
  const longName = { ...monsterWord, id: 'n2', player: 'Maximiliana-Josefina', headline: 'pulls away from the pack' } as TvNotificationData;

  it('Given the inline placement and a 20-character name, Then neither the name nor the headline is cut with an ellipsis', () => {
    const { container } = render(<TvNotificationQueue notifications={[longName]} onDismiss={() => {}} placement="inline" />);
    expect(container.querySelector('.truncate')).toBeNull();
    expect(screen.getByText('Maximiliana-Josefina').tagName).toBe('BDI');
  });

  it('Given the arcade overlay toast layout, Then its compact single-line pill is unchanged', () => {
    const snipe = { ...longName, id: 'n3', type: 'word_snipe', layout: 'toast' } as TvNotificationData;
    const { container } = render(<TvNotificationQueue notifications={[snipe]} onDismiss={() => {}} />);
    expect(container.querySelectorAll('.truncate').length).toBe(2);
  });
});
