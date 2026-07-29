/**
 * useCreatorNotifications
 *
 * Shows toast notifications for creator UGC reward events.
 * Uses react-hot-toast consistent with the rest of the app.
 */

import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';

export function useCreatorNotifications() {
  const { t } = useLanguage();

  /**
   * Called when another player plays one of the creator's boards.
   */
  const notifyBoardPlayed = (_playerName: string, _boardTitle: string, coins: number): void => {
    toast.success(t('ugc.rewards.boardPlayed', { coins }), { duration: 4000, icon: '🎮' });
  };

  /**
   * Called when a creator's board receives a high rating.
   */
  const notifyBoardRated = (coins: number): void => {
    toast.success(t('ugc.rewards.boardRated', { coins }), { duration: 3000, icon: '⭐' });
  };

  /**
   * Called when a creator's board hits a play-count milestone.
   */
  const notifyMilestone = (count: number, coins: number): void => {
    toast.success(t('ugc.rewards.milestone', { count, coins }), { duration: 5000, icon: '🎉' });
  };

  /**
   * Called when a player beats the creator's own high score on their board.
   */
  const notifyHighScoreBeat = (title: string): void => {
    toast(t('ugc.rewards.highScoreBeat', { title }), { duration: 4000, icon: '🏆' });
  };

  return { notifyBoardPlayed, notifyBoardRated, notifyMilestone, notifyHighScoreBeat };
}
