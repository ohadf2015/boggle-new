/**
 * MatchmakingOverlay component tests
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { MatchmakingOverlay } from '../MatchmakingOverlay';

const mockT = (key: string, params?: Record<string, unknown>) => {
  const map: Record<string, string> = {
    'matchmaking.findingOpponent': 'Finding opponent...',
    'matchmaking.cancel': 'Cancel search',
    'matchmaking.matchFound': 'Match found!',
    'matchmaking.timeout': 'No match found',
    'matchmaking.createRoom': 'Create a room instead',
  };
  let result = map[key] || key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      result = result.replace(`{{${k}}}`, String(v));
    }
  }
  return result;
};

describe('MatchmakingOverlay', () => {
  it('shows searching state with cancel button', () => {
    render(
      <MatchmakingOverlay
        status="searching"
        elo={1200}
        eloRange={100}
        queueSize={5}
        waitTime={10}
        opponent={null}
        onCancel={vi.fn()}
        onCreateRoom={vi.fn()}
        t={mockT}
      />
    );
    expect(screen.getByText('Finding opponent...')).toBeTruthy();
    expect(screen.getByText('Cancel search')).toBeTruthy();
  });

  it('calls onCancel when cancel button clicked', () => {
    const onCancel = vi.fn();
    render(
      <MatchmakingOverlay
        status="searching"
        elo={1200}
        eloRange={100}
        queueSize={5}
        waitTime={10}
        opponent={null}
        onCancel={onCancel}
        onCreateRoom={vi.fn()}
        t={mockT}
      />
    );
    fireEvent.click(screen.getByText('Cancel search'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('shows match found state with opponent info', () => {
    render(
      <MatchmakingOverlay
        status="found"
        elo={1200}
        eloRange={100}
        queueSize={0}
        waitTime={15}
        opponent={{ username: 'rival', elo: 1250, tier: 'Gold' }}
        onCancel={vi.fn()}
        onCreateRoom={vi.fn()}
        t={mockT}
      />
    );
    expect(screen.getByText('Match found!')).toBeTruthy();
    expect(screen.getByText('rival')).toBeTruthy();
  });

  it('shows timeout state with create room CTA', () => {
    const onCreateRoom = vi.fn();
    render(
      <MatchmakingOverlay
        status="timeout"
        elo={1200}
        eloRange={500}
        queueSize={0}
        waitTime={60}
        opponent={null}
        onCancel={vi.fn()}
        onCreateRoom={onCreateRoom}
        t={mockT}
      />
    );
    expect(screen.getByText('No match found')).toBeTruthy();
    fireEvent.click(screen.getByText('Create a room instead'));
    expect(onCreateRoom).toHaveBeenCalledTimes(1);
  });

  it('does not render when status is idle', () => {
    const { container } = render(
      <MatchmakingOverlay
        status="idle"
        elo={1200}
        eloRange={100}
        queueSize={0}
        waitTime={0}
        opponent={null}
        onCancel={vi.fn()}
        onCreateRoom={vi.fn()}
        t={mockT}
      />
    );
    expect(container.innerHTML).toBe('');
  });
});
