import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SettingsPanel } from '../../host/components/pre-game/desktop/SettingsPanel';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
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
  const mockOnPresetClick = jest.fn();
  const mockOnTvModeToggle = jest.fn();

  const defaultProps = {
    selectedPreset: 'party' as const,
    onPresetClick: mockOnPresetClick,
    tvMode: false,
    onTvModeToggle: mockOnTvModeToggle,
    t: mockT,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the settings panel', () => {
    render(<SettingsPanel {...defaultProps} />);

    expect(screen.getByTestId('settings-panel')).toBeInTheDocument();
  });

  it('should render all three preset options', () => {
    render(<SettingsPanel {...defaultProps} />);

    expect(screen.getByTestId('preset-fast')).toBeInTheDocument();
    expect(screen.getByTestId('preset-party')).toBeInTheDocument();
    expect(screen.getByTestId('preset-challenge')).toBeInTheDocument();
  });

  it('should highlight the selected preset', () => {
    render(<SettingsPanel {...defaultProps} selectedPreset="fast" />);

    const fastPreset = screen.getByTestId('preset-fast');
    // Check if it has some kind of selected styling
    expect(fastPreset).toHaveAttribute('data-selected', 'true');
  });

  it('should call onPresetClick when a preset is clicked', () => {
    render(<SettingsPanel {...defaultProps} />);

    fireEvent.click(screen.getByTestId('preset-fast'));
    expect(mockOnPresetClick).toHaveBeenCalledWith('fast');
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
