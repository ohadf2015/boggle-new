/**
 * CutscenePlayer Tests
 *
 * Tests video playback component for cutscenes including:
 * - Video path construction based on type and locale
 * - Skip button timing behavior
 * - Callback invocation for complete/skip events
 * - iOS Safari compatibility (autoPlay, muted, playsInline)
 * - RTL support for skip button positioning
 */

import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { CutscenePlayer } from '../CutscenePlayer';

// Mock useLanguage hook
const mockUseLanguage = jest.fn();
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => mockUseLanguage(),
}));

// Mock HTMLVideoElement methods
const mockPlay = jest.fn().mockResolvedValue(undefined);
const mockPause = jest.fn();

beforeAll(() => {
  // Mock HTMLVideoElement prototype
  Object.defineProperty(HTMLVideoElement.prototype, 'play', {
    writable: true,
    value: mockPlay,
  });
  Object.defineProperty(HTMLVideoElement.prototype, 'pause', {
    writable: true,
    value: mockPause,
  });
});

describe('CutscenePlayer', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockUseLanguage.mockReturnValue({
      language: 'en',
      dir: 'ltr',
      t: (key: string) => key,
      setLanguage: jest.fn(),
    });
    mockPlay.mockClear();
    mockPause.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Video path construction', () => {
    it('constructs level-intro path with worldId and locale', () => {
      render(
        <CutscenePlayer
          type="level-intro"
          worldId="meadows"
          testMode
        />
      );

      expect(screen.getByTestId('video-path')).toHaveTextContent(
        '/videos/cutscenes/level-intro-meadows-en.mp4'
      );
    });

    it('constructs transition path with fromWorldId, toWorldId, and locale', () => {
      render(
        <CutscenePlayer
          type="transition"
          fromWorldId="meadows"
          toWorldId="springs"
          testMode
        />
      );

      expect(screen.getByTestId('video-path')).toHaveTextContent(
        '/videos/cutscenes/transition-meadows-springs-en.mp4'
      );
    });

    it('constructs tutorial path with locale', () => {
      render(
        <CutscenePlayer
          type="tutorial"
          testMode
        />
      );

      expect(screen.getByTestId('video-path')).toHaveTextContent(
        '/videos/cutscenes/tutorial-en.mp4'
      );
    });

    it('uses Hebrew locale from LanguageContext', () => {
      mockUseLanguage.mockReturnValue({
        language: 'he',
        dir: 'rtl',
        t: (key: string) => key,
        setLanguage: jest.fn(),
      });

      render(
        <CutscenePlayer
          type="level-intro"
          worldId="caverns"
          testMode
        />
      );

      expect(screen.getByTestId('video-path')).toHaveTextContent(
        '/videos/cutscenes/level-intro-caverns-he.mp4'
      );
    });

    it('uses Swedish locale from LanguageContext', () => {
      mockUseLanguage.mockReturnValue({
        language: 'sv',
        dir: 'ltr',
        t: (key: string) => key,
        setLanguage: jest.fn(),
      });

      render(
        <CutscenePlayer
          type="tutorial"
          testMode
        />
      );

      expect(screen.getByTestId('video-path')).toHaveTextContent(
        '/videos/cutscenes/tutorial-sv.mp4'
      );
    });
  });

  describe('Skip button timing', () => {
    it('hides skip button initially for level-intro (default 2000ms delay)', () => {
      render(
        <CutscenePlayer
          type="level-intro"
          worldId="meadows"
        />
      );

      expect(screen.queryByRole('button', { name: /skip/i })).not.toBeInTheDocument();
    });

    it('shows skip button after delay elapses for level-intro', () => {
      render(
        <CutscenePlayer
          type="level-intro"
          worldId="meadows"
        />
      );

      // Fast forward past the default delay
      act(() => {
        jest.advanceTimersByTime(2100);
      });

      expect(screen.getByRole('button', { name: /skip/i })).toBeInTheDocument();
    });

    it('shows skip button immediately for tutorial (allowSkipAfterMs: 0)', () => {
      render(
        <CutscenePlayer
          type="tutorial"
          allowSkipAfterMs={0}
        />
      );

      expect(screen.getByRole('button', { name: /skip/i })).toBeInTheDocument();
    });

    it('respects custom allowSkipAfterMs value', () => {
      render(
        <CutscenePlayer
          type="level-intro"
          worldId="meadows"
          allowSkipAfterMs={5000}
        />
      );

      // After 3 seconds - still hidden
      act(() => {
        jest.advanceTimersByTime(3000);
      });
      expect(screen.queryByRole('button', { name: /skip/i })).not.toBeInTheDocument();

      // After 5.1 seconds - visible
      act(() => {
        jest.advanceTimersByTime(2100);
      });
      expect(screen.getByRole('button', { name: /skip/i })).toBeInTheDocument();
    });
  });

  describe('Callbacks', () => {
    it('calls onComplete when video ends', () => {
      const onComplete = jest.fn();
      render(
        <CutscenePlayer
          type="level-intro"
          worldId="meadows"
          onComplete={onComplete}
        />
      );

      const video = screen.getByTestId('cutscene-video');
      fireEvent.ended(video);

      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('calls onSkip when skip button clicked', () => {
      const onSkip = jest.fn();
      render(
        <CutscenePlayer
          type="tutorial"
          allowSkipAfterMs={0}
          onSkip={onSkip}
        />
      );

      const skipButton = screen.getByRole('button', { name: /skip/i });
      fireEvent.click(skipButton);

      expect(onSkip).toHaveBeenCalledTimes(1);
    });

    it('does NOT call onComplete if already skipped', () => {
      const onComplete = jest.fn();
      const onSkip = jest.fn();
      render(
        <CutscenePlayer
          type="tutorial"
          allowSkipAfterMs={0}
          onComplete={onComplete}
          onSkip={onSkip}
        />
      );

      // Skip the video
      const skipButton = screen.getByRole('button', { name: /skip/i });
      fireEvent.click(skipButton);

      // Then video ends
      const video = screen.getByTestId('cutscene-video');
      fireEvent.ended(video);

      expect(onSkip).toHaveBeenCalledTimes(1);
      expect(onComplete).not.toHaveBeenCalled();
    });

    it('calls onComplete with no onSkip handler if skipped', () => {
      const onComplete = jest.fn();
      render(
        <CutscenePlayer
          type="tutorial"
          allowSkipAfterMs={0}
          onComplete={onComplete}
        />
      );

      // Skip - should not crash
      const skipButton = screen.getByRole('button', { name: /skip/i });
      fireEvent.click(skipButton);

      // Verify onComplete not called (it was skipped, no onSkip to call)
      expect(onComplete).not.toHaveBeenCalled();
    });
  });

  describe('iOS Safari compatibility', () => {
    it('video element has autoPlay attribute', () => {
      render(
        <CutscenePlayer
          type="level-intro"
          worldId="meadows"
        />
      );

      const video = screen.getByTestId('cutscene-video');
      expect(video).toHaveAttribute('autoplay');
    });

    it('video element has muted attribute', () => {
      render(
        <CutscenePlayer
          type="level-intro"
          worldId="meadows"
        />
      );

      const video = screen.getByTestId('cutscene-video') as HTMLVideoElement;
      // React sets muted as a DOM property, not an HTML attribute
      expect(video.muted).toBe(true);
    });

    it('video element has playsInline attribute', () => {
      render(
        <CutscenePlayer
          type="level-intro"
          worldId="meadows"
        />
      );

      const video = screen.getByTestId('cutscene-video');
      expect(video).toHaveAttribute('playsinline');
    });
  });

  describe('RTL support', () => {
    it('positions skip button on right side in LTR mode', () => {
      mockUseLanguage.mockReturnValue({
        language: 'en',
        dir: 'ltr',
        t: (key: string) => key,
        setLanguage: jest.fn(),
      });

      render(
        <CutscenePlayer
          type="tutorial"
          allowSkipAfterMs={0}
        />
      );

      const skipButton = screen.getByRole('button', { name: /skip/i });
      expect(skipButton).toHaveClass('right-4');
      expect(skipButton).not.toHaveClass('left-4');
    });

    it('positions skip button on left side in RTL mode', () => {
      mockUseLanguage.mockReturnValue({
        language: 'he',
        dir: 'rtl',
        t: (key: string) => key,
        setLanguage: jest.fn(),
      });

      render(
        <CutscenePlayer
          type="tutorial"
          allowSkipAfterMs={0}
        />
      );

      const skipButton = screen.getByRole('button', { name: /skip/i });
      expect(skipButton).toHaveClass('left-4');
      expect(skipButton).not.toHaveClass('right-4');
    });
  });

  describe('Test mode', () => {
    it('renders video path instead of actual video in testMode', () => {
      render(
        <CutscenePlayer
          type="level-intro"
          worldId="springs"
          testMode
        />
      );

      expect(screen.getByTestId('video-path')).toBeInTheDocument();
      expect(screen.queryByTestId('cutscene-video')).not.toBeInTheDocument();
    });

    it('still shows skip button in testMode after delay', () => {
      render(
        <CutscenePlayer
          type="level-intro"
          worldId="springs"
          testMode
          allowSkipAfterMs={0}
        />
      );

      expect(screen.getByRole('button', { name: /skip/i })).toBeInTheDocument();
    });
  });

  describe('Reduced motion preference', () => {
    beforeAll(() => {
      // Mock matchMedia for prefers-reduced-motion
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation((query: string) => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });
    });

    it('calls onComplete immediately when user prefers reduced motion', () => {
      const onComplete = jest.fn();
      render(
        <CutscenePlayer
          type="level-intro"
          worldId="meadows"
          onComplete={onComplete}
        />
      );

      // With reduced motion, component should auto-complete
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });
});
