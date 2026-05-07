import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi, type MockedFunction } from 'vitest';
import { CrazyGamesRetentionCard } from '../CrazyGamesRetentionCard';
import * as cloudSave from '@/utils/crazygames/cloudSave';

vi.mock('@/utils/crazygames/cloudSave');
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));

const mockLoad = cloudSave.loadFromCloud as MockedFunction<typeof cloudSave.loadFromCloud>;
const mockSave = cloudSave.saveToCloud as MockedFunction<typeof cloudSave.saveToCloud>;

function makeCloudSave(retentionData?: { lastPlayedDate: string; cgStreak: number }) {
  return {
    version: 2,
    adventureProgress: { worldId: 0, levelId: 0, stars: 0, completedLevels: [] },
    educationProgress: { totalXp: 0, level: 1, streak: 0, achievements: [] },
    preferences: { musicVolume: 0.8, soundVolume: 0.8, language: 'en' },
    retentionData,
  } as cloudSave.SaveData;
}

function isoOffset(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

describe('CrazyGamesRetentionCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSave.mockResolvedValue(true);
  });

  it('renders nothing while cloud load is pending', () => {
    mockLoad.mockReturnValue(new Promise(() => {}));
    const { container } = render(<CrazyGamesRetentionCard />);
    expect(container).toBeEmptyDOMElement();
  });

  it('starts streak at 1 on first play (no previous save)', async () => {
    mockLoad.mockResolvedValue(null);
    render(<CrazyGamesRetentionCard />);
    await waitFor(() => expect(screen.getByTestId('cg-retention-card')).toBeInTheDocument());
    expect(screen.getByTestId('cg-retention-streak')).toHaveTextContent('1');
  });

  it('increments streak when last played yesterday', async () => {
    mockLoad.mockResolvedValue(makeCloudSave({ lastPlayedDate: isoOffset(-1), cgStreak: 3 }));
    render(<CrazyGamesRetentionCard />);
    await waitFor(() => expect(screen.getByTestId('cg-retention-card')).toBeInTheDocument());
    expect(screen.getByTestId('cg-retention-streak')).toHaveTextContent('4');
  });

  it('resets streak to 1 when last played more than a day ago', async () => {
    mockLoad.mockResolvedValue(makeCloudSave({ lastPlayedDate: isoOffset(-2), cgStreak: 5 }));
    render(<CrazyGamesRetentionCard />);
    await waitFor(() => expect(screen.getByTestId('cg-retention-card')).toBeInTheDocument());
    expect(screen.getByTestId('cg-retention-streak')).toHaveTextContent('1');
  });

  it('keeps current streak when already played today', async () => {
    mockLoad.mockResolvedValue(makeCloudSave({ lastPlayedDate: isoOffset(0), cgStreak: 7 }));
    render(<CrazyGamesRetentionCard />);
    await waitFor(() => expect(screen.getByTestId('cg-retention-card')).toBeInTheDocument());
    expect(screen.getByTestId('cg-retention-streak')).toHaveTextContent('7');
  });

  it('saves today date and new streak to cloud', async () => {
    mockLoad.mockResolvedValue(makeCloudSave({ lastPlayedDate: isoOffset(-1), cgStreak: 2 }));
    render(<CrazyGamesRetentionCard />);
    await waitFor(() => expect(mockSave).toHaveBeenCalled());
    expect(mockSave).toHaveBeenCalledWith(
      expect.objectContaining({
        retentionData: expect.objectContaining({
          lastPlayedDate: isoOffset(0),
          cgStreak: 3,
        }),
      })
    );
  });

  it('does not write to cloud when played today already (idempotent)', async () => {
    mockLoad.mockResolvedValue(makeCloudSave({ lastPlayedDate: isoOffset(0), cgStreak: 7 }));
    render(<CrazyGamesRetentionCard />);
    await waitFor(() => expect(screen.getByTestId('cg-retention-card')).toBeInTheDocument());
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('shows the comeback message translation key', async () => {
    mockLoad.mockResolvedValue(null);
    render(<CrazyGamesRetentionCard />);
    await waitFor(() => expect(screen.getByTestId('cg-retention-card')).toBeInTheDocument());
    expect(screen.getByTestId('cg-retention-message')).toBeInTheDocument();
  });
});
