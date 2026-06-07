import { render, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import NativePGSInitializer from '../NativePGSInitializer';
import * as platform from '@/utils/platform';
import * as pgs from '@/utils/nativePGS';

vi.mock('@/utils/platform', () => ({
  isAndroid: vi.fn(),
}));

vi.mock('@/utils/nativePGS', () => ({
  initializePlayGames: vi.fn(),
}));

vi.mock('@/utils/logger', () => ({
  __esModule: true,
  default: { log: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

describe('NativePGSInitializer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (pgs.initializePlayGames as jest.Mock).mockResolvedValue(true);
  });

  it('warms the bridge on Android', async () => {
    // GIVEN: Android
    (platform.isAndroid as jest.Mock).mockReturnValue(true);
    // WHEN: mounted
    const { container } = render(<NativePGSInitializer />);
    // THEN: initializes the bridge, renders nothing
    await waitFor(() => expect(pgs.initializePlayGames).toHaveBeenCalledTimes(1));
    expect(container.firstChild).toBeNull();
  });

  it('is a no-op off Android (web/iOS)', async () => {
    // GIVEN: not Android
    (platform.isAndroid as jest.Mock).mockReturnValue(false);
    // WHEN: mounted
    render(<NativePGSInitializer />);
    // THEN: never touches the bridge
    await Promise.resolve();
    expect(pgs.initializePlayGames).not.toHaveBeenCalled();
  });
});
