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
    const template = t('ugc.rewards.boardPlayed');
    const message = template.includes('{{coins}}')
      ? template.replace('{{coins}}', String(coins))
      : `${template} +${coins}`;
    toast.success(message, { duration: 4000, icon: '🎮' });
  };

  /**
   * Called when a creator's board receives a high rating.
   */
  const notifyBoardRated = (coins: number): void => {
    const template = t('ugc.rewards.boardRated');
    const message = template.includes('{{coins}}')
      ? template.replace('{{coins}}', String(coins))
      : `${template} +${coins}`;
    toast.success(message, { duration: 3000, icon: '⭐' });
  };

  /**
   * Called when a creator's board hits a play-count milestone.
   */
  const notifyMilestone = (count: number, coins: number): void => {
    const template = t('ugc.rewards.milestone');
    const message = template.includes('{{count}}')
      ? template.replace('{{count}}', String(count)).replace('{{coins}}', String(coins))
      : `${template} ${count} +${coins}`;
    toast.success(message, { duration: 5000, icon: '🎉' });
  };

  /**
   * Called when a player beats the creator's own high score on their board.
   */
  const notifyHighScoreBeat = (title: string): void => {
    const template = t('ugc.rewards.highScoreBeat');
    const message = template.includes('{{title}}')
      ? template.replace('{{title}}', title)
      : `${template} ${title}`;
    toast(message, { duration: 4000, icon: '🏆' });
  };

  return { notifyBoardPlayed, notifyBoardRated, notifyMilestone, notifyHighScoreBeat };
}
