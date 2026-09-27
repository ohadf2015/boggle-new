/**
 * Tests for AdminPageHeader — the shared screen scaffold applied across all
 * admin pages for a consistent title/subtitle/actions row.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { AdminPageHeader } from '../AdminPageHeader';

describe('AdminPageHeader', () => {
  it('renders the title', () => {
    render(<AdminPageHeader title="Dashboard" />);
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
  });

  it('renders an optional subtitle', () => {
    render(<AdminPageHeader title="Dashboard" subtitle="Live" />);
    expect(screen.getByText('Live')).toBeInTheDocument();
  });

  it('omits the subtitle node when not provided', () => {
    const { container } = render(<AdminPageHeader title="Dashboard" />);
    expect(container.querySelectorAll('p').length).toBe(0);
  });

  it('renders actions in the trailing slot', () => {
    render(
      <AdminPageHeader title="Dashboard" actions={<button>Refresh</button>} />,
    );
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument();
  });
});
