import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import GiftModal from '../GiftModal';
import { LanguageProvider } from '@/contexts/LanguageContext';

// Mock framer-motion
vi.mock('framer-motion', () => {
  const React = require('react');
  const MotionDiv = React.forwardRef(function MotionDiv({ children, ...props }: any, ref: any) {
    return <div ref={ref} {...props}>{children}</div>;
  });
  const MotionButton = React.forwardRef(function MotionButton({ children, ...props }: any, ref: any) {
    return <button ref={ref} {...props}>{children}</button>;
  });
  return {
    m: { div: MotionDiv, button: MotionButton },
    AnimatePresence: function AnimatePresence({ children }: any) { return <>{children}</>; },
  };
});

// Mock lucide-react
vi.mock('lucide-react', () => ({
  X: () => <div>X</div>,
  Gift: () => <div>Gift</div>,
  Lightbulb: () => <div>Lightbulb</div>,
  Shield: () => <div>Shield</div>,
  Coins: () => <div>Coins</div>,
}));

describe('GiftModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSend: vi.fn(),
    recipientName: 'Bob',
    senderBalance: 100,
    giftsRemaining: 2,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should render when isOpen is true', () => {
    render(
      <LanguageProvider>
        <GiftModal {...defaultProps} />
      </LanguageProvider>
    );

    expect(screen.getByTestId('gift-modal')).toBeInTheDocument();
  });

  test('should not render when isOpen is false', () => {
    render(
      <LanguageProvider>
        <GiftModal {...defaultProps} isOpen={false} />
      </LanguageProvider>
    );

    expect(screen.queryByTestId('gift-modal')).not.toBeInTheDocument();
  });

  test('should show 3 gift type cards', () => {
    render(
      <LanguageProvider>
        <GiftModal {...defaultProps} />
      </LanguageProvider>
    );

    expect(screen.getByTestId('gift-card-hints')).toBeInTheDocument();
    expect(screen.getByTestId('gift-card-streak_freeze')).toBeInTheDocument();
    expect(screen.getByTestId('gift-card-coins')).toBeInTheDocument();
  });

  test('should show remaining daily gifts', () => {
    render(
      <LanguageProvider>
        <GiftModal {...defaultProps} giftsRemaining={1} />
      </LanguageProvider>
    );

    expect(screen.getByTestId('gifts-remaining')).toHaveTextContent('1');
  });

  test('should call onSend with selected gift type', () => {
    render(
      <LanguageProvider>
        <GiftModal {...defaultProps} />
      </LanguageProvider>
    );

    fireEvent.click(screen.getByTestId('gift-card-hints'));
    fireEvent.click(screen.getByTestId('send-gift-button'));

    expect(defaultProps.onSend).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'hints' })
    );
  });

  test('should call onClose when close button clicked', () => {
    render(
      <LanguageProvider>
        <GiftModal {...defaultProps} />
      </LanguageProvider>
    );

    fireEvent.click(screen.getByTestId('close-gift-modal'));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });
});
