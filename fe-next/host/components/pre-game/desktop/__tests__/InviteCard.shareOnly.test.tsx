import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
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

describe('InviteCard share-only lobby surface', () => {
  beforeEach(() => {
    Object.defineProperty(global.navigator, 'share', {
      value: vi.fn().mockResolvedValue(undefined),
      configurable: true,
      writable: true,
    });
  });

  it('does not render the standalone copy-link button on the lobby surface', () => {
    render(<InviteCard gameCode="ABC123" t={t} />);
    expect(screen.queryByTestId('copy-link-button')).toBeNull();
  });

  it('renders a share button as the primary lobby invite CTA', () => {
    render(<InviteCard gameCode="ABC123" t={t} />);
    const share = screen.getByTestId('native-share-button');
    expect(share).toBeInTheDocument();
  });

  it('styles the share button with the lime CTA color (was the copy color)', () => {
    render(<InviteCard gameCode="ABC123" t={t} />);
    const share = screen.getByTestId('native-share-button');
    expect(share.className).toContain('bg-neo-lime');
    expect(share.className).not.toContain('bg-neo-cyan');
  });

  it('still renders the share button when navigator.share is unavailable so users on non-Web-Share browsers get the copy fallback', () => {
    // Use Reflect.deleteProperty so the JSDOM stub is removed without TS errors
    Reflect.deleteProperty(global.navigator, 'share');
    render(<InviteCard gameCode="ABC123" t={t} />);
    expect(screen.getByTestId('native-share-button')).toBeInTheDocument();
  });
});
