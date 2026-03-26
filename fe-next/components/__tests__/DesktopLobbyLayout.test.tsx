import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DesktopLobbyLayout } from '../../host/components/pre-game/desktop/DesktopLobbyLayout';

// Mock framer-motion
vi.mock('framer-motion', () => ({
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
    rightContent: <div data-testid="right-column">Right Content</div>,
  };

  it('should render both columns', () => {
    render(<DesktopLobbyLayout {...defaultProps} />);

    expect(screen.getByTestId('left-column')).toBeInTheDocument();
    expect(screen.getByTestId('right-column')).toBeInTheDocument();
  });

  it('should have a grid layout class', () => {
    render(<DesktopLobbyLayout {...defaultProps} />);

    const layout = screen.getByTestId('desktop-lobby-layout');
    expect(layout).toHaveClass('grid');
  });

  it('should render left column content', () => {
    render(<DesktopLobbyLayout {...defaultProps} />);

    const leftCol = screen.getByTestId('desktop-left-column');
    expect(leftCol).toBeInTheDocument();
    expect(leftCol).toContainElement(screen.getByTestId('left-column'));
  });

  it('should render right column content', () => {
    render(<DesktopLobbyLayout {...defaultProps} />);

    const rightCol = screen.getByTestId('desktop-right-column');
    expect(rightCol).toBeInTheDocument();
    expect(rightCol).toContainElement(screen.getByTestId('right-column'));
  });

  it('should apply custom className when provided', () => {
    render(<DesktopLobbyLayout {...defaultProps} className="custom-class" />);

    const layout = screen.getByTestId('desktop-lobby-layout');
    expect(layout).toHaveClass('custom-class');
  });

  it('should have proper spacing between columns', () => {
    render(<DesktopLobbyLayout {...defaultProps} />);

    const layout = screen.getByTestId('desktop-lobby-layout');
    expect(layout.className).toMatch(/gap-/);
  });

  it('should use 12-column grid', () => {
    render(<DesktopLobbyLayout {...defaultProps} />);

    const layout = screen.getByTestId('desktop-lobby-layout');
    expect(layout).toHaveClass('grid-cols-12');
  });

  it('left column should span 7 columns', () => {
    render(<DesktopLobbyLayout {...defaultProps} />);

    const leftCol = screen.getByTestId('desktop-left-column');
    expect(leftCol).toHaveClass('col-span-7');
  });

  it('right column should span 5 columns', () => {
    render(<DesktopLobbyLayout {...defaultProps} />);

    const rightCol = screen.getByTestId('desktop-right-column');
    expect(rightCol).toHaveClass('col-span-5');
  });
});
