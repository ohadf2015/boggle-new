/**
 * Tests for PlayerCuratorControl — the inline "make this player a Language
 * Curator" widget on the players admin page. Covers the three states an admin
 * sees: not-a-curator, mid-assign, and already-a-curator (with revoke), plus
 * the admin short-circuit (admins are curators everywhere).
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));

import { PlayerCuratorControl } from '../PlayerCuratorControl';
import type { CuratorAssignmentRow } from '../playerManagerTypes';

const noop = () => {};

describe('PlayerCuratorControl', () => {
  it('shows "not a curator" + a make-curator button when the player has no assignments', () => {
    render(<PlayerCuratorControl assignments={[]} onAssign={noop} onRevoke={noop} busyKey={null} />);
    expect(screen.getByText('curator.assignInline.none')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /assignInline.make/ })).toBeInTheDocument();
  });

  it('reveals the assign form and grants the chosen language + tier', () => {
    const onAssign = vi.fn();
    render(<PlayerCuratorControl assignments={[]} onAssign={onAssign} onRevoke={noop} busyKey={null} />);

    fireEvent.click(screen.getByRole('button', { name: /assignInline.make/ }));
    // default language = first supported not yet assigned ('en'), default tier = 1
    fireEvent.click(screen.getByRole('button', { name: 'curator.assignInline.assign' }));
    expect(onAssign).toHaveBeenCalledWith('en', 1);
  });

  it('lists current curator languages and revokes the right one', () => {
    const onRevoke = vi.fn();
    const assignments: CuratorAssignmentRow[] = [
      { curator_id: 'u1', language: 'he', trust_tier: 2, curator_points: 30 },
    ];
    render(<PlayerCuratorControl assignments={assignments} onAssign={noop} onRevoke={onRevoke} busyKey={null} />);

    expect(screen.getByText('he')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /assignInline.revoke he/ }));
    expect(onRevoke).toHaveBeenCalledWith('he');
  });

  it('does not offer an assign form for an admin (admins curate every language)', () => {
    render(<PlayerCuratorControl isAdmin assignments={[]} onAssign={noop} onRevoke={noop} busyKey={null} />);
    expect(screen.queryByRole('button', { name: /assignInline.make/ })).not.toBeInTheDocument();
    expect(screen.getByText('curator.levels.admin.scope')).toBeInTheDocument();
  });
});
