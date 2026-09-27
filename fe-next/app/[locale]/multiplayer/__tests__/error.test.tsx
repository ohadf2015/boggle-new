/**
 * Tests for app/[locale]/multiplayer/error.tsx — the multiplayer segment error
 * boundary's "Back" button.
 *
 * History: the button first hardcoded `window.location.href = /${locale}` (a
 * teacher mid-classroom-game landed on the main app home). It then routed
 * through `sectionHome`, which fixed classroom rooms but still sent every
 * arcade player to the LexiClash homepage with a hard navigation.
 *
 * FOUNDATION (2026-09-26) moves it onto `mpExit('error')`: classroom rooms go
 * to their hub, everyone else back to the MP entry (room params stripped) —
 * never the homepage — as an SPA push, because a hard nav blanks the Capacitor
 * static-export WebView. Only a stale-chunk error still needs a real load.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

let mockLocale = 'en';
const push = vi.fn();
vi.mock('next/navigation', () => ({
  useParams: () => ({ locale: mockLocale }),
  useRouter: () => ({ push, replace: vi.fn() }),
}));
vi.mock('@/utils/sentry', () => ({ captureError: vi.fn() }));
vi.mock('@/components/ui/Mascot', () => ({ Mascot: () => null }));

import MultiplayerError from '../error';

function makeError(name: string, message: string): Error & { digest?: string } {
  return Object.assign(new globalThis.Error(message), { name });
}

const assign = vi.fn();
function setLocation(pathname: string, search = ''): void {
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: {
      href: `https://www.lexiclash.live${pathname}${search}`,
      origin: 'https://www.lexiclash.live',
      pathname, search, assign, reload: vi.fn(), replace: vi.fn(),
    },
  });
}

beforeEach(() => {
  mockLocale = 'en';
  push.mockReset();
  assign.mockReset();
});

describe('app/[locale]/multiplayer/error.tsx — Back goes through mpExit', () => {
  it('sends the host to the teacher hub on a classroom multiplayer error, not bare /{locale}', () => {
    setLocation('/en/multiplayer', '?room=ABCD&classroom=true&host=true');
    render(<MultiplayerError error={makeError('Error', 'boom')} reset={vi.fn()} />);
    fireEvent.click(screen.getAllByRole('button')[1]);
    expect(push).toHaveBeenCalledWith('/en/teacher');
  });

  it('sends a classroom student to the student hub, not bare /{locale}', () => {
    setLocation('/en/multiplayer', '?room=ABCD&classroom=true');
    render(<MultiplayerError error={makeError('Error', 'boom')} reset={vi.fn()} />);
    fireEvent.click(screen.getAllByRole('button')[1]);
    expect(push).toHaveBeenCalledWith('/en/student');
  });

  it('returns an arcade player to the MP entry (room stripped), never the homepage', () => {
    setLocation('/en/multiplayer', '?room=ABCD&mode=blast');
    const reset = vi.fn();
    render(<MultiplayerError error={makeError('Error', 'boom')} reset={reset} />);
    fireEvent.click(screen.getAllByRole('button')[1]);
    expect(push).toHaveBeenCalledWith('/en/multiplayer?mode=blast');
    expect(push).not.toHaveBeenCalledWith('/en');
    expect(reset).toHaveBeenCalled();
    expect(assign).not.toHaveBeenCalled();
  });

  it('preserves locale for a classroom room in a different locale', () => {
    mockLocale = 'he';
    setLocation('/he/multiplayer', '?classroom=true&host=true');
    render(<MultiplayerError error={makeError('Error', 'boom')} reset={vi.fn()} />);
    fireEvent.click(screen.getAllByRole('button')[1]);
    expect(push).toHaveBeenCalledWith('/he/teacher');
  });

  it('a stale chunk after a deploy gets a real load to the same destination', () => {
    setLocation('/en/multiplayer', '?room=ABCD');
    render(<MultiplayerError error={makeError('ChunkLoadError', 'Loading chunk 7 failed')} reset={vi.fn()} />);
    fireEvent.click(screen.getAllByRole('button')[1]);
    expect(assign).toHaveBeenCalledWith('/en/multiplayer');
    expect(push).not.toHaveBeenCalled();
  });
});
