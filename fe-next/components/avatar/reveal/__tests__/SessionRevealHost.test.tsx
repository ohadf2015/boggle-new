import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  __resetRevealSessionForTests,
  getPublishedReveal,
  publishLevelUp,
} from '@/lib/avatar/revealTrigger';

vi.mock('next/dynamic', () => ({
  __esModule: true,
  default: () => ({ reveal, onClose }: { reveal: { unlocks: { partId: string }[] }; onClose: () => void }) => (
    <div data-testid="unlock-reveal-host">
      {reveal.unlocks.map(u => u.partId).join(',')}
      <button type="button" onClick={onClose}>close-reveal</button>
    </div>
  ),
}));

import SessionRevealHost from '../SessionRevealHost';

beforeEach(() => __resetRevealSessionForTests());

describe('SessionRevealHost', () => {
  it('renders nothing until a level-up is published', () => {
    const { container } = render(<SessionRevealHost />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows a published reveal and clears it on close', () => {
    render(<SessionRevealHost />);
    act(() => { publishLevelUp({ oldLevel: 1, newLevel: 3 }); });
    expect(screen.getByTestId('unlock-reveal-host')).toHaveTextContent('headphones,kawaii');
    fireEvent.click(screen.getByText('close-reveal'));
    expect(screen.queryByTestId('unlock-reveal-host')).not.toBeInTheDocument();
    expect(getPublishedReveal()).toBeNull();
  });

  it('picks up a reveal published before it mounted (response beat the results screen)', () => {
    publishLevelUp({ oldLevel: 1, newLevel: 2 });
    render(<SessionRevealHost />);
    expect(screen.getByTestId('unlock-reveal-host')).toHaveTextContent('headphones');
  });
});
