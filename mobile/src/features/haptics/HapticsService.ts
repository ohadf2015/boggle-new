// Haptic feedback service for native mobile experience
import * as Haptics from 'expo-haptics';

export const HapticsService = {
  // Letter selection - light tap
  letterSelect: async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  },

  // Word submission - medium impact
  wordSubmit: async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  },

  // Valid word accepted - success notification
  wordAccepted: async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  },

  // Invalid word - error notification
  wordRejected: async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  },

  // Word already found - warning notification
  wordDuplicate: async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  },

  // Combo progression - intensity scales with level
  combo: async (level: number) => {
    const intensity = Math.min(level, 10);
    if (intensity <= 3) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else if (intensity <= 6) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      // Double tap for max combo
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 50);
    }
  },

  // Achievement unlock - celebratory pattern
  achievement: async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await new Promise(resolve => setTimeout(resolve, 100));
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  },

  // Timer warning (last 20 seconds)
  timerWarning: async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  },

  // Game start
  gameStart: async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  },

  // Game end
  gameEnd: async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await new Promise(resolve => setTimeout(resolve, 100));
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  },

  // Button press - selection feedback
  buttonPress: async () => {
    await Haptics.selectionAsync();
  },
};
