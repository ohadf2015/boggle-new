import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getGuestFingerprint,
  getGuestDailyPlayer,
  type DailyChallengeResult,
  type GuestDailyPlayer,
} from '@/utils/dailyChallenge';

interface SubmissionState {
  guestFingerprint: string | null;
  guestPlayer: GuestDailyPlayer | null;
  leaderboardKey: number;
}

export function useDailyResultSubmission(
  result: DailyChallengeResult,
  longestWord: string,
  isNewCompletion: boolean,
): SubmissionState {
  const [guestFingerprint, setGuestFingerprint] = useState<string | null>(null);
  const [guestPlayer, setGuestPlayer] = useState<GuestDailyPlayer | null>(null);
  const [leaderboardKey, setLeaderboardKey] = useState(0);
  const { profile, isAuthenticated } = useAuth();

  // Get guest fingerprint and player info on mount
  useEffect(() => {
    getGuestFingerprint().then(setGuestFingerprint);
    if (!isAuthenticated) {
      getGuestDailyPlayer().then(setGuestPlayer);
    }
  }, [isAuthenticated]);

  // Submit result to backend when completing a new challenge
  useEffect(() => {
    const canSubmit = isNewCompletion && result && (
      isAuthenticated
        ? !!profile
        : !!guestFingerprint
    );

    if (!canSubmit) return;

    const submitResult = async () => {
      try {
        const displayName = isAuthenticated && profile
          ? profile.display_name || profile.username
          : guestPlayer?.displayName || 'Guest Player';
        const avatarEmoji = isAuthenticated && profile
          ? profile.avatar_emoji
          : guestPlayer?.avatarEmoji || '🎯';
        const avatarColor = isAuthenticated && profile
          ? profile.avatar_color
          : guestPlayer?.avatarColor || '#6366f1';
        const avatarImage = isAuthenticated && profile
          ? profile.avatar_image
          : undefined;
        let countryCode: string | null = null;
        try {
          const geoResponse = await fetch('/api/geolocation');
          if (geoResponse.ok) {
            const geoData = await geoResponse.json();
            countryCode = geoData.countryCode || null;
          }
        } catch (geoError) {
          console.warn('Failed to fetch country code:', geoError);
        }

        const response = await fetch('/api/daily-challenge/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            puzzleDate: result.puzzleDate,
            puzzleNumber: result.puzzleNumber,
            language: result.language,
            playerId: isAuthenticated && profile ? profile.id : null,
            guestFingerprint: !isAuthenticated ? guestFingerprint : null,
            displayName,
            avatarEmoji,
            avatarColor,
            avatarImage,
            countryCode,
            score: Math.round(result.score),
            wordCount: result.wordCount,
            wordsByLength: result.wordsByLength,
            timeSeconds: result.timeSeconds,
            longestWord,
          }),
        });
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Failed to submit daily result:', errorText);
          console.error('Submission details:', {
            puzzleDate: result.puzzleDate,
            language: result.language,
            isAuthenticated,
            hasProfile: !!profile,
            hasGuestFingerprint: !!guestFingerprint,
            displayName,
          });
          return;
        }

        const responseData = await response.json();
        if (process.env.NODE_ENV === 'development') {
          console.log('Daily challenge submitted successfully:', responseData);
        }

        setLeaderboardKey(prev => prev + 1);
      } catch (err) {
        console.error('Failed to submit daily result:', err);
      }
    };
    submitResult();
  }, [isNewCompletion, result, guestFingerprint, longestWord, isAuthenticated, profile, guestPlayer]);

  return { guestFingerprint, guestPlayer, leaderboardKey };
}
