import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { PressSurface } from '../PressSurface';
import { Button } from '@/components/ui/button';
import { neoChunkyPress } from '@/components/ui/neoStyles';

describe('PressSurface', () => {
  it('sinks on pointer down and releases on pointer up', () => {
    render(<PressSurface>Tile</PressSurface>);
    const el = screen.getByRole('button', { name: 'Tile' });
    expect(el).not.toHaveAttribute('data-pressed');
    fireEvent.pointerDown(el, { button: 0 });
    expect(el).toHaveAttribute('data-pressed', 'true');
    fireEvent.pointerUp(el);
    expect(el).not.toHaveAttribute('data-pressed');
  });

  it('releases on pointer cancel (iOS scroll) and pointer leave', () => {
    render(<PressSurface>Tile</PressSurface>);
    const el = screen.getByRole('button');
    fireEvent.pointerDown(el, { button: 0 });
    fireEvent.pointerCancel(el);
    expect(el).not.toHaveAttribute('data-pressed');
    fireEvent.pointerDown(el, { button: 0 });
    fireEvent.pointerLeave(el);
    expect(el).not.toHaveAttribute('data-pressed');
  });

  it('ignores secondary mouse buttons', () => {
    render(<PressSurface>Tile</PressSurface>);
    const el = screen.getByRole('button');
    fireEvent.pointerDown(el, { button: 2 });
    expect(el).not.toHaveAttribute('data-pressed');
  });

  it('shows the press for Enter and Space, and clears on key up and blur', () => {
    render(<PressSurface>Tile</PressSurface>);
    const el = screen.getByRole('button');
    fireEvent.keyDown(el, { key: 'Enter' });
    expect(el).toHaveAttribute('data-pressed', 'true');
    fireEvent.keyUp(el, { key: 'Enter' });
    expect(el).not.toHaveAttribute('data-pressed');
    fireEvent.keyDown(el, { key: ' ' });
    expect(el).toHaveAttribute('data-pressed', 'true');
    fireEvent.blur(el);
    expect(el).not.toHaveAttribute('data-pressed');
    fireEvent.keyDown(el, { key: 'a' });
    expect(el).not.toHaveAttribute('data-pressed');
  });

  it('never presses when disabled', () => {
    render(<PressSurface disabled>Tile</PressSurface>);
    const el = screen.getByRole('button');
    fireEvent.pointerDown(el, { button: 0 });
    fireEvent.keyDown(el, { key: 'Enter' });
    expect(el).not.toHaveAttribute('data-pressed');
  });

  it('still calls the caller handlers', () => {
    const onPointerDown = vi.fn();
    const onKeyDown = vi.fn();
    const onClick = vi.fn();
    render(<PressSurface onPointerDown={onPointerDown} onKeyDown={onKeyDown} onClick={onClick}>Tile</PressSurface>);
    const el = screen.getByRole('button');
    fireEvent.pointerDown(el, { button: 0 });
    fireEvent.keyDown(el, { key: 'Enter' });
    fireEvent.click(el);
    expect(onPointerDown).toHaveBeenCalled();
    expect(onKeyDown).toHaveBeenCalled();
    expect(onClick).toHaveBeenCalled();
  });

  it('renders a link through asChild and keeps the press', () => {
    render(
      <PressSurface asChild>
        <a href="#daily">Daily</a>
      </PressSurface>,
    );
    const el = screen.getByRole('link', { name: 'Daily' });
    expect(el.className).toContain('shadow-[0_4px_0_0]');
    fireEvent.pointerDown(el, { button: 0 });
    expect(el).toHaveAttribute('data-pressed', 'true');
  });
});

describe('neoChunkyPress', () => {
  it('sinks by the lip height and drops the lip when pressed', () => {
    expect(neoChunkyPress(4)).toContain('shadow-[0_4px_0_0]');
    expect(neoChunkyPress(4)).toContain('data-[pressed=true]:translate-y-[4px]');
    expect(neoChunkyPress(4)).toContain('data-[pressed=true]:shadow-none');
    expect(neoChunkyPress(6)).toContain('data-[pressed=true]:translate-y-[6px]');
  });

  it('moves the lip with the sink on motion tokens, never transition-all', () => {
    const cls = neoChunkyPress();
    expect(cls).toContain('transition-[transform,box-shadow]');
    expect(cls).not.toMatch(/(^|\s)transition(\s|$)|transition-all/);
    expect(cls).toContain('motion-reduce:transition-none');
    expect(cls).toContain('--duration-press');
  });
});

describe('Button press="chunky"', () => {
  it('swaps the flat hard shadow and diagonal press for the vertical lip', () => {
    render(<Button press="chunky">Continue</Button>);
    const el = screen.getByRole('button', { name: 'Continue' });
    const cls = el.className.split(/\s+/);
    expect(cls).toContain('shadow-[0_4px_0_0]');
    expect(cls).not.toContain('shadow-hard');
    expect(cls).not.toContain('active:translate-x-[2px]');
    expect(cls).not.toContain('hover:-translate-x-px');
    expect(cls).not.toContain('hover:shadow-hard-lg');
    expect(cls).not.toContain('active:shadow-hard-pressed');
    fireEvent.pointerDown(el, { button: 0 });
    expect(el).toHaveAttribute('data-pressed', 'true');
    fireEvent.pointerUp(el);
    expect(el).not.toHaveAttribute('data-pressed');
  });

  it('keeps the variant colour', () => {
    render(<Button press="chunky" variant="cyan">Go</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-neo-cyan');
  });

  it('does not press when disabled', () => {
    render(<Button press="chunky" disabled>Go</Button>);
    const el = screen.getByRole('button');
    fireEvent.pointerDown(el, { button: 0 });
    expect(el).not.toHaveAttribute('data-pressed');
  });
});
