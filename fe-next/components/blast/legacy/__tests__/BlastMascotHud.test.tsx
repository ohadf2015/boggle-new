/**
 * BlastMascotHud — TDD for the in-game circular mascot frame that reacts to
 * gameplay events. Frame stays fixed; the GIF inside swaps on state change.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { BlastMascotHud } from '../BlastMascotHud';
import { MASCOT_GIF_PATHS } from '@/lib/blast/mascotState';

describe('BlastMascotHud', () => {
  it('renders idle mascot by default', () => {
    render(<BlastMascotHud state="idle" />);
    const img = screen.getByTestId('blast-mascot-img');
    expect(img.getAttribute('src')).toBe(MASCOT_GIF_PATHS['idle']);
  });

  it('swaps img src when state changes', () => {
    const { rerender } = render(<BlastMascotHud state="idle" />);
    expect(screen.getByTestId('blast-mascot-img').getAttribute('src')).toBe(
      MASCOT_GIF_PATHS['idle'],
    );
    rerender(<BlastMascotHud state="awe" />);
    expect(screen.getByTestId('blast-mascot-img').getAttribute('src')).toBe(
      MASCOT_GIF_PATHS['awe'],
    );
  });

  it('exposes data-state attribute reflecting current state (for e2e + debug)', () => {
    render(<BlastMascotHud state="proud" />);
    const root = screen.getByTestId('blast-mascot-hud');
    expect(root.getAttribute('data-state')).toBe('proud');
  });

  it('marks mascot img as decorative (aria-hidden=true)', () => {
    render(<BlastMascotHud state="idle" />);
    expect(screen.getByTestId('blast-mascot-img')).toHaveAttribute('aria-hidden', 'true');
  });

  it('still renders when enabled=false (so the mute toggle stays reachable)', () => {
    render(<BlastMascotHud state="awe" enabled={false} />);
    expect(screen.getByTestId('blast-mascot-hud')).toBeInTheDocument();
  });

  it('shows muted indicator when enabled=false', () => {
    render(<BlastMascotHud state="awe" enabled={false} />);
    expect(screen.getByTestId('blast-mascot-muted-indicator')).toBeInTheDocument();
  });

  it('does NOT show muted indicator when enabled=true', () => {
    render(<BlastMascotHud state="awe" enabled={true} />);
    expect(screen.queryByTestId('blast-mascot-muted-indicator')).not.toBeInTheDocument();
  });

  it('exposes data-enabled attribute matching enabled prop (e2e + debug)', () => {
    const { rerender } = render(<BlastMascotHud state="awe" enabled={true} />);
    expect(screen.getByTestId('blast-mascot-hud').getAttribute('data-enabled')).toBe('true');
    rerender(<BlastMascotHud state="awe" enabled={false} />);
    expect(screen.getByTestId('blast-mascot-hud').getAttribute('data-enabled')).toBe('false');
  });

  it('calls onToggle when clicked', () => {
    const onToggle = jest.fn();
    render(<BlastMascotHud state="awe" enabled={true} onToggle={onToggle} />);
    screen.getByTestId('blast-mascot-hud').click();
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('forces idle pose when disabled (no animated reactions while muted)', () => {
    render(<BlastMascotHud state="awe" enabled={false} />);
    const root = screen.getByTestId('blast-mascot-hud');
    expect(root.getAttribute('data-state')).toBe('idle');
  });

  it('applies neo-brutalist circular frame classes for clean clipping', () => {
    render(<BlastMascotHud state="idle" />);
    const root = screen.getByTestId('blast-mascot-hud');
    // Circular: rounded-full. Neo: border-neo (or border-*-black 2px). Hard shadow.
    expect(root.className).toContain('rounded-full');
    expect(root.className).toMatch(/border/);
  });

  it('mascot img fills frame with object-cover (circle clip stays clean)', () => {
    render(<BlastMascotHud state="awe" />);
    const img = screen.getByTestId('blast-mascot-img');
    expect(img.className).toContain('object-cover');
  });
});
