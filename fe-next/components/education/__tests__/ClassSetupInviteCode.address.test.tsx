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
});
