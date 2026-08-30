import { render, screen } from '@testing-library/react';
import { MultiplayerDesktopShell } from '../MultiplayerDesktopShell';
import type { ShellSlots } from '../types';

const mkSlots = (): ShellSlots => ({
  left: {
    roster: <div data-testid="roster">R</div>,
    modeBadge: <div data-testid="badge">B</div>,
  },
  center: <div data-testid="center">C</div>,
  right: { wordsLadder: <div data-testid="ladder">L</div> },
  meta: { mode: 'standard', roomId: 'r1' },
});

describe('MultiplayerDesktopShell', () => {
  it('renders all three columns with required slots', () => {
    render(<MultiplayerDesktopShell slots={mkSlots()} />);
    expect(screen.getByTestId('roster')).toBeInTheDocument();
    expect(screen.getByTestId('badge')).toBeInTheDocument();
    expect(screen.getByTestId('center')).toBeInTheDocument();
    expect(screen.getByTestId('ladder')).toBeInTheDocument();
  });

  it('exposes container-query class for ≥1024px gate', () => {
    const { container } = render(<MultiplayerDesktopShell slots={mkSlots()} />);
    expect(container.firstChild).toHaveClass('@container');
  });

  it('fires the 3-col layout at a container width reachable once mounted, without min-track overflow', () => {
    // The shell mounts when the *viewport* is >=1024px (useDesktopShellEnabled),
    // but the inner 3-col switch is a *container* query. An ancestor
    // (PlayerInGameView) applies `md:p-4` (16px each side), so the shell's
    // container is at most viewport - 32px = 992px at the mount threshold.
    // If the container-query breakpoint or the min track widths exceed that,
    // the grid stacks to a single column (leaderboard pushed off the board) or
    // overflows -- the "just the grid on screen" symptom on narrow desktops.
    const MOUNT_VIEWPORT = 1024;
    const ANCESTOR_PADDING = 16 * 2; // md:p-4 on PlayerInGameView wrapper
    const containerAtMount = MOUNT_VIEWPORT - ANCESTOR_PADDING; // 992

    const { container } = render(<MultiplayerDesktopShell slots={mkSlots()} />);
    const shell = container.querySelector('[data-mp-shell]') as HTMLElement;
    const cls = shell.className;

    const bp = cls.match(/@\[(\d+)px\]:grid-cols-\[/);
    expect(bp).toBeTruthy();
    expect(Number(bp![1])).toBeLessThanOrEqual(containerAtMount);

    const tpl = cls.match(
      /grid-cols-\[minmax\((\d+)px,1fr\)_minmax\((\d+)px,720px\)_minmax\((\d+)px,1fr\)\]/,
    );
    expect(tpl).toBeTruthy();
    const [, leftMin, centerMin, rightMin] = tpl!.map(Number);
    const INTERNAL_GAP_PAD = 12 * 2 + 12 * 2; // gap-3 (x2 gaps) + p-3 (x2 sides)
    expect(leftMin + centerMin + rightMin + INTERNAL_GAP_PAD).toBeLessThanOrEqual(
      containerAtMount,
    );
  });

  it('uses logical (start/end) layout for RTL safety', () => {
    const { container } = render(<MultiplayerDesktopShell slots={mkSlots()} />);
    const shell = container.querySelector('[data-mp-shell]');
    expect(shell?.className).not.toMatch(/\bml-\d|\bmr-\d/);
  });

  it('renders activityStream and chat when provided', () => {
    const slots: ShellSlots = {
      ...mkSlots(),
      right: {
        wordsLadder: <div data-testid="ladder">L</div>,
        activityStream: <div data-testid="stream">S</div>,
        chat: <div data-testid="chat">CH</div>,
      },
    };
    render(<MultiplayerDesktopShell slots={slots} />);
    expect(screen.getByTestId('stream')).toBeInTheDocument();
    expect(screen.getByTestId('chat')).toBeInTheDocument();
  });

  it('keeps placeholder when secondary slot missing (no reflow)', () => {
    const { container } = render(<MultiplayerDesktopShell slots={mkSlots()} />);
    expect(container.querySelector('[data-slot="left-secondary"]')).toBeInTheDocument();
  });

  it('bounds each rail to the shell height so tall rosters/ladders never push a page scroll', () => {
    // Grid/flex items default to min-height:auto, so a long roster or words
    // ladder grew its column past the board row and overflowed the whole shell
    // (the "scroll to see the rest of the shell" symptom). Each rail must be
    // height-bounded (min-h-0) and clip its own overflow.
    const { container } = render(<MultiplayerDesktopShell slots={mkSlots()} />);
    for (const side of ['left', 'right']) {
      const rail = container.querySelector(`[data-slot="${side}"]`) as HTMLElement;
      expect(rail.className).toMatch(/\bmin-h-0\b/);
      expect(rail.className).toMatch(/\boverflow-hidden\b/);
    }
  });

  it('stretches the long lists to fill their column (roster + ladder), keeping fixed panels visible', () => {
    // Scrolling moved from these wrappers INTO the panel (ThemedPanel `fill`),
    // so the panel claims the whole column and scrolls its own body. When the
    // wrapper scrolled instead, a short panel — "FOUND: no words yet" — sat as a
    // small card above ~550px of empty column at 1440x900, which read as a dead
    // gutter. The invariant that still matters is height-bounding: the wrapper
    // must stay min-h-0 and flex so it can neither grow the page nor collapse.
    // See ThemedPanel.fill.test.tsx for the panel half of this contract.
    const { container } = render(<MultiplayerDesktopShell slots={mkSlots()} />);
    const roster = container.querySelector('[data-slot="left-roster"]') as HTMLElement;
    const ladder = container.querySelector('[data-slot="right-ladder"]') as HTMLElement;
    for (const el of [roster, ladder]) {
      expect(el.className).toMatch(/\bmin-h-0\b/);
      expect(el.className).toMatch(/\bflex-1\b/);
      expect(el.className).toMatch(/\bflex\b/);
      expect(el.className).not.toMatch(/\boverflow-y-auto\b/);
    }
  });
});
