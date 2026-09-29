/**
 * App-owned context hooks must degrade gracefully in production when their
 * provider is missing — the established pattern (useLanguage, useAuth,
 * useTheme, useSoundEffects) is: throw in development to catch a missing
 * provider early, return a no-op fallback in production so a provider-less
 * render path never crashes a page.
 *
 * Motivation (Sentry 150021158 / 150021327 / 150021157, 2026-09-28): #1175
 * briefly rendered heavy-game routes with NO provider stack until after
 * first paint, and every hard-throwing hook crashed cold production loads:
 * useMusic on /multiplayer, react-query on /daily, with useSocket /
 * useAccessibility / useHapticsConfig / useAdMobContext queued right behind
 * on the same path. #1176 reverted the gate; these fallbacks harden against
 * any future provider-less render path (dynamic-import + Suspense edge cases
 * on low-end devices caused JAVASCRIPT-NEXTJS-FQ the same way).
 *
 * Vitest runs with NODE_ENV=test (≠ development) → the production fallback
 * path is what these assertions exercise.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useMusic } from '@/contexts/MusicContext';
import { useSocket } from '@/utils/SocketContext';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { useHapticsConfig } from '@/contexts/HapticsContext';
import { useAdMobContext } from '@/contexts/AdMobContext';
import { useNavigation } from '@/contexts/NavigationContext';

function MusicProbe() {
  const music = useMusic();
  return (
    <div>
      <span data-testid="muted">{String(music.isMuted)}</span>
      <span data-testid="track">{String(music.currentTrack)}</span>
      <span data-testid="fn">{String(typeof music.playTrack === 'function')}</span>
    </div>
  );
}

function SocketProbe() {
  const sock = useSocket();
  return (
    <div>
      <span data-testid="connected">{String(sock.isConnected)}</span>
      <span data-testid="socket">{String(sock.socket)}</span>
    </div>
  );
}

function AccessibilityProbe() {
  const a11y = useAccessibility();
  return <span data-testid="reduce">{String(a11y.shouldReduceMotion)}</span>;
}

function HapticsProbe() {
  const haptics = useHapticsConfig();
  return <span data-testid="haptics">{String(haptics.enabled)}</span>;
}

function AdMobProbe() {
  const admob = useAdMobContext();
  return <span data-testid="noads">{String(admob.hasNoAds())}</span>;
}

function NavigationProbe() {
  const nav = useNavigation();
  return (
    <div>
      <span data-testid="ingame">{String(nav.isInGame)}</span>
      <span data-testid="tab">{nav.activeTab}</span>
    </div>
  );
}

describe('graceful hook fallbacks (no provider mounted)', () => {
  it('useMusic returns the no-op stub instead of throwing', () => {
    render(<MusicProbe />);
    expect(screen.getByTestId('muted').textContent).toBe('false');
    expect(screen.getByTestId('track').textContent).toBe('null');
    expect(screen.getByTestId('fn').textContent).toBe('true');
  });

  it('useSocket returns a disconnected stub instead of throwing', () => {
    render(<SocketProbe />);
    expect(screen.getByTestId('connected').textContent).toBe('false');
    expect(screen.getByTestId('socket').textContent).toBe('null');
  });

  it('useAccessibility returns default settings instead of throwing', () => {
    render(<AccessibilityProbe />);
    expect(screen.getByTestId('reduce').textContent).toMatch(/true|false/);
  });

  it('useHapticsConfig returns a default instead of throwing', () => {
    render(<HapticsProbe />);
    expect(screen.getByTestId('haptics').textContent).toMatch(/true|false/);
  });

  it('useAdMobContext returns no-op ad controls instead of throwing', () => {
    render(<AdMobProbe />);
    expect(screen.getByTestId('noads').textContent).toMatch(/true|false/);
  });

  it('useNavigation returns a hidden-nav fallback instead of throwing', () => {
    render(<NavigationProbe />);
    expect(screen.getByTestId('ingame').textContent).toBe('false');
    expect(screen.getByTestId('tab').textContent).toBe('home');
  });
});
