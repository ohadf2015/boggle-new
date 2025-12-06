/**
 * Test Utilities
 *
 * Custom render function that wraps components with providers
 * and other test helpers for React Testing Library.
 */

import React, { ReactElement, ReactNode } from 'react';
import { render, RenderOptions } from '@testing-library/react';

// ==========================================
// Mock Providers
// ==========================================

interface MockProviderProps {
  children: ReactNode;
}

// Mock Language Context
const MockLanguageProvider: React.FC<MockProviderProps> = ({ children }) => {
  return <>{children}</>;
};

// Mock Socket Context
const MockSocketProvider: React.FC<MockProviderProps> = ({ children }) => {
  return <>{children}</>;
};

// Mock Auth Context
const MockAuthProvider: React.FC<MockProviderProps> = ({ children }) => {
  return <>{children}</>;
};

// ==========================================
// All Providers Wrapper
// ==========================================

interface AllProvidersProps {
  children: ReactNode;
}

const AllProviders: React.FC<AllProvidersProps> = ({ children }) => {
  return (
    <MockAuthProvider>
      <MockSocketProvider>
        <MockLanguageProvider>
          {children}
        </MockLanguageProvider>
      </MockSocketProvider>
    </MockAuthProvider>
  );
};

// ==========================================
// Custom Render
// ==========================================

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  // Add custom options here if needed
}

/**
 * Custom render function that wraps component with all providers
 */
function customRender(
  ui: ReactElement,
  options?: CustomRenderOptions
) {
  return render(ui, { wrapper: AllProviders, ...options });
}

// ==========================================
// Test Helpers
// ==========================================

/**
 * Create a mock letter grid
 */
export function createMockGrid(size = 4): string[][] {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  return Array.from({ length: size }, () =>
    Array.from({ length: size }, () =>
      letters[Math.floor(Math.random() * letters.length)]
    )
  );
}

/**
 * Create a mock player
 */
export function createMockPlayer(overrides = {}) {
  return {
    username: 'TestPlayer',
    avatar: { emoji: '🎮', color: '#FF6B6B' },
    isHost: false,
    isBot: false,
    presence: 'active' as const,
    ...overrides,
  };
}

/**
 * Create a mock word detail
 */
export function createMockWordDetail(overrides = {}) {
  return {
    word: 'TEST',
    score: 3,
    autoValidated: true,
    validated: true,
    inDictionary: true,
    validationSource: 'dictionary' as const,
    isUnique: true,
    isDuplicate: false,
    ...overrides,
  };
}

/**
 * Create mock leaderboard entries
 */
export function createMockLeaderboard(count = 3) {
  return Array.from({ length: count }, (_, i) => ({
    username: `Player${i + 1}`,
    score: 100 - i * 20,
    avatar: { emoji: '🎮', color: `#${(i * 111111).toString(16).padStart(6, '0')}` },
    isHost: i === 0,
    wordsFound: 10 - i * 2,
  }));
}

/**
 * Create mock tournament data
 */
export function createMockTournament(overrides = {}) {
  return {
    id: 'test-tournament',
    name: 'Test Tournament',
    totalRounds: 3,
    currentRound: 1,
    status: 'in-progress' as const,
    ...overrides,
  };
}

/**
 * Create mock XP gained data
 */
export function createMockXpGained(overrides = {}) {
  return {
    totalXp: 150,
    breakdown: {
      gameCompletion: 50,
      scoreXp: 50,
      winBonus: 50,
      achievementXp: 0,
    },
    ...overrides,
  };
}

/**
 * Simulate typing in an input
 */
export async function typeInInput(
  input: HTMLElement,
  text: string,
  userEvent: typeof import('@testing-library/user-event').default
) {
  await userEvent.clear(input);
  await userEvent.type(input, text);
}

/**
 * Wait for loading to complete
 */
export function waitForLoadingToComplete() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

// ==========================================
// Re-export everything from testing-library
// ==========================================

export * from '@testing-library/react';
export { customRender as render };
