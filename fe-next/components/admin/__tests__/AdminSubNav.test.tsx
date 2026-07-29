/**
 * Tests for AdminSubNav — mobile horizontal sub-nav for combined buckets.
 * Driven by the shared ADMIN_BUCKET_CHILDREN config so Content shows all 8
 * leaves (incl. curators + puzzle-review) and People shows its 3 leaves.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

const mockPush = vi.fn();
let mockPathname = '/en/admin';
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => mockPathname,
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
  }),
}));

import { AdminSubNav } from '../sidebar/AdminSubNav';

describe('AdminSubNav', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname = '/en/admin';
  });

  it('renders nothing on the overview root', () => {
    const { container } = render(<AdminSubNav />);
    expect(container.firstChild).toBeNull();
  });

  it('shows Content leaves including curators + puzzle-review on a content route', () => {
    mockPathname = '/en/admin/content';
    render(<AdminSubNav />);
    expect(screen.getByText('admin.nav.dictionary')).toBeInTheDocument();
    expect(screen.getByText('curator.admin.title')).toBeInTheDocument();
    expect(screen.getByText('admin.sidebar.puzzleReview')).toBeInTheDocument();
  });

  it('shows the same Content leaves when on a non-adjacent route (/curators)', () => {
    mockPathname = '/en/admin/curators';
    render(<AdminSubNav />);
    expect(screen.getByText('admin.nav.dictionary')).toBeInTheDocument();
    expect(screen.getByText('admin.nav.wordBank')).toBeInTheDocument();
  });

  it('shows People leaves on a people route', () => {
    mockPathname = '/en/admin/players';
    render(<AdminSubNav />);
    expect(screen.getByText('admin.sidebar.players')).toBeInTheDocument();
    expect(screen.getByText('admin.nav.guests')).toBeInTheDocument();
    expect(screen.getByText('admin.nav.teacherAccess')).toBeInTheDocument();
  });

  it('navigates to a leaf on click', () => {
    mockPathname = '/en/admin/players';
    render(<AdminSubNav />);
    fireEvent.click(screen.getByText('admin.nav.guests'));
    expect(mockPush).toHaveBeenCalledWith('/en/admin/guests');
  });
});
