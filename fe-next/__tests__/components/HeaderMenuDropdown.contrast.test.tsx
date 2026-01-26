/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import HeaderMenuDropdown from '../../components/HeaderMenuDropdown';

// Mock dependencies
jest.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: true }),
}));

jest.mock('next/link', () => {
  const MockLink = ({ children, href, ...props }: any) => {
    return <a href={href} {...props}>{children}</a>;
  };
  MockLink.displayName = 'MockLink';
  return MockLink;
});

jest.mock('../../components/auth/AuthButton', () => {
  const MockAuthButton = () => <div>Auth Button</div>;
  MockAuthButton.displayName = 'MockAuthButton';
  return MockAuthButton;
});

jest.mock('../../components/MusicControls', () => {
  const MockMusicControls = () => <div>Music Controls</div>;
  MockMusicControls.displayName = 'MockMusicControls';
  return MockMusicControls;
});

describe('HeaderMenuDropdown - Contrast Issues', () => {
  it('should have sufficient contrast for Brain Training link', () => {
    render(<HeaderMenuDropdown />);

    // Open the dropdown
    const menuButton = screen.getByRole('button', { name: /menu/i });
    fireEvent.click(menuButton);

    // Find Brain Training link
    const brainLink = screen.getByRole('link', { name: /brain.?training/i });

    // Get computed styles
    const styles = window.getComputedStyle(brainLink);

    // Brain Training link should NOT use low-opacity purple with black text
    // It should use solid colors with good contrast
    expect(styles.backgroundColor).not.toMatch(/rgba.*0\.[0-8]\)/); // No low opacity backgrounds
    expect(styles.color).not.toBe('rgb(26, 26, 46)'); // Should not be neo-black with purple background
  });

  it('should have z-index higher than GlobalBottomNav (z-50)', () => {
    const { container } = render(<HeaderMenuDropdown />);

    // Open the dropdown
    const menuButton = screen.getByRole('button', { name: /menu/i });
    fireEvent.click(menuButton);

    // Find the dropdown content by checking the className
    const dropdown = container.querySelector('[class*="z-"]');

    expect(dropdown).toBeTruthy();

    if (dropdown) {
      const className = dropdown.className;

      // Should have z-60 or higher (GlobalBottomNav has z-50)
      expect(className).toMatch(/z-(60|70|80|90|100)/);
    }
  });
});
