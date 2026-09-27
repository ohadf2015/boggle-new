/**
 * The join instructions, and the three incidents they carry.
 *
 * These guarantees used to live on `ClassroomModeBanner`'s host-only join card
 * (see the deleted ClassroomModeBanner.joinUrl tests). The banner now stands
 * down for a teacher in the lobby and this panel is the only surface printing a
 * code, so the guarantees move with it:
 *
 *  1. 2026-08-30 — the projector showed a QR and nothing else derived from the
 *     join URL. A student with no phone, or on a Chromebook, or too far back to
 *     scan, had six characters and nowhere to type them.
 *  2. Same incident, other half — the address shown was a bare host with no
 *     game-code input on it. Only `/[locale]/join/[code]` resolves.
 *  3. The copy button put the BARE code on the clipboard, so a teacher pasting
 *     into Google Classroom or a parent email sent six characters and no way to
 *     use them.
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

import ProjectorJoinPanel from '../ProjectorJoinPanel';

const t = (key: string) => key;

const props = {
  gameCode: 'TESTAB',
  language: 'en',
  baseUrl: 'https://www.lexiclash.live',
  t,
};

describe('ProjectorJoinPanel', () => {
  it('shows the join address as readable text, not only as a QR code', () => {
    const { container } = render(<ProjectorJoinPanel {...props} />);
    expect(container.textContent).toContain('/en/join/TESTAB');
  });

  it('prints exactly one QR and one code', () => {
    render(<ProjectorJoinPanel {...props} />);
    expect(screen.getAllByTestId('projector-qr')).toHaveLength(1);
    expect(screen.getAllByTestId('projector-code')).toHaveLength(1);
  });

  it('copies a usable join link, not a bare code that cannot be clicked', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

    render(<ProjectorJoinPanel {...props} />);
    screen.getByLabelText('share.copyLink').click();

    await vi.waitFor(() => expect(writeText).toHaveBeenCalled());
    const copied = writeText.mock.calls[0][0] as string;
    expect(copied).toContain('/en/join/TESTAB');
    expect(copied).not.toBe('TESTAB');
  });
});
