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

  // CTA hierarchy (integration critic): on the lobby panel SHARE sat as a second
  // solid-lime button competing with START BATTLE! / READY UP!. The lobby's ONE
  // solid lime is the footer primary; the panel SHARE is a lime-outline secondary.
  it('lobby panel: SHARE is a lime-outline secondary, never a second solid-lime CTA', () => {
    render(<InviteCard gameCode="ABC123" t={t} />);
    const share = screen.getByTestId('native-share-button');
    expect(share.className).not.toMatch(/\bbg-neo-lime(?![/\w-])/);
    expect(share.className).toContain('border-neo-lime');
    expect(share.className).toContain('text-neo-lime');
    expect(share.className).not.toContain('bg-neo-cyan');
  });

  it('invite sheet: SHARE stays the solid-lime primary (it is the only action there)', () => {
    render(<InviteCard gameCode="ABC123" t={t} variant="sheet" />);
    expect(screen.getByTestId('native-share-button').className).toMatch(/\bbg-neo-lime(?![/\w-])/);
  });

  it('still renders the share button when navigator.share is unavailable so users on non-Web-Share browsers get the copy fallback', () => {
    // Use Reflect.deleteProperty so the JSDOM stub is removed without TS errors
    Reflect.deleteProperty(global.navigator, 'share');
    render(<InviteCard gameCode="ABC123" t={t} />);
    expect(screen.getByTestId('native-share-button')).toBeInTheDocument();
  });
});
