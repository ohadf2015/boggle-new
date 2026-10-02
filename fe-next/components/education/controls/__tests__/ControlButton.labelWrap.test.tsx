import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ControlButton } from '../ControlButton';

describe('ControlButton — a label is read, never cut to "SKIP QUES…"', () => {
  afterEach(cleanup);

  it('Given a long label, Then it wraps to two balanced lines instead of truncating', () => {
    render(<ControlButton tone="neutral" icon={<span />} label="Skip question" onClick={() => {}} testId="b" />);
    const label = screen.getByText('Skip question');
    expect(label.className).not.toMatch(/(^|\s)truncate(\s|$)/);
    expect(label.className).toContain('line-clamp-2');
    expect(label.className).toContain('text-balance');
  });
});
