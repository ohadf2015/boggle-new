import { render, screen } from '@testing-library/react';
import { ThemedPanel } from '../ThemedPanel';
import { MultiplayerDesktopShell } from '../MultiplayerDesktopShell';
import type { ShellSlots } from '../types';

/**
 * Rail dead-space contract.
 *
 * The shell hands each rail slot a `flex-1 min-h-0` wrapper, so the wrapper
 * already stretches to the full column height. ThemedPanel, however, was
 * content-height, so a short panel (e.g. "FOUND — no words yet") rendered as a
 * small card floating above ~550px of nothing at 1440x900. The space was
 * allocated; the panel just never claimed it.
 *
 * `fill` makes the panel occupy its wrapper and scroll its own body, so the
 * rail reads as a full column rather than an empty gutter.
 */
describe('ThemedPanel fill', () => {
  it('is content-height by default (chips and badges must not stretch)', () => {
    render(
      <ThemedPanel mode="blast" testId="p">
        <span>x</span>
      </ThemedPanel>,
    );
    const panel = screen.getByTestId('p');
    expect(panel.className).not.toContain('h-full');
  });

  it('claims the full height of its wrapper when fill is set', () => {
    render(
      <ThemedPanel mode="blast" fill testId="p">
        <span>x</span>
      </ThemedPanel>,
    );
    const panel = screen.getByTestId('p');
    expect(panel.className).toContain('h-full');
    // The wrapper is a flex row, so width must be claimed explicitly too.
    expect(panel.className).toContain('w-full');
    expect(panel.className).toContain('flex');
    expect(panel.className).toContain('flex-col');
  });

  it('scrolls its own body when filling, so the header stays put', () => {
    render(
      <ThemedPanel mode="blast" fill header="FOUND" testId="p">
        <span data-testid="body-child">x</span>
      </ThemedPanel>,
    );
    const body = screen.getByTestId('body-child').parentElement as HTMLElement;
    expect(body.className).toContain('flex-1');
    expect(body.className).toContain('min-h-0');
    expect(body.className).toContain('overflow-y-auto');
  });
});

describe('MultiplayerDesktopShell rail slots', () => {
  const mkSlots = (): ShellSlots => ({
    left: {
      roster: <div data-testid="roster">R</div>,
      modeBadge: <div data-testid="badge">B</div>,
    },
    center: <div data-testid="center">C</div>,
    right: { wordsLadder: <div data-testid="ladder">L</div> },
    meta: { mode: 'blast', roomId: 'r1' },
  });

  // The rail wrapper must let a filling panel size itself. `overflow-y-auto` on
  // the wrapper double-scrolls once the panel scrolls its own body, and a plain
  // block wrapper won't stretch the panel at all — it needs to be a flex parent.
  it.each([
    ['left-roster'],
    ['right-ladder'],
  ])('gives the %s slot a stretching flex wrapper', (slot) => {
    const { container } = render(<MultiplayerDesktopShell slots={mkSlots()} />);
    const el = container.querySelector(`[data-slot="${slot}"]`) as HTMLElement;
    expect(el).toBeTruthy();
    expect(el.className).toContain('flex-1');
    expect(el.className).toContain('min-h-0');
    expect(el.className).toContain('flex');
    expect(el.className).not.toContain('overflow-y-auto');
  });
});
