/**
 * ClickableUsername Component Tests
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ClickableUsername from '../ClickableUsername';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (key: string) => key }),
}));

describe('ClickableUsername', () => {
  it('renders displayName when provided', () => {
    render(<ClickableUsername playerId="abc-123" displayName="Cool Player" />);
    expect(screen.getByText('Cool Player')).toBeInTheDocument();
  });

  it('renders playerId as fallback when no displayName', () => {
    render(<ClickableUsername playerId="abc-123" />);
    expect(screen.getByText('abc-123')).toBeInTheDocument();
  });

  it('links to profile page by ID', () => {
    render(<ClickableUsername playerId="abc-123" displayName="WordMaster" />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/en/player/abc-123');
  });

  it('renders as plain text when linked=false', () => {
    render(<ClickableUsername playerId="abc-123" displayName="user1" linked={false} />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('user1')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<ClickableUsername playerId="abc-123" className="custom-class" />);
    const link = screen.getByRole('link');
    expect(link).toHaveClass('custom-class');
  });
});
