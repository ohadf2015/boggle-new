/**
 * FeatureErrorBoundary (components/ErrorBoundaries.tsx) — one of the 4 error
 * boundaries that must recover education users into the education section,
 * never onto the bare LexiClash homepage. All 4 boundaries share the same
 * `sectionHome` helper (lib/navigation/sectionHome.ts) — see also
 * app/[locale]/error.tsx, app/global-error.tsx and ChunkErrorBoundary tests.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { FeatureErrorBoundary } from '../ErrorBoundaries';

function Boom({ message, name }: { message: string; name: string }): React.ReactElement {
  throw Object.assign(new Error(message), { name });
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe('FeatureErrorBoundary — Home button is education-aware (sectionHome)', () => {
  it('routes to /{locale}/education for an education pathname, not bare /{locale}', () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { href: '', pathname: '/es/teacher/classroom/x', reload: vi.fn(), replace: vi.fn() },
    });
    render(
      <FeatureErrorBoundary featureName="test-feature" showHomeButton>
        <Boom name="TypeError" message="boom" />
      </FeatureErrorBoundary>,
    );
    fireEvent.click(screen.getByRole('button', { name: /back to home/i }));
    expect(window.location.href).toBe('/es/education');
  });

  it('routes to bare /{locale} for a non-education pathname', () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { href: '', pathname: '/es/multiplayer', reload: vi.fn(), replace: vi.fn() },
    });
    render(
      <FeatureErrorBoundary featureName="test-feature" showHomeButton>
        <Boom name="TypeError" message="boom" />
      </FeatureErrorBoundary>,
    );
    fireEvent.click(screen.getByRole('button', { name: /back to home/i }));
    expect(window.location.href).toBe('/es');
  });

  it('does not render a Home button when showHomeButton is false (default)', () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { href: '', pathname: '/es/teacher', reload: vi.fn(), replace: vi.fn() },
    });
    render(
      <FeatureErrorBoundary featureName="test-feature">
        <Boom name="TypeError" message="boom" />
      </FeatureErrorBoundary>,
    );
    expect(screen.queryByRole('button', { name: /back to home/i })).not.toBeInTheDocument();
  });
});
