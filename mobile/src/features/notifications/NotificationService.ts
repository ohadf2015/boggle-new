// Push notification service for game invites and alerts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

const PUSH_TOKEN_KEY = 'lexiclash_push_token';

// Configure notification handling
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface GameInviteNotification {
  type: 'game_invite';
  gameCode: string;
  hostName: string;
  roomName: string;
}

export interface GameStartNotification {
  type: 'game_start';
  gameCode: string;
  roomName: string;
}

export interface AchievementNotification {
  type: 'achievement';
  achievementName: string;
  achievementIcon: string;
}

export type NotificationData = GameInviteNotification | GameStartNotification | AchievementNotification;

class NotificationServiceClass {
  private pushToken: string | null = null;
  private notificationListener: Notifications.Subscription | null = null;
  private responseListener: Notifications.Subscription | null = null;

  async initialize(): Promise<string | null> {
    // Request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[Notifications] Permission not granted');
      return null;
    }

    // Get push token
    if (Device.isDevice) {
      try {
        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId: 'your-project-id', // Replace with your Expo project ID
        });
        this.pushToken = tokenData.data;
        await AsyncStorage.setItem(PUSH_TOKEN_KEY, this.pushToken);
        console.log('[Notifications] Push token:', this.pushToken);
      } catch (error) {
        console.error('[Notifications] Failed to get push token:', error);
      }
    } else {
      console.log('[Notifications] Must use physical device for push notifications');
    }

    // Configure Android channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('game-invites', {
        name: 'Game Invites',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#00FFFF',
        sound: 'default',
      });

      await Notifications.setNotificationChannelAsync('game-alerts', {
        name: 'Game Alerts',
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: 'default',
      });
    }

    // Set up listeners
    this.setupListeners();

    return this.pushToken;
  }

  private setupListeners(): void {
    // Listener for notifications received while app is foregrounded
    this.notificationListener = Notifications.addNotificationReceivedListener((notification) => {
      console.log('[Notifications] Received:', notification);
      // Handle foreground notification if needed
    });

    // Listener for notification interactions (user tapped notification)
    this.responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('[Notifications] Response:', response);
      this.handleNotificationResponse(response);
    });
  }

  private handleNotificationResponse(response: Notifications.NotificationResponse): void {
    const data = response.notification.request.content.data as unknown as NotificationData;

    switch (data.type) {
      case 'game_invite':
        // Navigate to join screen with game code
        router.push({
          pathname: '/join',
          params: { mode: 'join', code: data.gameCode },
        });
        break;

      case 'game_start':
        // Navigate to game lobby
        router.push(`/game/${data.gameCode}`);
        break;

      case 'achievement':
        // Could show an achievement modal
        console.log('[Notifications] Achievement unlocked:', data.achievementName);
        break;

      default:
        console.log('[Notifications] Unknown notification type:', data);
    }
  }

  async getPushToken(): Promise<string | null> {
    if (this.pushToken) return this.pushToken;

    const saved = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
    if (saved) {
      this.pushToken = saved;
      return saved;
    }

    return null;
  }

  // Schedule a local notification (e.g., game starting soon)
  async scheduleGameStartNotification(
    gameCode: string,
    roomName: string,
    delaySeconds: number
  ): Promise<string> {
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: '🎮 Game Starting!',
        body: `${roomName} is about to begin. Get ready!`,
        data: { type: 'game_start', gameCode, roomName } as unknown as Record<string, unknown>,
        sound: 'default',
      },
      trigger: {
        seconds: delaySeconds,
        channelId: 'game-alerts',
      },
    });

    return identifier;
  }

  // Schedule achievement notification
  async showAchievementNotification(achievementName: string, achievementIcon: string): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🏆 Achievement Unlocked!',
        body: `${achievementIcon} ${achievementName}`,
        data: { type: 'achievement', achievementName, achievementIcon } as unknown as Record<string, unknown>,
        sound: 'default',
      },
      trigger: null, // Show immediately
    });
  }

  // Cancel a scheduled notification
  async cancelNotification(identifier: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  }

  // Cancel all notifications
  async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  // Clear badge count
  async clearBadge(): Promise<void> {
    await Notifications.setBadgeCountAsync(0);
  }

  // Cleanup listeners
  cleanup(): void {
    if (this.notificationListener) {
      this.notificationListener.remove();
    }
    if (this.responseListener) {
      this.responseListener.remove();
    }
  }
}

export const NotificationService = new NotificationServiceClass();
