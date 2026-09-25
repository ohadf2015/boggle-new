import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { Suspense } from 'react';

const mockTrackGrowthEvent = vi.fn();

vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: (event: string, data?: any) => mockTrackGrowthEvent(event, data),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguageSafe: () => ({ t: (k: string) => k, language: 'en' }),
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

vi.mock('@/components/auth/AuthModal', () => ({
  default: ({ isOpen, onClose }: any) => (
    isOpen ? (
      <div data-testid="auth-modal">
        <button data-testid="auth-modal-close" onClick={onClose}>Close</button>
      </div>
    ) : null
  ),
}));

import { AdventureGuestGate } from '../AdventureGuestGate';

describe('AdventureGuestGate', () => {
  beforeEach(() => {
    mockTrackGrowthEvent.mockClear();
  });

  it('given a guest on the map surface, when it renders, then it shows the pitch, bullets, and sign-in button', () => {
    render(
      <Suspense fallback={null}>
        <AdventureGuestGate surface="map" />
      </Suspense>
    );

    expect(screen.getByText('adventurePlay.guest.pitch')).toBeTruthy();
    expect(screen.getByText('adventurePlay.guest.bullet1')).toBeTruthy();
    expect(screen.getByText('adventurePlay.guest.bullet2')).toBeTruthy();
    expect(screen.getByText('adventurePlay.guest.bullet3')).toBeTruthy();
    expect(screen.getByText('adventurePlay.guest.signIn')).toBeTruthy();
  });

  it('given the gate is rendered, when it mounts, then it fires gate_viewed with the surface', async () => {
    render(
      <Suspense fallback={null}>
        <AdventureGuestGate surface="map" />
      </Suspense>
    );

    await waitFor(() => {
      expect(mockTrackGrowthEvent).toHaveBeenCalledWith('adventure_guest_gate_viewed', {
        surface: 'map',
      });
    });
  });

  it('given the gate is rendered twice under StrictMode, when it mounts, then gate_viewed fires only once', () => {
    render(
      <Suspense fallback={null}>
        <React.StrictMode>
          <AdventureGuestGate surface="map" />
        </React.StrictMode>
      </Suspense>
    );

    // The effect guard should prevent double-fire even in StrictMode
    expect(mockTrackGrowthEvent).toHaveBeenCalledTimes(1);
  });

  it('given a guest clicks sign in, when they tap the button, then signin_clicked is tracked', async () => {
    const user = userEvent.setup();
    render(
      <Suspense fallback={null}>
        <AdventureGuestGate surface="achievements" />
      </Suspense>
    );

    const signInButton = screen.getByText('adventurePlay.guest.signIn');
    await user.click(signInButton);

    expect(mockTrackGrowthEvent).toHaveBeenCalledWith('adventure_guest_signin_clicked', {
      surface: 'achievements',
    });
  });

  it('given a guest on the map surface, when it renders, then there is a home link back to the homepage', () => {
    render(
      <Suspense fallback={null}>
        <AdventureGuestGate surface="map" />
      </Suspense>
    );

    const homeLinks = screen.getAllByRole('link', { name: /home/i });
    expect(homeLinks.length).toBeGreaterThan(0);
  });

  it('given the gate, when rendered, then the image has alt text', () => {
    render(
      <Suspense fallback={null}>
        <AdventureGuestGate surface="map" />
      </Suspense>
    );

    const img = screen.getByAltText(/adventure|roguelike/i);
    expect(img).toBeTruthy();
  });
});
