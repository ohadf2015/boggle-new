# Landing Page Share Button — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a permanent "Invite Friends, Earn XP" share button below the mode cards on the landing page, opening a modal with WhatsApp/Telegram/copy/native share options, personalized with the user's referral code if authenticated.

**Architecture:** New `useReferralShare` hook abstracts share logic (API fetch + platform dispatch). New `LandingShareBanner` renders the entry point in the existing grid. New `ShareReferralModal` shows the share sheet. `LandingView` wires them together and removes the deprecated referral callout bubble.

**Tech Stack:** React + TypeScript, Framer Motion (AnimatePresence), Tailwind neo-brutalist design system, `/api/referral` GET endpoint (already built), `trackShare()` from `growthTracking.ts`

---

## Task 1: `useReferralShare` hook

**Files:**
- Create: `fe-next/components/landing/useReferralShare.ts`
- Create: `fe-next/components/landing/__tests__/useReferralShare.test.ts`

### Step 1: Write the failing tests

Create `fe-next/components/landing/__tests__/useReferralShare.test.ts`:

```typescript
import { renderHook, act } from '@testing-library/react';
import { useReferralShare } from '../useReferralShare';

// Mock auth context
let mockIsAuthenticated = false;
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: mockIsAuthenticated }),
}));

// Mock growthTracking
jest.mock('@/utils/growthTracking', () => ({
  trackShare: jest.fn(),
}));

// Mock navigator.clipboard
Object.defineProperty(navigator, 'clipboard', {
  value: { writeText: jest.fn().mockResolvedValue(undefined) },
  writable: true,
});

// Mock window.open
global.open = jest.fn();

// Mock window.location.origin
Object.defineProperty(window, 'location', {
  value: { origin: 'https://lexiclash.test' },
  writable: true,
});

describe('useReferralShare', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsAuthenticated = false;
  });

  describe('guest user (not authenticated)', () => {
    it('should use window.location.origin as shareUrl', async () => {
      // GIVEN - guest user
      mockIsAuthenticated = false;

      // WHEN
      const { result } = renderHook(() => useReferralShare());
      await act(async () => {
        await result.current.fetchShareData();
      });

      // THEN
      expect(result.current.shareUrl).toBe('https://lexiclash.test');
      expect(result.current.referralCode).toBeNull();
    });

    it('should not call /api/referral for guests', async () => {
      // GIVEN
      global.fetch = jest.fn();
      mockIsAuthenticated = false;

      // WHEN
      const { result } = renderHook(() => useReferralShare());
      await act(async () => {
        await result.current.fetchShareData();
      });

      // THEN
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('authenticated user', () => {
    beforeEach(() => {
      mockIsAuthenticated = true;
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            referralCode: 'ABC123',
            shareUrl: 'https://lexiclash.test?ref=ABC123',
            referralRewardXp: 100,
          },
        }),
      });
    });

    it('should fetch referral data and return code + url', async () => {
      // GIVEN - authenticated user, API returns referral data

      // WHEN
      const { result } = renderHook(() => useReferralShare());
      await act(async () => {
        await result.current.fetchShareData();
      });

      // THEN
      expect(result.current.referralCode).toBe('ABC123');
      expect(result.current.shareUrl).toBe('https://lexiclash.test?ref=ABC123');
      expect(result.current.referralRewardXp).toBe(100);
    });

    it('should set isLoading true during fetch and false after', async () => {
      // GIVEN
      let resolvePromise: (value: unknown) => void;
      global.fetch = jest.fn().mockReturnValue(
        new Promise((resolve) => { resolvePromise = resolve; })
      );

      // WHEN
      const { result } = renderHook(() => useReferralShare());
      const fetchPromise = act(async () => {
        result.current.fetchShareData();
      });

      // THEN loading starts
      // (after act resolves, loading will be false — we just verify no crash)
      resolvePromise!({
        ok: true,
        json: async () => ({ data: { referralCode: 'X', shareUrl: 'y', referralRewardXp: 100 } }),
      });
      await fetchPromise;
      expect(result.current.isLoading).toBe(false);
    });

    it('should fallback to window.origin if API fails', async () => {
      // GIVEN
      global.fetch = jest.fn().mockResolvedValue({ ok: false });

      // WHEN
      const { result } = renderHook(() => useReferralShare());
      await act(async () => {
        await result.current.fetchShareData();
      });

      // THEN
      expect(result.current.shareUrl).toBe('https://lexiclash.test');
    });
  });

  describe('handleCopy', () => {
    it('should copy shareUrl and set copied=true then reset after 2s', async () => {
      // GIVEN
      jest.useFakeTimers();
      mockIsAuthenticated = false;
      const { result } = renderHook(() => useReferralShare());
      await act(async () => { await result.current.fetchShareData(); });

      // WHEN
      await act(async () => { await result.current.handleCopy(); });

      // THEN
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://lexiclash.test');
      expect(result.current.copied).toBe(true);

      // AFTER 2s
      act(() => { jest.advanceTimersByTime(2000); });
      expect(result.current.copied).toBe(false);

      jest.useRealTimers();
    });

    it('should call trackShare("copy")', async () => {
      // GIVEN
      const { trackShare } = require('@/utils/growthTracking');
      mockIsAuthenticated = false;
      const { result } = renderHook(() => useReferralShare());
      await act(async () => { await result.current.fetchShareData(); });

      // WHEN
      await act(async () => { await result.current.handleCopy(); });

      // THEN
      expect(trackShare).toHaveBeenCalledWith('copy');
    });
  });

  describe('handleShare', () => {
    it('should open WhatsApp URL for whatsapp platform', async () => {
      // GIVEN
      mockIsAuthenticated = false;
      const { result } = renderHook(() => useReferralShare());
      await act(async () => { await result.current.fetchShareData(); });

      // WHEN
      await act(async () => { await result.current.handleShare('whatsapp'); });

      // THEN
      expect(global.open).toHaveBeenCalledWith(
        expect.stringContaining('wa.me'),
        '_blank',
        'noopener,noreferrer'
      );
    });

    it('should open Telegram URL for telegram platform', async () => {
      // GIVEN
      mockIsAuthenticated = false;
      const { result } = renderHook(() => useReferralShare());
      await act(async () => { await result.current.fetchShareData(); });

      // WHEN
      await act(async () => { await result.current.handleShare('telegram'); });

      // THEN
      expect(global.open).toHaveBeenCalledWith(
        expect.stringContaining('t.me'),
        '_blank',
        'noopener,noreferrer'
      );
    });

    it('should use navigator.share for native platform when available', async () => {
      // GIVEN
      mockIsAuthenticated = false;
      const mockShare = jest.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'share', { value: mockShare, configurable: true });
      const { result } = renderHook(() => useReferralShare());
      await act(async () => { await result.current.fetchShareData(); });

      // WHEN
      await act(async () => { await result.current.handleShare('native'); });

      // THEN
      expect(mockShare).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Join LexiClash',
        url: 'https://lexiclash.test',
      }));
    });
  });
});
```

### Step 2: Run test to confirm it fails

```bash
cd fe-next && npx jest --testPathPattern="components/landing/__tests__/useReferralShare" --no-coverage
```

Expected: FAIL — `Cannot find module '../useReferralShare'`

### Step 3: Implement the hook

Create `fe-next/components/landing/useReferralShare.ts`:

```typescript
import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { trackShare } from '@/utils/growthTracking';

export interface ReferralShareState {
  referralCode: string | null;
  shareUrl: string;
  referralRewardXp: number;
  isLoading: boolean;
  copied: boolean;
  fetchShareData: () => Promise<void>;
  handleCopy: () => Promise<void>;
  handleShare: (platform: 'whatsapp' | 'telegram' | 'native') => Promise<void>;
}

export function useReferralShare(): ReferralShareState {
  const { isAuthenticated } = useAuth();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState('');
  const [referralRewardXp, setReferralRewardXp] = useState(100);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchShareData = useCallback(async () => {
    if (!isAuthenticated) {
      setShareUrl(typeof window !== 'undefined' ? window.location.origin : '');
      setReferralCode(null);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/referral');
      if (res.ok) {
        const { data } = await res.json();
        setReferralCode(data.referralCode);
        setShareUrl(data.shareUrl);
        setReferralRewardXp(data.referralRewardXp);
      } else {
        setShareUrl(typeof window !== 'undefined' ? window.location.origin : '');
      }
    } catch {
      setShareUrl(typeof window !== 'undefined' ? window.location.origin : '');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  const handleCopy = useCallback(async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      trackShare('copy');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Silently fail — clipboard may be unavailable
    }
  }, [shareUrl]);

  const handleShare = useCallback(
    async (platform: 'whatsapp' | 'telegram' | 'native') => {
      if (!shareUrl) return;

      const shareText = referralCode
        ? `Join me on LexiClash! Use my referral code: ${referralCode}`
        : 'Play LexiClash - the best multiplayer word game!';

      if (platform === 'native' && navigator.share) {
        try {
          await navigator.share({ title: 'Join LexiClash', text: shareText, url: shareUrl });
          trackShare('native');
          return;
        } catch {
          // Fall through to URL-based share
        }
      }

      const shareUrls: Record<string, string> = {
        whatsapp: `https://wa.me/?text=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`,
        telegram: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`,
      };

      if (shareUrls[platform]) {
        window.open(shareUrls[platform], '_blank', 'noopener,noreferrer');
        trackShare(platform as 'whatsapp' | 'telegram');
      }
    },
    [shareUrl, referralCode]
  );

  return { referralCode, shareUrl, referralRewardXp, isLoading, copied, fetchShareData, handleCopy, handleShare };
}
```

### Step 4: Run tests to confirm they pass

```bash
cd fe-next && npx jest --testPathPattern="components/landing/__tests__/useReferralShare" --no-coverage
```

Expected: PASS — all 9 tests green

### Step 5: Commit

```bash
cd fe-next && git add components/landing/useReferralShare.ts components/landing/__tests__/useReferralShare.test.ts
git commit -m "feat(landing): add useReferralShare hook with share logic and tests"
```

---

## Task 2: `ShareReferralModal` component

**Files:**
- Create: `fe-next/components/landing/ShareReferralModal.tsx`
- Create: `fe-next/components/landing/__tests__/ShareReferralModal.test.tsx`

### Step 1: Write the failing tests

Create `fe-next/components/landing/__tests__/ShareReferralModal.test.tsx`:

```tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ShareReferralModal } from '../ShareReferralModal';

// Mock auth context
let mockIsAuthenticated = false;
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: mockIsAuthenticated }),
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en', dir: 'ltr' }),
}));

// Mock the hook
const mockFetchShareData = jest.fn();
const mockHandleCopy = jest.fn();
const mockHandleShare = jest.fn();
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

jest.mock('../useReferralShare', () => ({
  useReferralShare: () => mockHookState,
}));

jest.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('ShareReferralModal', () => {
  const onClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
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
    // GIVEN / WHEN
    render(<ShareReferralModal isOpen={false} onClose={onClose} />);

    // THEN
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should render modal when isOpen=true', () => {
    // GIVEN / WHEN
    render(<ShareReferralModal isOpen={true} onClose={onClose} />);

    // THEN
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('should call fetchShareData when modal opens', async () => {
    // GIVEN / WHEN
    render(<ShareReferralModal isOpen={true} onClose={onClose} />);

    // THEN
    await waitFor(() => {
      expect(mockFetchShareData).toHaveBeenCalledTimes(1);
    });
  });

  it('should call onClose when backdrop is clicked', () => {
    // GIVEN
    render(<ShareReferralModal isOpen={true} onClose={onClose} />);

    // WHEN
    fireEvent.click(screen.getByTestId('share-modal-backdrop'));

    // THEN
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when close button is clicked', () => {
    // GIVEN
    render(<ShareReferralModal isOpen={true} onClose={onClose} />);

    // WHEN
    fireEvent.click(screen.getByTestId('share-modal-close'));

    // THEN
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  describe('guest state (not authenticated)', () => {
    it('should show guest nudge message', () => {
      // GIVEN
      mockIsAuthenticated = false;

      // WHEN
      render(<ShareReferralModal isOpen={true} onClose={onClose} />);

      // THEN
      expect(screen.getByTestId('share-modal-guest-nudge')).toBeInTheDocument();
    });

    it('should NOT show referral code section', () => {
      // GIVEN
      mockIsAuthenticated = false;

      // WHEN
      render(<ShareReferralModal isOpen={true} onClose={onClose} />);

      // THEN
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
      // GIVEN / WHEN
      render(<ShareReferralModal isOpen={true} onClose={onClose} />);

      // THEN
      expect(screen.getByTestId('share-modal-referral-code')).toBeInTheDocument();
      expect(screen.getByText('ABC123')).toBeInTheDocument();
    });

    it('should NOT show guest nudge when authenticated', () => {
      // GIVEN / WHEN
      render(<ShareReferralModal isOpen={true} onClose={onClose} />);

      // THEN
      expect(screen.queryByTestId('share-modal-guest-nudge')).not.toBeInTheDocument();
    });

    it('should show loading skeleton when isLoading=true', () => {
      // GIVEN
      mockHookState = { ...mockHookState, isLoading: true, referralCode: null };

      // WHEN
      render(<ShareReferralModal isOpen={true} onClose={onClose} />);

      // THEN
      expect(screen.getByTestId('share-modal-loading')).toBeInTheDocument();
    });
  });

  describe('share buttons', () => {
    it('should call handleShare("whatsapp") on WhatsApp button click', () => {
      // GIVEN
      render(<ShareReferralModal isOpen={true} onClose={onClose} />);

      // WHEN
      fireEvent.click(screen.getByTestId('share-btn-whatsapp'));

      // THEN
      expect(mockHandleShare).toHaveBeenCalledWith('whatsapp');
    });

    it('should call handleShare("telegram") on Telegram button click', () => {
      // GIVEN
      render(<ShareReferralModal isOpen={true} onClose={onClose} />);

      // WHEN
      fireEvent.click(screen.getByTestId('share-btn-telegram'));

      // THEN
      expect(mockHandleShare).toHaveBeenCalledWith('telegram');
    });

    it('should call handleShare("native") on Share button click', () => {
      // GIVEN
      render(<ShareReferralModal isOpen={true} onClose={onClose} />);

      // WHEN
      fireEvent.click(screen.getByTestId('share-btn-native'));

      // THEN
      expect(mockHandleShare).toHaveBeenCalledWith('native');
    });

    it('should call handleCopy on copy button click', () => {
      // GIVEN
      render(<ShareReferralModal isOpen={true} onClose={onClose} />);

      // WHEN
      fireEvent.click(screen.getByTestId('share-btn-copy'));

      // THEN
      expect(mockHandleCopy).toHaveBeenCalledTimes(1);
    });

    it('should show "Copied!" text when copied=true', () => {
      // GIVEN
      mockHookState = { ...mockHookState, copied: true };

      // WHEN
      render(<ShareReferralModal isOpen={true} onClose={onClose} />);

      // THEN
      expect(screen.getByTestId('share-btn-copy')).toHaveTextContent('common.copied');
    });
  });
});
```

### Step 2: Run tests to confirm they fail

```bash
cd fe-next && npx jest --testPathPattern="components/landing/__tests__/ShareReferralModal" --no-coverage
```

Expected: FAIL — `Cannot find module '../ShareReferralModal'`

### Step 3: Implement the component

Create `fe-next/components/landing/ShareReferralModal.tsx`:

```tsx
'use client';

import React, { useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, Share2, Gift } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { useReferralShare } from './useReferralShare';

// Inline SVG icons to avoid adding new dependencies
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

const TelegramIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em" aria-hidden="true">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
  </svg>
);

interface ShareReferralModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShareReferralModal({ isOpen, onClose }: ShareReferralModalProps) {
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const { referralCode, referralRewardXp, isLoading, copied, fetchShareData, handleCopy, handleShare } =
    useReferralShare();

  // Fetch share data when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchShareData();
    }
  }, [isOpen, fetchShareData]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <m.div
            data-testid="share-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-neo-black/60 z-[60] backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Modal — bottom sheet on mobile, centered on desktop */}
          <m.div
            initial={{ opacity: 0, y: 60, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-modal-title"
            className={cn(
              'fixed bottom-0 left-0 right-0 z-[61]',
              'sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2',
              'sm:w-full sm:max-w-md',
              'bg-white dark:bg-neo-navy',
              'border-t-3 border-neo-black',
              'sm:border-3 sm:rounded-neo',
              'shadow-hard-lg',
              'p-5 sm:p-6',
            )}
          >
            {/* Close button */}
            <button
              data-testid="share-modal-close"
              onClick={onClose}
              className="absolute top-3 right-3 rtl:right-auto rtl:left-3 p-1.5 rounded-neo hover:bg-neo-black/10 transition-colors"
              aria-label={t('common.close') || 'Close'}
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-neo-pink/20 rounded-neo border border-neo-pink/30 shrink-0">
                <Gift className="w-5 h-5 text-neo-pink" aria-hidden="true" />
              </div>
              <h2
                id="share-modal-title"
                className="font-black text-base sm:text-lg uppercase text-neo-black dark:text-neo-white"
              >
                {t('landing.shareModalTitle') || 'Invite Friends & Earn XP'}
              </h2>
            </div>

            {/* Auth: loading skeleton */}
            {isAuthenticated && isLoading && (
              <div
                data-testid="share-modal-loading"
                className="h-14 animate-pulse bg-neo-black/10 dark:bg-white/10 rounded-neo mb-4"
              />
            )}

            {/* Auth: referral code display */}
            {isAuthenticated && !isLoading && referralCode && (
              <div
                data-testid="share-modal-referral-code"
                className="flex items-center justify-between bg-neo-black/5 dark:bg-white/10 rounded-neo border border-neo-black/10 p-3 mb-3"
              >
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wide text-neo-black/50 dark:text-white/50 mb-0.5">
                    {t('profile.yourReferralCode') || 'Your Code'}
                  </div>
                  <code className="text-xl font-black text-neo-pink tracking-wider">{referralCode}</code>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bold uppercase tracking-wide text-neo-black/50 dark:text-white/50 mb-0.5">
                    {t('common.reward') || 'Reward'}
                  </div>
                  <div className="text-lg font-black text-neo-lime">+{referralRewardXp} XP</div>
                </div>
              </div>
            )}

            {/* Auth: XP reward message */}
            {isAuthenticated && !isLoading && (
              <p className="text-sm font-bold text-neo-pink mb-4">
                ✨ {t('landing.shareXpReward') || 'You earn +100 XP when they join!'}
              </p>
            )}

            {/* Guest: nudge to sign in */}
            {!isAuthenticated && (
              <p
                data-testid="share-modal-guest-nudge"
                className="text-sm text-neo-black/70 dark:text-white/70 mb-4 bg-neo-lime/20 rounded-neo p-3 border-2 border-neo-lime/50"
              >
                🎯 {t('landing.shareGuestNudge') || 'Sign in to get your personal link & earn XP'}
              </p>
            )}

            {/* Share buttons row */}
            <div className="flex gap-2 mb-3">
              <button
                data-testid="share-btn-whatsapp"
                onClick={() => handleShare('whatsapp')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 h-11',
                  'bg-[#25D366] hover:bg-[#20b858] text-white font-bold',
                  'rounded-neo border-3 border-neo-black shadow-hard',
                  'transition-shadow hover:shadow-hard-lg active:shadow-none',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-lime'
                )}
                aria-label="Share via WhatsApp"
              >
                <WhatsAppIcon className="w-4 h-4 shrink-0" />
                <span className="text-sm hidden sm:inline">WhatsApp</span>
              </button>

              <button
                data-testid="share-btn-telegram"
                onClick={() => handleShare('telegram')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 h-11',
                  'bg-[#0088cc] hover:bg-[#0077b5] text-white font-bold',
                  'rounded-neo border-3 border-neo-black shadow-hard',
                  'transition-shadow hover:shadow-hard-lg active:shadow-none',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-lime'
                )}
                aria-label="Share via Telegram"
              >
                <TelegramIcon className="w-4 h-4 shrink-0" />
                <span className="text-sm hidden sm:inline">Telegram</span>
              </button>

              <button
                data-testid="share-btn-native"
                onClick={() => handleShare('native')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 h-11',
                  'bg-neo-pink hover:bg-neo-pink/90 text-white font-bold',
                  'rounded-neo border-3 border-neo-black shadow-hard',
                  'transition-shadow hover:shadow-hard-lg active:shadow-none',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-lime'
                )}
                aria-label={t('common.share') || 'Share'}
              >
                <Share2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span className="text-sm hidden sm:inline">{t('common.share') || 'Share'}</span>
              </button>
            </div>

            {/* Copy link button */}
            <button
              data-testid="share-btn-copy"
              onClick={handleCopy}
              className={cn(
                'w-full flex items-center justify-center gap-2 h-10 font-bold text-sm',
                'rounded-neo border-3 border-neo-black',
                'transition-all',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-lime',
                copied
                  ? 'bg-neo-lime text-neo-black shadow-none'
                  : 'bg-neo-black/5 dark:bg-white/10 hover:bg-neo-black/10 shadow-hard hover:shadow-hard-lg active:shadow-none'
              )}
            >
              {copied ? (
                <Check className="w-4 h-4 shrink-0" aria-hidden="true" />
              ) : (
                <Copy className="w-4 h-4 shrink-0" aria-hidden="true" />
              )}
              <span>{copied ? (t('common.copied') || 'Copied!') : (t('common.copy') || 'Copy Link')}</span>
            </button>
          </m.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

### Step 4: Run tests to confirm they pass

```bash
cd fe-next && npx jest --testPathPattern="components/landing/__tests__/ShareReferralModal" --no-coverage
```

Expected: PASS — all tests green

### Step 5: Commit

```bash
cd fe-next && git add components/landing/ShareReferralModal.tsx components/landing/__tests__/ShareReferralModal.test.tsx
git commit -m "feat(landing): add ShareReferralModal with auth/guest states and share buttons"
```

---

## Task 3: `LandingShareBanner` component

**Files:**
- Create: `fe-next/components/landing/LandingShareBanner.tsx`
- Create: `fe-next/components/landing/__tests__/LandingShareBanner.test.tsx`

### Step 1: Write the failing tests

Create `fe-next/components/landing/__tests__/LandingShareBanner.test.tsx`:

```tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LandingShareBanner } from '../LandingShareBanner';

let mockIsAuthenticated = false;
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: mockIsAuthenticated }),
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en', dir: 'ltr' }),
}));

jest.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

describe('LandingShareBanner', () => {
  const onShareClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsAuthenticated = false;
  });

  it('should render the share button', () => {
    // GIVEN / WHEN
    render(<LandingShareBanner onShareClick={onShareClick} />);

    // THEN
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('should show landing.shareTitle text', () => {
    // GIVEN / WHEN
    render(<LandingShareBanner onShareClick={onShareClick} />);

    // THEN
    expect(screen.getByText('landing.shareTitle')).toBeInTheDocument();
  });

  it('should call onShareClick when button is clicked', () => {
    // GIVEN
    render(<LandingShareBanner onShareClick={onShareClick} />);

    // WHEN
    fireEvent.click(screen.getByRole('button'));

    // THEN
    expect(onShareClick).toHaveBeenCalledTimes(1);
  });

  it('should show auth subtitle (landing.shareSubtitle) when authenticated', () => {
    // GIVEN
    mockIsAuthenticated = true;

    // WHEN
    render(<LandingShareBanner onShareClick={onShareClick} />);

    // THEN
    expect(screen.getByTestId('banner-subtitle')).toHaveTextContent('landing.shareSubtitle');
  });

  it('should show guest subtitle (landing.shareSubtitleGuest) when not authenticated', () => {
    // GIVEN
    mockIsAuthenticated = false;

    // WHEN
    render(<LandingShareBanner onShareClick={onShareClick} />);

    // THEN
    expect(screen.getByTestId('banner-subtitle')).toHaveTextContent('landing.shareSubtitleGuest');
  });
});
```

### Step 2: Run tests to confirm they fail

```bash
cd fe-next && npx jest --testPathPattern="components/landing/__tests__/LandingShareBanner" --no-coverage
```

Expected: FAIL — `Cannot find module '../LandingShareBanner'`

### Step 3: Implement the component

Create `fe-next/components/landing/LandingShareBanner.tsx`:

```tsx
'use client';

import React from 'react';
import { m } from 'framer-motion';
import { Gift, Share2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface LandingShareBannerProps {
  onShareClick: () => void;
}

export function LandingShareBanner({ onShareClick }: LandingShareBannerProps) {
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();

  return (
    <m.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.3 }}
    >
      <button
        onClick={onShareClick}
        className={cn(
          'w-full flex items-center gap-3 p-3 sm:p-4',
          'bg-gradient-to-r from-neo-pink/90 to-purple-600/90',
          'border-3 border-neo-black rounded-neo shadow-hard',
          'hover:shadow-hard-lg active:shadow-none',
          'transition-shadow duration-150',
          'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-lime focus-visible:ring-offset-2',
          'group text-start'
        )}
        aria-label={t('landing.shareTitle') || 'Invite Friends, Earn XP'}
      >
        {/* Icon */}
        <div className="p-2 bg-white/20 rounded-neo border border-white/30 shrink-0">
          <Gift className="w-5 h-5 text-white" aria-hidden="true" />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <div className="font-black text-white text-sm sm:text-base uppercase leading-tight">
            {t('landing.shareTitle') || 'Invite Friends, Earn XP'}
          </div>
          <div data-testid="banner-subtitle" className="text-xs text-white/80 font-medium mt-0.5">
            {isAuthenticated
              ? (t('landing.shareSubtitle') || '100 XP per friend who joins')
              : (t('landing.shareSubtitleGuest') || 'Play with friends!')}
          </div>
        </div>

        {/* CTA chip */}
        <div
          className={cn(
            'flex items-center gap-1.5 shrink-0',
            'bg-white/20 group-hover:bg-white/30',
            'px-3 py-1.5 rounded-neo border border-white/30',
            'transition-colors'
          )}
          aria-hidden="true"
        >
          <Share2 className="w-4 h-4 text-white" />
          <span className="text-white text-sm font-bold hidden sm:inline">
            {t('landing.shareButton') || 'Share'}
          </span>
        </div>
      </button>
    </m.div>
  );
}
```

### Step 4: Run tests to confirm they pass

```bash
cd fe-next && npx jest --testPathPattern="components/landing/__tests__/LandingShareBanner" --no-coverage
```

Expected: PASS — all 5 tests green

### Step 5: Commit

```bash
cd fe-next && git add components/landing/LandingShareBanner.tsx components/landing/__tests__/LandingShareBanner.test.tsx
git commit -m "feat(landing): add LandingShareBanner component with auth/guest subtitles"
```

---

## Task 4: Wire into `LandingView.tsx`

**Files:**
- Modify: `fe-next/components/landing/LandingView.tsx`

No new test file needed — existing `LandingView.loading.test.tsx` catches regressions. Add mock for `LandingShareBanner` and `ShareReferralModal` in step 3 where needed.

### Step 1: Add imports at top of `LandingView.tsx`

At line ~8-26 (after existing imports), add:

```tsx
import dynamic from 'next/dynamic';
import { LandingShareBanner } from './LandingShareBanner';

// Lazy-load the modal — not needed until user clicks banner
const ShareReferralModal = dynamic(
  () => import('./ShareReferralModal').then((m) => m.ShareReferralModal),
  { ssr: false }
);
```

> **Note:** `dynamic` is already imported on line 6. Just add the `LandingShareBanner` import and the `ShareReferralModal` dynamic import (it can reuse the existing `dynamic` call pattern).

### Step 2: Add `showShareModal` state — remove `showReferralCallout` state

Find this block (around line 128–129):

```tsx
// Referral callout visibility (shown when tutorial callout is hidden)
const [showReferralCallout, setShowReferralCallout] = useState(false);
```

**Replace with:**

```tsx
// Share modal state
const [showShareModal, setShowShareModal] = useState(false);
```

### Step 3: Remove the `showReferralCallout` useEffect (around lines 157–168)

Find and delete this entire useEffect:

```tsx
// Show referral callout for returning users who haven't dismissed it
useEffect(() => {
  if (typeof window === 'undefined') return;
  // Only show referral callout to returning users (not first-time)
  const hasDismissedReferral = localStorage.getItem('referral_callout_dismissed') === 'true';
  const hasCompletedOnboardingCheck = hasCompletedOnboarding();
  // Show if: not first-time user, hasn't dismissed, and isn't currently seeing tutorial callout
  if (hasCompletedOnboardingCheck && !hasDismissedReferral && !showTutorialCallout) {
    setShowReferralCallout(true);
  }
}, [showTutorialCallout]);
```

Also delete `handleDismissReferral` function (around lines 180–185):

```tsx
// Dismiss referral callout and persist to localStorage
const handleDismissReferral = (e: React.MouseEvent) => {
  e.stopPropagation();
  localStorage.setItem('referral_callout_dismissed', 'true');
  setShowReferralCallout(false);
};
```

### Step 4: Add `ShareReferralModal` after `AuthModal` in the JSX (around line 234)

Find:

```tsx
{/* Auth Modal - for locked features */}
<AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
```

Add after it:

```tsx
{/* Share Referral Modal */}
<ShareReferralModal isOpen={showShareModal} onClose={() => setShowShareModal(false)} />
```

### Step 5: Add `LandingShareBanner` in the desktop grid (after Solo card, ~line 534)

Find:

```tsx
<ModeCard
  title={t('landing.singlePlayer') || 'Single Player'}
  ...
/>
```

After the closing `/>` of the Solo ModeCard (before the `{isAdmin && ...}` Adventure block), add:

```tsx
{/* Share banner — full-width below mode cards */}
<div className="col-span-1 sm:col-span-2">
  <LandingShareBanner onShareClick={() => setShowShareModal(true)} />
</div>
```

### Step 6: Add `LandingShareBanner` in the mobile/landscape grid (after the 2-col grid, ~line 469)

Find the closing of the 2-col grid div (after the admin blocks, before `</div>` that closes the landscape column):

```tsx
          </div>
          </div>
        ) : (
```

Just before `</div></div>` (the close of the flex column), after the 2-col grid closing tag, add:

```tsx
{/* Share banner — below game mode cards on mobile/landscape */}
<div className="w-full mt-2">
  <LandingShareBanner onShareClick={() => setShowShareModal(true)} />
</div>
```

### Step 7: Remove the referral callout JSX from the FAB section (around lines 623–665)

Find and delete the entire `AnimatePresence` block for the referral callout (it's the second `AnimatePresence` block after the tutorial callout, containing the `showReferralCallout` condition):

```tsx
{/* Referral callout for returning users */}
<AnimatePresence>
  {showReferralCallout && !showTutorialCallout && (
    <m.div
      ...
    >
      <Link
        href={`/${language}/profile?tab=collection`}
        ...
      >
        <Gift className="w-4 h-4 text-neo-lime" />
        <span ...>
          {t('referral.teaser.title') || 'Invite Friends, Earn XP'}
        </span>
        <button
          onClick={handleDismissReferral}
          ...
        >
          <X className="w-3.5 h-3.5 text-white/70" />
        </button>
      </Link>
      {/* Arrow ... */}
      <m.div ...>
        <div ... />
      </m.div>
    </m.div>
  )}
</AnimatePresence>
```

Also remove unused imports if `Gift`, `X` are no longer used elsewhere in LandingView. **Check first** — `Gift` is imported on line 8 (`import { ..., Gift, X, ... }`). After removing the callout, if neither is used elsewhere, remove from import line.

### Step 8: Update existing LandingView tests to mock new components

Open `fe-next/components/landing/__tests__/LandingView.loading.test.tsx`.

Add mocks for the new components (after the existing `jest.mock('../ModeCard', ...)` block):

```tsx
jest.mock('../LandingShareBanner', () => ({
  LandingShareBanner: ({ onShareClick }: { onShareClick: () => void }) => (
    <button data-testid="landing-share-banner" onClick={onShareClick}>Share</button>
  ),
}));
```

`ShareReferralModal` is dynamically imported, already mocked by the `next/dynamic` mock at line 79.

### Step 9: Run all landing tests to confirm no regressions

```bash
cd fe-next && npx jest --testPathPattern="components/landing" --no-coverage
```

Expected: All tests PASS (no regressions)

### Step 10: Run lint

```bash
cd fe-next && npm run lint 2>&1 | head -30
```

Fix any lint errors before committing.

### Step 11: Commit

```bash
cd fe-next && git add components/landing/LandingView.tsx components/landing/__tests__/LandingView.loading.test.tsx
git commit -m "feat(landing): wire LandingShareBanner + ShareReferralModal into LandingView, remove old referral callout"
```

---

## Task 5: Add translations (all 5 languages)

**Files:**
- Modify: `fe-next/translations/en.js`
- Modify: `fe-next/translations/he.js`
- Modify: `fe-next/translations/sv.js`
- Modify: `fe-next/translations/ja.js`
- Modify: `fe-next/translations/es.js`

For each file, find the `"landing"` object and add 7 new keys after `"personalBest"`.

### Step 1: English (`translations/en.js`)

Find:
```js
    "personalBest": "personal best"
```
Replace with:
```js
    "personalBest": "personal best",
    "shareTitle": "Invite Friends, Earn XP",
    "shareSubtitle": "100 XP per friend who joins",
    "shareSubtitleGuest": "Play with friends!",
    "shareButton": "Share",
    "shareModalTitle": "Invite Friends & Earn XP",
    "shareXpReward": "You earn +100 XP when they join!",
    "shareGuestNudge": "Sign in to get your personal link & earn XP"
```

### Step 2: Hebrew (`translations/he.js`)

Find the `"landing"` object's last key in he.js, add:
```js
    "shareTitle": "הזמן חברים, קבל XP",
    "shareSubtitle": "100 XP לכל חבר שמצטרף",
    "shareSubtitleGuest": "שחק עם חברים!",
    "shareButton": "שתף",
    "shareModalTitle": "הזמן חברים וקבל XP",
    "shareXpReward": "תקבל +100 XP כשהם יצטרפו!",
    "shareGuestNudge": "התחבר כדי לקבל קישור אישי ולהרוויח XP"
```

### Step 3: Swedish (`translations/sv.js`)

Find the `"landing"` last key, add:
```js
    "shareTitle": "Bjud in vänner, tjäna XP",
    "shareSubtitle": "100 XP per vän som går med",
    "shareSubtitleGuest": "Spela med vänner!",
    "shareButton": "Dela",
    "shareModalTitle": "Bjud in vänner & tjäna XP",
    "shareXpReward": "Du tjänar +100 XP när de går med!",
    "shareGuestNudge": "Logga in för din personliga länk & tjäna XP"
```

### Step 4: Japanese (`translations/ja.js`)

Find the `"landing"` last key, add:
```js
    "shareTitle": "友達を招待してXPゲット",
    "shareSubtitle": "参加した友達1人につき100XP",
    "shareSubtitleGuest": "友達と一緒に遊ぼう！",
    "shareButton": "シェア",
    "shareModalTitle": "友達を招待してXPを稼ごう",
    "shareXpReward": "友達が参加すると+100 XP獲得！",
    "shareGuestNudge": "サインインして個人リンクを取得してXPを獲得"
```

### Step 5: Spanish (`translations/es.js`)

Find the `"landing"` last key, add:
```js
    "shareTitle": "Invita amigos, gana XP",
    "shareSubtitle": "100 XP por cada amigo que se une",
    "shareSubtitleGuest": "¡Juega con amigos!",
    "shareButton": "Compartir",
    "shareModalTitle": "Invita amigos y gana XP",
    "shareXpReward": "¡Ganas +100 XP cuando se unen!",
    "shareGuestNudge": "Inicia sesión para tu enlace personal y gana XP"
```

> **Tip:** Each translation file is a JS file with `const en = { ... }` — find the `"landing"` section by searching for `"landing":` and navigate to its closing `}` to find `"personalBest"` (or whatever the last key is in that language). Add the 7 new keys before the closing `}`.

### Step 6: Run a quick sanity check

```bash
cd fe-next && node -e "const t = require('./translations/en.js'); console.log(t.landing.shareTitle)"
```

Expected output: `Invite Friends, Earn XP`

### Step 7: Commit

```bash
cd fe-next && git add translations/en.js translations/he.js translations/sv.js translations/ja.js translations/es.js
git commit -m "i18n(landing): add share button translations in all 5 languages"
```

---

## Task 6: Final verification

### Step 1: Run full frontend test suite

```bash
cd fe-next && npm run test:frontend 2>&1 | tail -20
```

Expected: All tests pass. If any fail, investigate before committing.

### Step 2: Run lint

```bash
cd fe-next && npm run lint 2>&1 | head -30
```

Expected: No errors.

### Step 3: Run build

```bash
cd fe-next && npm run build 2>&1 | tail -30
```

Expected: Build succeeds with no errors.

### Step 4: Manual smoke test

Start dev server and verify:
```bash
cd fe-next && npm run dev
```

- [ ] Open `http://localhost:3000` — share banner visible below mode cards
- [ ] Click banner — modal opens
- [ ] Guest: see nudge message, share buttons work
- [ ] Sign in — banner now shows "100 XP per friend who joins"
- [ ] Click banner — modal shows referral code + XP reward
- [ ] Copy button shows "Copied!" for 2 seconds
- [ ] WhatsApp button opens wa.me URL
- [ ] Telegram button opens t.me URL
- [ ] Old referral callout FAB bubble no longer appears
- [ ] Test with `?locale=he` — banner and modal render RTL correctly

### Step 5: Final commit

```bash
cd fe-next && git add -A
git commit -m "chore: verify landing share button feature complete"
```

---

## Summary

| Task | Files | Tests |
|------|-------|-------|
| 1 | `useReferralShare.ts` | 9 unit tests |
| 2 | `ShareReferralModal.tsx` | 14 component tests |
| 3 | `LandingShareBanner.tsx` | 5 component tests |
| 4 | `LandingView.tsx` (wiring) | existing test suite |
| 5 | 5 translation files | — |
| 6 | verification | full suite |
