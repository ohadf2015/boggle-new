// Root layout with providers
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SocketProvider } from '../src/contexts/SocketContext';
import { LanguageProvider } from '../src/contexts/LanguageContext';
import { AudioProvider } from '../src/features/audio/AudioContext';
import { NotificationService } from '../src/features/notifications/NotificationService';
import { COLORS } from '../src/constants/game';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Initialize push notifications
  useEffect(() => {
    NotificationService.initialize();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <LanguageProvider>
          <AudioProvider>
            <SocketProvider>
              <View style={{ flex: 1, backgroundColor: isDark ? COLORS.neoBlack : COLORS.neoCream }}>
                <Stack
                  screenOptions={{
                    headerShown: false,
                    contentStyle: {
                      backgroundColor: isDark ? COLORS.neoBlack : COLORS.neoCream,
                    },
                    animation: 'slide_from_right',
                  }}
                >
                  <Stack.Screen name="index" options={{ title: 'LexiClash' }} />
                  <Stack.Screen name="join" options={{ title: 'Join Game' }} />
                  <Stack.Screen name="practice" options={{ title: 'Practice' }} />
                  <Stack.Screen name="settings" options={{ title: 'Settings' }} />
                  <Stack.Screen
                    name="game/[code]"
                    options={{
                      title: 'Lobby',
                      gestureEnabled: false, // Prevent swipe back during lobby
                    }}
                  />
                  <Stack.Screen
                    name="game/play"
                    options={{
                      title: 'Playing',
                      gestureEnabled: false, // Prevent swipe back during game
                    }}
                  />
                  <Stack.Screen name="game/results" options={{ title: 'Results' }} />
                </Stack>
                <StatusBar style={isDark ? 'light' : 'dark'} />
              </View>
            </SocketProvider>
          </AudioProvider>
        </LanguageProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
