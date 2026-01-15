import React from 'react';
import { render, screen } from '@testing-library/react';
import MultiplayerLobby from '../MultiplayerLobby';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { ThemeProvider } from '@/utils/ThemeContext';

// Mock next/link
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

// Mock useMobileLandscape
jest.mock('@/hooks/useMobileLandscape', () => ({
  useMobileLandscape: () => false,
}));

// Test wrapper with all required providers
const AllProviders = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>
    <LanguageProvider>
      {children}
    </LanguageProvider>
  </ThemeProvider>
);

describe('MultiplayerLobby - Room List Max Width', () => {
  const mockProps = {
    handleJoin: jest.fn(),
    gameCode: 'TEST123',
    username: 'testuser',
    roomName: 'Test Room',
    hostUsername: 'testhost',
    setGameCode: jest.fn(),
    setUsername: jest.fn(),
    setRoomName: jest.fn(),
    setHostUsername: jest.fn(),
    error: '',
    activeRooms: [
      { gameCode: 'ROOM1', roomName: 'Room 1', playerCount: 2, language: 'en' as const, hostUsername: 'host1', gameState: 'waiting' as const, isRanked: false, createdAt: Date.now() },
      { gameCode: 'ROOM2', roomName: 'Room 2', playerCount: 3, language: 'en' as const, hostUsername: 'host2', gameState: 'waiting' as const, isRanked: false, createdAt: Date.now() },
    ],
    refreshRooms: jest.fn(),
    roomsLoading: false,
    isAuthenticated: false,
    displayName: '',
    isJoining: false,
    prefilledRoom: '',
    isAutoJoining: false,
    isProfileLoading: false,
  };

  it('should have max-width constraint on room list in desktop mode', () => {
    const { container } = render(
      <AllProviders>
        <MultiplayerLobby {...mockProps} />
      </AllProviders>
    );

    // Find the room list container (the motion.div wrapping RoomList)
    // It should have max-width classes applied
    const roomListContainer = container.querySelector('.lg\\:flex-1, [class*="lg:max-w"]');

    // The container should have a max-width constraint, not just flex-1
    // This test will fail initially because the current code uses lg:flex-1 lg:min-w-0
    // which takes full remaining width without constraint
    expect(roomListContainer?.className).toMatch(/lg:max-w-/);
  });

  it('should not take full width on large screens', () => {
    const { container } = render(
      <AllProviders>
        <MultiplayerLobby {...mockProps} />
      </AllProviders>
    );

    // The room list container should have a reasonable max-width
    // Not just flex-1 which makes it grow to fill all available space
    const roomListContainer = container.querySelector('.w-full.lg\\:flex-1');

    if (roomListContainer) {
      // Should have max-width class alongside or instead of flex-1
      const hasMaxWidth = roomListContainer.className.includes('max-w-') ||
                          roomListContainer.className.includes('lg:max-w-');
      expect(hasMaxWidth).toBe(true);
    }
  });

  it('should maintain full width on mobile', () => {
    const { container } = render(
      <AllProviders>
        <MultiplayerLobby {...mockProps} />
      </AllProviders>
    );

    // On mobile, it should still be w-full (no max-width on mobile)
    const roomListContainer = container.querySelector('[class*="w-full"]');
    expect(roomListContainer).toBeTruthy();
  });
});
