/**
 * Tests for app/[locale]/multiplayer/error.tsx — the multiplayer segment error
 * boundary's "Back" button.
 *
 * Root cause (education homepage-bounce audit): the button hardcoded
 * `window.location.href = \`/${locale}\`` — a teacher or student who hit an
 * error mid-classroom-game and tapped Back landed on the main app home, not
 * their own hub. Fixed to route through `sectionHome`, which (via its
 * `search` param) reuses `multiplayerExitDestination` for a classroom room.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

let mockLocale = 'en';
vi.mock('next/navigation', () => ({
  useParams: () => ({ locale: mockLocale }),
}));
vi.mock('@/utils/sentry', () => ({ captureError: vi.fn() }));
vi.mock('@/components/ui/Mascot', () => ({ Mascot: () => null }));

import MultiplayerError from '../error';

function makeError(name: string, message: string): Error & { digest?: string } {
  return Object.assign(new globalThis.Error(message), { name });
}

function setLocation(pathname: string, search = ''): void {
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { href: '', pathname, search, reload: vi.fn(), replace: vi.fn() },
  });
}

beforeEach(() => {
  mockLocale = 'en';
});

describe('app/[locale]/multiplayer/error.tsx — Back button is education-aware', () => {
  it('sends the host to the teacher hub on a classroom multiplayer error, not bare /{locale}', () => {
    setLocation('/en/multiplayer', '?room=ABCD&classroom=true&host=true');
    render(<MultiplayerError error={makeError('Error', 'boom')} reset={vi.fn()} />);
    fireEvent.click(screen.getAllByRole('button')[1]);
    expect(window.location.href).toBe('/en/teacher');
  });

  it('sends a classroom student to the student hub, not bare /{locale}', () => {
    setLocation('/en/multiplayer', '?room=ABCD&classroom=true');
    render(<MultiplayerError error={makeError('Error', 'boom')} reset={vi.fn()} />);
    fireEvent.click(screen.getAllByRole('button')[1]);
    expect(window.location.href).toBe('/en/student');
  });

  it('keeps the ordinary (non-classroom) multiplayer lobby as the destination', () => {
    setLocation('/en/multiplayer', '?room=ABCD');
    render(<MultiplayerError error={makeError('Error', 'boom')} reset={vi.fn()} />);
    fireEvent.click(screen.getAllByRole('button')[1]);
    expect(window.location.href).toBe('/en');
  });

  it('preserves locale for a classroom room in a different locale', () => {
    mockLocale = 'he';
    setLocation('/he/multiplayer', '?classroom=true&host=true');
    render(<MultiplayerError error={makeError('Error', 'boom')} reset={vi.fn()} />);
    fireEvent.click(screen.getAllByRole('button')[1]);
    expect(window.location.href).toBe('/he/teacher');
  });
});
