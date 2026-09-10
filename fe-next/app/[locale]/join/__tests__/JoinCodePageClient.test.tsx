import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

/**
 * `/[locale]/join` — the address a teacher says out loud.
 *
 * It returned a hard 404 once, then became a second, smaller code form that
 * validated and forwarded to `/join/[code]`. Both were the same failure in
 * different costumes: a student holding a code and an extra step in the way.
 * It now renders the one shared `JoinFlow`.
 *
 * The `?code=` read is the other half. The projector share sheet and several
 * outbound links carry `?code=`, and it was silently ignored — a student who
 * arrived with the code already in the URL was still asked to type it.
 */
const { mockSearchParams } = vi.hoisted(() => ({
  mockSearchParams: { get: vi.fn() },
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
}));
vi.mock('@/components/education/join/JoinFlow', () => ({
  default: ({ initialCode }: { initialCode?: string }) => (
    <div data-testid="join-flow">{initialCode}</div>
  ),
}));

import { JoinCodePageClient } from '../PageClient';

const withParams = (params: Record<string, string>) => {
  mockSearchParams.get.mockImplementation((k: string) => params[k] ?? null);
};

describe('<JoinCodePageClient>', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    withParams({});
  });

  it('renders the shared join flow rather than a second code form', () => {
    render(<JoinCodePageClient />);
    expect(screen.getByTestId('join-flow')).toBeInTheDocument();
  });

  it('pre-fills from ?code=, which used to be read by nothing at all', () => {
    withParams({ code: 'P45KRT' });
    render(<JoinCodePageClient />);
    expect(screen.getByTestId('join-flow')).toHaveTextContent('P45KRT');
  });

  it('accepts ?pin= too — the word the students actually say', () => {
    withParams({ pin: 'P45KRT' });
    render(<JoinCodePageClient />);
    expect(screen.getByTestId('join-flow')).toHaveTextContent('P45KRT');
  });

  it('opens on an empty code when the URL carries none', () => {
    render(<JoinCodePageClient />);
    expect(screen.getByTestId('join-flow')).toHaveTextContent('');
  });

  it('hands a junk code straight through — the flow decides, not the route', () => {
    // Sanitizing in two places is how the two paths drift apart. One owner.
    withParams({ code: ' ab-1 ' });
    render(<JoinCodePageClient />);
    expect(screen.getByTestId('join-flow')).toHaveTextContent('ab-1');
  });
});
