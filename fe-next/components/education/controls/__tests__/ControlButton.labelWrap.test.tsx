import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ControlButton } from '../ControlButton';

describe('ControlButton — a label is read, never cut to "SKIP QUES…"', () => {
  afterEach(cleanup);

  it('Given a long label, Then it wraps to two balanced lines instead of truncating', () => {
    render(<ControlButton tone="neutral" icon={<span />} label="Skip question" onClick={() => {}} testId="b" />);
    const label = screen.getByText('Skip question');
    expect(label.className).not.toMatch(/(^|\s)truncate(\s|$)|whitespace-nowrap/);
    expect(label.className).toContain('text-balance');
  });

  it('Given a projector strip short on room, Then the label takes another line but never splits a word', () => {
    render(<ControlButton tone="neutral" icon={<span />} label="Skip question" onClick={() => {}} testId="b" />);
    const label = screen.getByText('Skip question');
    expect(label.className).toContain('lg:line-clamp-none');
    expect(label.className).toContain('lg:[overflow-wrap:normal]');
    expect(screen.getByTestId('b').className).toContain('lg:min-w-min');
  });
});
