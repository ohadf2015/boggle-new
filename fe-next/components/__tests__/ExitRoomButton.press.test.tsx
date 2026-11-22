import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ExitRoomButton from '../ExitRoomButton';

describe('ExitRoomButton press feedback', () => {
  it('uses the 1px translate press, not a scale', () => {
    render(<ExitRoomButton onClick={vi.fn()} label="Exit" />);
    const cls = screen.getByRole('button', { name: 'Exit' }).className;
    expect(cls).not.toMatch(/active:scale-/);
    expect(cls).toContain('active:translate-x-px');
    expect(cls).toContain('active:translate-y-px');
  });

  it('extends the tap target to 44px without growing the 36px disc', () => {
    render(<ExitRoomButton onClick={vi.fn()} label="Exit" />);
    const cls = screen.getByRole('button', { name: 'Exit' }).className;
    expect(cls).toContain('w-9');
    expect(cls).toMatch(/before:-inset-1/);
  });
});
