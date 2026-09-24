/**
 * The projector wall's "More" panel held the reteach round, and at 1024–1366px
 * it opened OFF the right edge of the screen: it was a 40rem box anchored to
 * the START of the small "More" button, which sits in the right-hand column.
 * An action a teacher cannot reach is a removed action.
 *
 * Contract: the panel is anchored to the ROW that holds "More" (the details
 * element is not its containing block), spans that row edge to edge, and
 * caps its own height with an inner scroll so it can never run off the top.
 * jsdom has no layout, so this pins the classes that produce the placement;
 * the harness probe measures the real rect.
 */
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ReteachActions } from '../ReteachActions';
import type { ReteachLinks } from '../useReteachLinks';

const t = (key: string) => key;
const links = {
  canLaunchMissGapQuestionPack: false,
  onPrintPracticeSheet: vi.fn(),
  onPrintUnpluggedPack: vi.fn(),
  onShareMissGapPractice: vi.fn(),
  missGapShareState: 'idle',
} as unknown as ReteachLinks;

describe('ReteachActions variant="more" — panel placement', () => {
  it('does not make the disclosure the containing block of its panel', () => {
    render(<ReteachActions links={links} onReteach={vi.fn()} t={t} variant="more" />);
    const details = screen.getByTestId('reteach-more');
    expect(details.className).not.toMatch(/(^|\s)relative(\s|$)/);
    expect(details.className).toMatch(/(^|\s)static(\s|$)/);
  });

  it('spans the row edge to edge instead of hanging off one edge of the button', () => {
    render(<ReteachActions links={links} onReteach={vi.fn()} t={t} variant="more" />);
    const panel = screen.getByTestId('reteach-more-panel');
    expect(panel.className).toMatch(/(^|\s)inset-x-0(\s|$)/);
    expect(panel.className).not.toMatch(/(^|\s)start-0(\s|$)/);
    expect(panel.className).not.toMatch(/w-\[min\(40rem/);
  });

  it('caps its height and scrolls inside, with the reteach round first', () => {
    render(<ReteachActions links={links} onReteach={vi.fn()} t={t} variant="more" />);
    const panel = screen.getByTestId('reteach-more-panel');
    expect(panel.className).toMatch(/max-h-\[/);
    expect(panel.className).toMatch(/overflow-y-auto/);
    const buttons = panel.querySelectorAll('button');
    expect(buttons[0]).toBe(screen.getByTestId('play-reteach-round'));
  });
});
