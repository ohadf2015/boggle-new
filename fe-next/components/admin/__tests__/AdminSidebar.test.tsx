/**
 * Tests for AdminSidebar — consolidated two-level desktop nav.
 * 4 primary buckets + an overflow group (analytics / system / web-vitals /
 * exit). The active bucket expands to show its leaf children inline.
 * Shares config + active-route logic with AdminBottomNav via adminNav.
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

import { AdminSidebar } from '../sidebar/AdminSidebar';

describe('AdminSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname = '/en/admin';
  });

  it('renders the 4 primary buckets', () => {
    render(<AdminSidebar />);
    expect(screen.getByText('admin.sidebar.overview')).toBeInTheDocument();
    expect(screen.getByText('admin.sidebar.content')).toBeInTheDocument();
    expect(screen.getByText('admin.sidebar.moderation')).toBeInTheDocument();
    expect(screen.getByText('admin.sidebar.people')).toBeInTheDocument();
  });

  it('renders the overflow group (analytics / system) directly on desktop', () => {
    render(<AdminSidebar />);
    expect(screen.getByText('admin.sidebar.analytics')).toBeInTheDocument();
    expect(screen.getByText('admin.sidebar.system')).toBeInTheDocument();
  });

  it('does not render a redundant "More" button on desktop', () => {
    render(<AdminSidebar />);
    expect(screen.queryByText('admin.sidebar.more')).not.toBeInTheDocument();
  });

  it('navigates to a bucket default path on click', () => {
    render(<AdminSidebar />);
    fireEvent.click(screen.getByText('admin.sidebar.content'));
    expect(mockPush).toHaveBeenCalledWith('/en/admin/content');
  });

  it('highlights the active bucket from the pathname', () => {
    render(<AdminSidebar />);
    const overviewButton = screen
      .getByText('admin.sidebar.overview')
      .closest('button');
    expect(overviewButton?.className).toContain('text-neo-lime');
  });

  it('expands the active bucket children inline (People → players/guests/teachers)', () => {
    mockPathname = '/en/admin/players';
    render(<AdminSidebar />);
    expect(screen.getByText('admin.sidebar.players')).toBeInTheDocument();
    expect(screen.getByText('admin.nav.guests')).toBeInTheDocument();
    expect(screen.getByText('admin.nav.teacherAccess')).toBeInTheDocument();
  });

  it('does NOT show another bucket’s children when inactive', () => {
    mockPathname = '/en/admin'; // overview active
    render(<AdminSidebar />);
    // People is not active → its guests leaf should not be shown
    expect(screen.queryByText('admin.nav.guests')).not.toBeInTheDocument();
  });

  it('navigates to a child route when an expanded child is clicked', () => {
    mockPathname = '/en/admin/content';
    render(<AdminSidebar />);
    fireEvent.click(screen.getByText('curator.admin.title'));
    expect(mockPush).toHaveBeenCalledWith('/en/admin/curators');
  });

  it('shows the moderation badge when count provided', () => {
    render(<AdminSidebar moderationCount={7} />);
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('does not show badge when count is 0', () => {
    render(<AdminSidebar moderationCount={0} />);
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });
});

describe('AdminSidebar — Teacher Pro gifts under People', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname = '/en/admin/teacher-access';
  });

  it('lists the Teacher Pro gifts page as a People child and navigates to it', () => {
    render(<AdminSidebar />);
    const child = screen.getByText('admin.nav.teacherPro');
    fireEvent.click(child);
    expect(mockPush).toHaveBeenCalledWith('/en/admin/teacher-pro');
  });
});
