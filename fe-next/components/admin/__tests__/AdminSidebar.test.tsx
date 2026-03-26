/**
 * Tests for AdminSidebar navigation component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/en/admin',
}));

// Mock LanguageContext
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
  });

  it('should render all navigation sections', () => {
    render(<AdminSidebar />);

    expect(screen.getByText('admin.sidebar.overview')).toBeInTheDocument();
    expect(screen.getByText('admin.sidebar.analytics')).toBeInTheDocument();
    expect(screen.getByText('admin.sidebar.moderation')).toBeInTheDocument();
    expect(screen.getByText('admin.sidebar.content')).toBeInTheDocument();
    expect(screen.getByText('admin.sidebar.players')).toBeInTheDocument();
    expect(screen.getByText('admin.sidebar.system')).toBeInTheDocument();
  });

  it('should navigate on click', () => {
    render(<AdminSidebar />);

    fireEvent.click(screen.getByText('admin.sidebar.players'));
    expect(mockPush).toHaveBeenCalledWith('/en/admin/players');
  });

  it('should highlight active section based on pathname', () => {
    render(<AdminSidebar />);

    // Overview should be active (pathname is /en/admin which maps to overview)
    const overviewButton = screen.getByText('admin.sidebar.overview').closest('button');
    expect(overviewButton).toHaveClass('bg-neo-lime/10');
  });

  it('should show moderation badge when count provided', () => {
    render(<AdminSidebar moderationCount={7} />);

    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('should not show badge when count is 0', () => {
    render(<AdminSidebar moderationCount={0} />);

    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });
});
