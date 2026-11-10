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

  it('renders exactly 5 bottom slots: Overview, Education, People, Analytics + More', () => {
    render(<AdminBottomNav />);
    expect(screen.getByText('admin.sidebar.overview')).toBeInTheDocument();
    expect(screen.getByText('admin.sidebar.education')).toBeInTheDocument();
    expect(screen.getByText('admin.sidebar.people')).toBeInTheDocument();
    expect(screen.getByText('admin.sidebar.analytics')).toBeInTheDocument();
    expect(screen.getByText('admin.sidebar.more')).toBeInTheDocument();
    expect(screen.queryByText('admin.sidebar.content')).not.toBeInTheDocument();
    expect(screen.queryByText('admin.sidebar.moderation')).not.toBeInTheDocument();
  });

  it('lands Education on /education', () => {
    render(<AdminBottomNav />);
    fireEvent.click(screen.getByText('admin.sidebar.education'));
    expect(mockPush).toHaveBeenCalledWith('/en/admin/education');
  });

  it('puts Content + Moderation inside the More sheet', () => {
    render(<AdminBottomNav />);
    fireEvent.click(screen.getByText('admin.sidebar.more'));
    fireEvent.click(screen.getByText('admin.sidebar.moderation'));
    expect(mockPush).toHaveBeenCalledWith('/en/admin/moderation');
  });

  it('does not render a home/exit-the-zone tab in the bar', () => {
    render(<AdminBottomNav />);
    expect(screen.queryByText('nav.home')).not.toBeInTheDocument();
    // system is in the More sheet, not the bar
    expect(screen.queryByText('admin.sidebar.system')).not.toBeInTheDocument();
  });

  it('lands People on /players directly (not a launcher)', () => {
    render(<AdminBottomNav />);
    fireEvent.click(screen.getByText('admin.sidebar.people'));
    expect(mockPush).toHaveBeenCalledWith('/en/admin/players');
  });

  it('lands Content on /content from the More sheet', () => {
    render(<AdminBottomNav />);
    fireEvent.click(screen.getByText('admin.sidebar.more'));
    fireEvent.click(screen.getByText('admin.sidebar.content'));
    expect(mockPush).toHaveBeenCalledWith('/en/admin/content');
  });

  it('opens the More sheet revealing overflow items', () => {
    render(<AdminBottomNav />);
    expect(screen.queryByText('admin.sidebar.system')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('admin.sidebar.more'));
    expect(screen.getByText('admin.sidebar.system')).toBeInTheDocument();
    expect(screen.getByText('admin.nav.webVitals')).toBeInTheDocument();
    expect(screen.getByText('admin.nav.exitToSite')).toBeInTheDocument();
  });

  it('navigates to a route from the More sheet', () => {
    render(<AdminBottomNav />);
    fireEvent.click(screen.getByText('admin.sidebar.more'));
    fireEvent.click(screen.getByText('admin.sidebar.system'));
    expect(mockPush).toHaveBeenCalledWith('/en/admin/system');
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

  it('highlights More when on /curators (Content lives in More)', () => {
    mockPathname = '/en/admin/curators';
    render(<AdminBottomNav />);
    const moreBtn = screen.getByText('admin.sidebar.more').closest('button');
    expect(moreBtn?.className).toContain('text-neo-lime');
  });

  it('highlights Education on a teacher-pro route', () => {
    mockPathname = '/en/admin/teacher-pro';
    render(<AdminBottomNav />);
    const btn = screen.getByText('admin.sidebar.education').closest('button');
    expect(btn?.className).toContain('text-neo-lime');
  });

  it('highlights More when on /system (overflow route)', () => {
    mockPathname = '/en/admin/system';
    render(<AdminBottomNav />);
    const moreBtn = screen.getByText('admin.sidebar.more').closest('button');
    expect(moreBtn?.className).toContain('text-neo-lime');
  });

  it('surfaces the moderation count on the More tab and on the sheet row', () => {
    render(<AdminBottomNav moderationCount={5} />);
    expect(screen.getAllByText('5')).toHaveLength(1);
    fireEvent.click(screen.getByText('admin.sidebar.more'));
    expect(screen.getAllByText('5')).toHaveLength(2);
  });
});
