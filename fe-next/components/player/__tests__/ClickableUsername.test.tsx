/**
 * ClickableUsername Component Tests
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ClickableUsername from '../ClickableUsername';

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (key: string) => key }),
}));

describe('ClickableUsername', () => {
  it('renders displayName when provided', () => {
    render(<ClickableUsername username="user1" displayName="Cool Player" />);
    expect(screen.getByText('Cool Player')).toBeInTheDocument();
  });

  it('renders username as fallback', () => {
    render(<ClickableUsername username="user1" />);
    expect(screen.getByText('user1')).toBeInTheDocument();
  });

  it('links to profile page', () => {
    render(<ClickableUsername username="WordMaster" />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/en/player/WordMaster');
  });

  it('encodes special characters in URL', () => {
    render(<ClickableUsername username="Word Master" />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/en/player/Word%20Master');
  });

  it('renders as plain text when linked=false', () => {
    render(<ClickableUsername username="user1" linked={false} />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('user1')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<ClickableUsername username="user1" className="custom-class" />);
    const link = screen.getByRole('link');
    expect(link).toHaveClass('custom-class');
  });
});
