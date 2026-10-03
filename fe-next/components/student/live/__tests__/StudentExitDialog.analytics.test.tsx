import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const { track } = vi.hoisted(() => ({ track: vi.fn() }));
vi.mock('@/utils/growthTracking', () => ({ trackModalInteraction: track }));

import { StudentExitDialog } from '../StudentExitDialog';

const t = (k: string) => k;

describe('StudentExitDialog analytics', () => {
  beforeEach(() => track.mockClear());

  it('reports shown and confirmed under the same id the shared exit dialog uses', () => {
    render(<StudentExitDialog open onOpenChange={vi.fn()} onConfirm={vi.fn()} t={t} analyticsId="exit_room_confirm" />);
    expect(track).toHaveBeenCalledWith('exit_room_confirm', 'shown', undefined);
    fireEvent.click(screen.getByRole('button', { name: 'eduStudent.exit.leave' }));
    expect(track).toHaveBeenCalledWith('exit_room_confirm', 'confirmed', undefined);
  });

  it('reports a dismissal when it closes without leaving', () => {
    const { rerender } = render(<StudentExitDialog open onOpenChange={vi.fn()} onConfirm={vi.fn()} t={t} analyticsId="exit_room_confirm" />);
    rerender(<StudentExitDialog open={false} onOpenChange={vi.fn()} onConfirm={vi.fn()} t={t} analyticsId="exit_room_confirm" />);
    expect(track).toHaveBeenCalledWith('exit_room_confirm', 'dismissed', undefined);
  });
});
