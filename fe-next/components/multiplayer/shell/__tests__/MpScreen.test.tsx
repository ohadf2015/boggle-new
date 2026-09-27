import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MpScreen } from '../MpScreen';
import { MpHudBar } from '../MpHudBar';
import { MP_SHELL_LOCK_CLASS } from '../useMpShellLock';

describe('MpScreen — the one no-scroll frame every MP state renders in', () => {
  it('renders header, body and footer slots in order under the test id', () => {
    render(
      <MpScreen testId="mp-lobby" header={<div>H</div>} body={<div>B</div>} footer={<div>F</div>} />,
    );
    const root = screen.getByTestId('mp-lobby');
    expect(root.textContent).toBe('HBF');
    expect(root.getAttribute('data-mp-screen')).toBe('');
  });

  it('is a dark-only surface (hardcoded navy, never a cream/dark pair)', () => {
    render(<MpScreen testId="s" body={<div />} />);
    const cls = screen.getByTestId('s').className;
    expect(cls).toContain('bg-neo-navy');
    expect(cls).not.toMatch(/bg-neo-cream/);
    expect(cls).toContain('overflow-hidden');
    expect(cls).toContain('min-h-0');
  });

  it('is not fixed — it fills PageClient’s flex-fit body so banners never cover the footer', () => {
    render(<MpScreen testId="s" body={<div />} />);
    expect(screen.getByTestId('s').className).not.toMatch(/\bfixed\b/);
  });

  it('bodyScroll="none" clips; "inner" makes only the body region scroll', () => {
    const { rerender } = render(<MpScreen testId="s" body={<div />} />);
    expect(screen.getByTestId('s-body').className).toContain('overflow-hidden');
    rerender(<MpScreen testId="s" bodyScroll="inner" body={<div />} />);
    const body = screen.getByTestId('s-body');
    expect(body.className).toContain('overflow-y-auto');
    expect(body.className).toContain('overscroll-contain');
  });

  it('omits header / footer rows when not given', () => {
    render(<MpScreen testId="s" body={<div>B</div>} />);
    expect(screen.queryByTestId('s-header')).toBeNull();
    expect(screen.queryByTestId('s-footer')).toBeNull();
  });

  it('locks the document scroll while mounted (ref-counted) and releases it on unmount', () => {
    const a = render(<MpScreen testId="a" body={<div />} />);
    const b = render(<MpScreen testId="b" body={<div />} />);
    expect(document.body.classList.contains(MP_SHELL_LOCK_CLASS)).toBe(true);
    a.unmount();
    // The next screen is still mounted: a transition must not unlock for a frame.
    expect(document.body.classList.contains(MP_SHELL_LOCK_CLASS)).toBe(true);
    b.unmount();
    expect(document.body.classList.contains(MP_SHELL_LOCK_CLASS)).toBe(false);
  });

  it('does not write the global nav state (PageClient is the single writer)', async () => {
    const src = (await import('node:fs')).readFileSync(
      (await import('node:path')).resolve(__dirname, '../MpScreen.tsx'),
      'utf8',
    );
    expect(src).not.toMatch(/useHideNavigation/);
  });
});

describe('MpHudBar', () => {
  it('renders start / center / end slots', () => {
    render(<MpHudBar start={<span>S</span>} center={<span>C</span>} end={<span>E</span>} />);
    const bar = screen.getByTestId('mp-hud-bar');
    expect(bar.textContent).toBe('SCE');
    // Logical layout: start/end follow the document direction (RTL-safe).
    expect(bar.className).not.toMatch(/\b(left|right)-/);
  });
});
