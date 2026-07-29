import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SettingsPanel } from '../../host/components/pre-game/desktop/SettingsPanel';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div className={className} {...props}>
        {children}
      </div>
    ),
    button: ({ children, className, onClick, ...props }: React.HTMLAttributes<HTMLButtonElement>) => (
      <button className={className} onClick={onClick} {...props}>
        {children}
      </button>
    ),
  },
}));

describe('SettingsPanel', () => {
  const mockT = (key: string) => key;
  const mockOnGameModeClick = vi.fn();
  const mockOnTvModeToggle = vi.fn();

  const defaultProps = {
    selectedGameMode: 'random' as const,
    onGameModeClick: mockOnGameModeClick,
    tvMode: false,
    onTvModeToggle: mockOnTvModeToggle,
    t: mockT,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the settings panel', () => {
    render(<SettingsPanel {...defaultProps} />);

    expect(screen.getByTestId('settings-panel')).toBeInTheDocument();
  });

  it('should render all three game mode options', () => {
    render(<SettingsPanel {...defaultProps} />);

    expect(screen.getByTestId('game-mode-random')).toBeInTheDocument();
    expect(screen.getByTestId('game-mode-classic')).toBeInTheDocument();
    expect(screen.getByTestId('game-mode-word-hunt')).toBeInTheDocument();
  });

  it('should highlight the selected game mode', () => {
    render(<SettingsPanel {...defaultProps} selectedGameMode="classic" />);

    const classicMode = screen.getByTestId('game-mode-classic');
    expect(classicMode).toHaveAttribute('data-selected', 'true');
  });

  it('should call onGameModeClick when a mode is clicked', () => {
    render(<SettingsPanel {...defaultProps} />);

    fireEvent.click(screen.getByTestId('game-mode-word-hunt'));
    expect(mockOnGameModeClick).toHaveBeenCalledWith('word-hunt');
  });

  it('should render TV mode toggle', () => {
    render(<SettingsPanel {...defaultProps} />);

    expect(screen.getByTestId('tv-mode-toggle')).toBeInTheDocument();
  });

  it('should call onTvModeToggle when TV mode is toggled', () => {
    render(<SettingsPanel {...defaultProps} />);

    const toggle = screen.getByTestId('tv-mode-toggle');
    fireEvent.click(toggle);
    expect(mockOnTvModeToggle).toHaveBeenCalled();
  });

  it('should show TV mode as checked when tvMode is true', () => {
    render(<SettingsPanel {...defaultProps} tvMode={true} />);

    const toggle = screen.getByTestId('tv-mode-toggle');
    expect(toggle).toHaveAttribute('data-checked', 'true');
  });
});
