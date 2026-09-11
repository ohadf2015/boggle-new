/**
 * "More ways to reteach" is a control, and has to look like one.
 *
 * The disclosure used to be navy-elevated inside navy: a strip of slightly
 * lighter dark on dark, which is exactly the tone-on-tone the design addendum
 * bans and which the contrast audit flags (a control's fill or border must
 * clear 3:1 against what surrounds it). A teacher scanning the card at arm's
 * length has to see an edge, not guess at one.
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ReteachActions } from '../ReteachActions';
import type { ReteachLinks } from '../useReteachLinks';

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${JSON.stringify(params)}` : key;

const links = {
  unpluggedReteachHref: '/en/education/unplugged-reteach?x=1',
  chatGptHref: '/en/education/chatgpt-reteach?x=1',
  missGapAssignmentHref: null,
  missGapPracticeHref: null,
  missGapWhatsAppHref: null,
  shareState: 'idle',
  onShareGap: vi.fn(),
  onPrintPack: vi.fn(),
  onPracticeSheet: vi.fn(),
} as unknown as ReteachLinks;

describe('ReteachActions', () => {
  it('gives the disclosure a border that reads against the card', () => {
    render(<ReteachActions links={links} t={t} />);
    const summary = screen.getByTestId('reteach-more-actions');
    // A 2px cream edge on a navy card: ~15:1, far past the 3:1 the audit wants.
    expect(summary.className).toMatch(/border-neo-cream/);
    expect(summary.className).toMatch(/border-2/);
  });

  it('still offers the reteach round as the loud first action', () => {
    const onReteach = vi.fn();
    render(<ReteachActions links={links} onReteach={onReteach} t={t} />);
    expect(screen.getByTestId('play-reteach-round').className).toMatch(/bg-neo-pink/);
  });
});
