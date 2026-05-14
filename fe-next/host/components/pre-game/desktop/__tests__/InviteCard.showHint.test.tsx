import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { InviteCard } from '../InviteCard';

vi.mock('next/image', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => <div data-testid="next-image" {...props} />,
}));

vi.mock('qrcode.react', () => ({
  QRCodeSVG: () => <div data-testid="qr" />,
}));

vi.mock('framer-motion', () => ({
  m: new Proxy(
    {},
    {
      get: (_t, tag: string) => {
        const Comp = (props: Record<string, unknown>) => {
          const { children, whileTap, whileHover, initial, animate, exit, transition, ...rest } = props as {
            children?: React.ReactNode;
            whileTap?: unknown;
            whileHover?: unknown;
            initial?: unknown;
            animate?: unknown;
            exit?: unknown;
            transition?: unknown;
          } & Record<string, unknown>;
          return React.createElement(tag, rest, children);
        };
        Comp.displayName = `m.${tag}`;
        return Comp;
      },
    },
  ),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('react-dom', async (orig) => {
  const actual = await orig<typeof import('react-dom')>();
  return { ...actual, createPortal: (node: React.ReactNode) => node };
});

vi.mock('../../../../utils/share', () => ({
  getJoinUrl: (code: string) => `https://example.test/join?code=${code}`,
  copyJoinUrl: vi.fn().mockResolvedValue(true),
}));

const t = (key: string) => key;

describe('InviteCard empty-room hint (UX audit 2026-05-04 #4)', () => {
  it('does not render the wobble + waiting hint by default', () => {
    render(<InviteCard gameCode="ABC123" t={t} />);
    const card = screen.getByTestId('invite-card');
    expect(card.className).not.toContain('animate-neo-wobble');
    expect(screen.queryByTestId('invite-empty-hint')).toBeNull();
  });

  it('adds wobble class to the card when showHint=true', () => {
    render(<InviteCard gameCode="ABC123" t={t} showHint />);
    const card = screen.getByTestId('invite-card');
    expect(card.className).toContain('animate-neo-wobble');
  });

  it('renders a polite live-region waiting hint when showHint=true', () => {
    render(<InviteCard gameCode="ABC123" t={t} showHint />);
    const hint = screen.getByTestId('invite-empty-hint');
    expect(hint).toBeInTheDocument();
    expect(hint.getAttribute('aria-live')).toBe('polite');
    expect(hint.textContent).toContain('hostView.waitingForPlayers');
  });
});
