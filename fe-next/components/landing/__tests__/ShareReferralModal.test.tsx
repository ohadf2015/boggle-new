import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ShareReferralModal } from '../ShareReferralModal';

// Mock auth context
let mockIsAuthenticated = false;
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: mockIsAuthenticated }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en', dir: 'ltr' }),
}));

// Mock the hook
const mockFetchShareData = vi.fn();
const mockHandleCopy = vi.fn();
const mockHandleShare = vi.fn();
let mockHookState = {
  referralCode: null as string | null,
  shareUrl: 'https://lexiclash.test',
  referralRewardXp: 100,
  isLoading: false,
  copied: false,
  fetchShareData: mockFetchShareData,
  handleCopy: mockHandleCopy,
  handleShare: mockHandleShare,
};

vi.mock('../useReferralShare', () => ({
  useReferralShare: () => mockHookState,
}));

vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  m: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('ShareReferralModal', () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAuthenticated = false;
    mockHookState = {
      referralCode: null,
      shareUrl: 'https://lexiclash.test',
      referralRewardXp: 100,
      isLoading: false,
      copied: false,
      fetchShareData: mockFetchShareData,
      handleCopy: mockHandleCopy,
      handleShare: mockHandleShare,
    };
  });

  it('should not render when isOpen=false', () => {
    render(<ShareReferralModal isOpen={false} onClose={onClose} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should render modal when isOpen=true', () => {
    render(<ShareReferralModal isOpen={true} onClose={onClose} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('should call fetchShareData when modal opens', async () => {
    render(<ShareReferralModal isOpen={true} onClose={onClose} />);
    await waitFor(() => {
      expect(mockFetchShareData).toHaveBeenCalledTimes(1);
    });
  });

  it('should call onClose when backdrop is clicked', () => {
    render(<ShareReferralModal isOpen={true} onClose={onClose} />);
    fireEvent.click(screen.getByTestId('share-modal-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when close button is clicked', () => {
    render(<ShareReferralModal isOpen={true} onClose={onClose} />);
    fireEvent.click(screen.getByTestId('share-modal-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when Escape key is pressed', () => {
    // GIVEN
    render(<ShareReferralModal isOpen={true} onClose={onClose} />);

    // WHEN
    fireEvent.keyDown(document, { key: 'Escape' });

    // THEN
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  describe('guest state (not authenticated)', () => {
    it('should show guest nudge message', () => {
      mockIsAuthenticated = false;
      render(<ShareReferralModal isOpen={true} onClose={onClose} />);
      expect(screen.getByTestId('share-modal-guest-nudge')).toBeInTheDocument();
    });

    it('should NOT show referral code section', () => {
      mockIsAuthenticated = false;
      render(<ShareReferralModal isOpen={true} onClose={onClose} />);
      expect(screen.queryByTestId('share-modal-referral-code')).not.toBeInTheDocument();
    });
  });

  describe('authenticated state', () => {
    beforeEach(() => {
      mockIsAuthenticated = true;
      mockHookState = {
        ...mockHookState,
        referralCode: 'ABC123',
        shareUrl: 'https://lexiclash.test?ref=ABC123',
        referralRewardXp: 100,
      };
    });

    it('should show referral code when authenticated with code', () => {
      render(<ShareReferralModal isOpen={true} onClose={onClose} />);
      expect(screen.getByTestId('share-modal-referral-code')).toBeInTheDocument();
      expect(screen.getByText('ABC123')).toBeInTheDocument();
    });

    it('should NOT show guest nudge when authenticated', () => {
      render(<ShareReferralModal isOpen={true} onClose={onClose} />);
      expect(screen.queryByTestId('share-modal-guest-nudge')).not.toBeInTheDocument();
    });

    it('should show loading skeleton when isLoading=true', () => {
      mockHookState = { ...mockHookState, isLoading: true, referralCode: null };
      render(<ShareReferralModal isOpen={true} onClose={onClose} />);
      expect(screen.getByTestId('share-modal-loading')).toBeInTheDocument();
    });
  });

  describe('share buttons', () => {
    it('should call handleShare("whatsapp") on WhatsApp button click', () => {
      render(<ShareReferralModal isOpen={true} onClose={onClose} />);
      fireEvent.click(screen.getByTestId('share-btn-whatsapp'));
      expect(mockHandleShare).toHaveBeenCalledWith('whatsapp');
    });

    it('should call handleShare("telegram") on Telegram button click', () => {
      render(<ShareReferralModal isOpen={true} onClose={onClose} />);
      fireEvent.click(screen.getByTestId('share-btn-telegram'));
      expect(mockHandleShare).toHaveBeenCalledWith('telegram');
    });

    it('should call handleShare("native") on Share button click', () => {
      render(<ShareReferralModal isOpen={true} onClose={onClose} />);
      fireEvent.click(screen.getByTestId('share-btn-native'));
      expect(mockHandleShare).toHaveBeenCalledWith('native');
    });

    it('should call handleCopy on copy button click', () => {
      render(<ShareReferralModal isOpen={true} onClose={onClose} />);
      fireEvent.click(screen.getByTestId('share-btn-copy'));
      expect(mockHandleCopy).toHaveBeenCalledTimes(1);
    });

    it('should show "Copied!" text when copied=true', () => {
      mockHookState = { ...mockHookState, copied: true };
      render(<ShareReferralModal isOpen={true} onClose={onClose} />);
      expect(screen.getByTestId('share-btn-copy')).toHaveTextContent('common.copied');
    });
  });
});
