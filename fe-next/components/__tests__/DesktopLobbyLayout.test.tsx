import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DesktopLobbyLayout } from '../../host/components/pre-game/desktop/DesktopLobbyLayout';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div className={className} {...props}>
        {children}
      </div>
    ),
  },
}));

describe('DesktopLobbyLayout', () => {
  const defaultProps = {
    leftContent: <div data-testid="left-column">Left Content</div>,
    centerContent: <div data-testid="center-column">Center Content</div>,
    rightContent: <div data-testid="right-column">Right Content</div>,
  };

  it('should render all three columns', () => {
    render(<DesktopLobbyLayout {...defaultProps} />);

    expect(screen.getByTestId('left-column')).toBeInTheDocument();
    expect(screen.getByTestId('center-column')).toBeInTheDocument();
    expect(screen.getByTestId('right-column')).toBeInTheDocument();
  });

  it('should have a three-column grid layout class', () => {
    render(<DesktopLobbyLayout {...defaultProps} />);

    const layout = screen.getByTestId('desktop-lobby-layout');
    expect(layout).toHaveClass('grid');
  });

  it('should render left column in left aside element', () => {
    render(<DesktopLobbyLayout {...defaultProps} />);

    const leftAside = screen.getByTestId('desktop-left-column');
    expect(leftAside).toBeInTheDocument();
    expect(leftAside).toContainElement(screen.getByTestId('left-column'));
  });

  it('should render center column in main element', () => {
    render(<DesktopLobbyLayout {...defaultProps} />);

    const centerMain = screen.getByTestId('desktop-center-column');
    expect(centerMain).toBeInTheDocument();
    expect(centerMain).toContainElement(screen.getByTestId('center-column'));
  });

  it('should render right column in right aside element', () => {
    render(<DesktopLobbyLayout {...defaultProps} />);

    const rightAside = screen.getByTestId('desktop-right-column');
    expect(rightAside).toBeInTheDocument();
    expect(rightAside).toContainElement(screen.getByTestId('right-column'));
  });

  it('should apply custom className when provided', () => {
    render(<DesktopLobbyLayout {...defaultProps} className="custom-class" />);

    const layout = screen.getByTestId('desktop-lobby-layout');
    expect(layout).toHaveClass('custom-class');
  });

  it('should have proper spacing between columns', () => {
    render(<DesktopLobbyLayout {...defaultProps} />);

    const layout = screen.getByTestId('desktop-lobby-layout');
    // Check for gap class (gap-4 or gap-6)
    expect(layout.className).toMatch(/gap-/);
  });
});
