/**
 * Tests for AdminBottomNav — consolidated mobile nav.
 * 4 primary destination tabs + a "More" sheet (analytics / system /
 * web-vitals / exit). No "home" trap. Active highlight across combined
 * buckets is validated via the shared adminNav config.
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

import { AdminBottomNav } from '../sidebar/AdminBottomNav';

describe('AdminBottomNav', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname = '/en/admin';
  });

  it('renders exactly 5 bottom slots: 4 destinations + More', () => {
    render(<AdminBottomNav />);
    expect(screen.getByText('admin.sidebar.overview')).toBeInTheDocument();
    expect(screen.getByText('admin.sidebar.content')).toBeInTheDocument();
    expect(screen.getByText('admin.sidebar.moderation')).toBeInTheDocument();
    expect(screen.getByText('admin.sidebar.people')).toBeInTheDocument();
    expect(screen.getByText('admin.sidebar.more')).toBeInTheDocument();
  });

  it('does not render a home/exit-the-zone tab in the bar', () => {
    render(<AdminBottomNav />);
    expect(screen.queryByText('nav.home')).not.toBeInTheDocument();
    // analytics/system are in the More sheet, not the bar
    expect(screen.queryByText('admin.sidebar.analytics')).not.toBeInTheDocument();
  });

  it('lands People on /players directly (not a launcher)', () => {
    render(<AdminBottomNav />);
    fireEvent.click(screen.getByText('admin.sidebar.people'));
    expect(mockPush).toHaveBeenCalledWith('/en/admin/players');
  });

  it('lands Content on /content directly', () => {
    render(<AdminBottomNav />);
    fireEvent.click(screen.getByText('admin.sidebar.content'));
    expect(mockPush).toHaveBeenCalledWith('/en/admin/content');
  });

  it('opens the More sheet revealing overflow items', () => {
    render(<AdminBottomNav />);
    // sheet closed initially
    expect(screen.queryByText('admin.sidebar.analytics')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('admin.sidebar.more'));
    expect(screen.getByText('admin.sidebar.analytics')).toBeInTheDocument();
    expect(screen.getByText('admin.sidebar.system')).toBeInTheDocument();
    expect(screen.getByText('admin.nav.webVitals')).toBeInTheDocument();
    expect(screen.getByText('admin.nav.exitToSite')).toBeInTheDocument();
  });

  it('navigates to a route from the More sheet', () => {
    render(<AdminBottomNav />);
    fireEvent.click(screen.getByText('admin.sidebar.more'));
    fireEvent.click(screen.getByText('admin.sidebar.analytics'));
    expect(mockPush).toHaveBeenCalledWith('/en/admin/analytics');
  });

  it('exit item leaves the admin zone to the site root', () => {
    render(<AdminBottomNav />);
    fireEvent.click(screen.getByText('admin.sidebar.more'));
    fireEvent.click(screen.getByText('admin.nav.exitToSite'));
    expect(mockPush).toHaveBeenCalledWith('/en');
  });

  it('highlights People when on a guests detail route (combined bucket)', () => {
    mockPathname = '/en/admin/guests/sess-1';
    render(<AdminBottomNav />);
    const peopleBtn = screen.getByText('admin.sidebar.people').closest('button');
    expect(peopleBtn?.className).toContain('text-neo-lime');
  });

  it('highlights Content when on /curators (non-adjacent route)', () => {
    mockPathname = '/en/admin/curators';
    render(<AdminBottomNav />);
    const contentBtn = screen.getByText('admin.sidebar.content').closest('button');
    expect(contentBtn?.className).toContain('text-neo-lime');
  });

  it('highlights More when on /analytics (overflow route)', () => {
    mockPathname = '/en/admin/analytics';
    render(<AdminBottomNav />);
    const moreBtn = screen.getByText('admin.sidebar.more').closest('button');
    expect(moreBtn?.className).toContain('text-neo-lime');
  });

  it('shows the moderation badge when count provided', () => {
    render(<AdminBottomNav moderationCount={5} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });
});
