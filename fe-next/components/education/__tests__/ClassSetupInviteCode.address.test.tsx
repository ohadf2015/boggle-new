import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ClassSetupInviteCode } from '../ClassSetupInviteCode';

const t = (k: string) => k;

describe('<ClassSetupInviteCode> join address', () => {
  it('Given a phone-width card, Then the typed address is never truncated and can break after a slash', () => {
    render(
      <ClassSetupInviteCode
        code="KITE43"
        className="Room 12"
        joinUrl="https://www.lexiclash.live/he/join/KITE43"
        displayHost="lexiclash.live/he/join"
        onShare={vi.fn()}
        t={t}
      />,
    );
    const address = screen.getByTestId('setup-join-address');
    expect(address).toHaveTextContent('lexiclash.live/he/join');
    expect(address.className).not.toMatch(/(^|\s)truncate(\s|$)/);
    expect(address.querySelectorAll('wbr')).toHaveLength(2);
  });

  it('Given a join link, Then the code, QR and every share channel sit in one share block, and no channel is lime so the start button stays the only lime', () => {
    render(<ClassSetupInviteCode code="KITE43" className="Room 12" joinUrl="https://www.lexiclash.live/en/join/KITE43" displayHost="lexiclash.live/en/join" onShare={vi.fn()} t={t} />);
    const block = screen.getByTestId('invite-code-card');
    expect(block).toContainElement(screen.getByTestId('setup-join-code'));
    expect(block).toContainElement(screen.getByTestId('setup-qr'));
    for (const id of ['setup-copy-link', 'setup-share-whatsapp', 'setup-share-google', 'setup-share-native']) {
      expect(block).toContainElement(screen.getByTestId(id));
      expect(screen.getByTestId(id).className).not.toMatch(/bg-neo-lime/);
    }
  });
});
