// Home screen - Join or Host a game
// Enhanced with MenuAnimation background and improved Neo-Brutalist UI
import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  useColorScheme,
  Pressable,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '../src/contexts/LanguageContext';
import { useSocket } from '../src/contexts/SocketContext';
import { useAudio } from '../src/features/audio/AudioContext';
import { HapticsService } from '../src/features/haptics/HapticsService';
import { MenuAnimation } from '../src/components/MenuAnimation';
import { Avatar } from '../src/components/profile';
import { Button } from '../src/components/ui';
import { COLORS } from '../src/constants/game';

// Language flag emojis
const LANGUAGE_FLAGS: Record<string, string> = {
  he: '🇮🇱',
  en: '🇺🇸',
  sv: '🇸🇪',
  ja: '🇯🇵',
};

export default function HomeScreen() {
  const router = useRouter();
  const { t, language, setLanguage, isRTL } = useLanguage();
  const { isConnected } = useSocket();
  const { isMusicMuted, toggleMusicMute, playTrack, TRACKS, isAudioReady } = useAudio();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Play lobby music when home screen loads
  useEffect(() => {
    if (isAudioReady && !isMusicMuted) {
      playTrack('LOBBY' as any);
    }
  }, [isAudioReady]);

  const handleJoinGame = async () => {
    await HapticsService.buttonPress();
    router.push('/join?mode=join');
  };

  const handleHostGame = async () => {
    await HapticsService.buttonPress();
    router.push('/join?mode=host');
  };

  const handlePractice = async () => {
    await HapticsService.buttonPress();
    router.push('/practice' as any);
  };

  const handleSettings = async () => {
    await HapticsService.buttonPress();
    router.push('/settings' as any);
  };

  const toggleLanguage = async () => {
    await HapticsService.buttonPress();
    const languages = ['he', 'en', 'sv', 'ja'] as const;
    const currentIndex = languages.indexOf(language);
    const nextIndex = (currentIndex + 1) % languages.length;
    await setLanguage(languages[nextIndex]);
  };

  const handleToggleMusic = async () => {
    await HapticsService.buttonPress();
    toggleMusicMute();
  };

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />

      {/* Animated Background */}
      <MenuAnimation />

      {/* Semi-transparent overlay to ensure text readability */}
      <View
        style={[
          styles.overlay,
          {
            backgroundColor: isDark
              ? 'rgba(26,26,46,0.90)'
              : 'rgba(255,254,240,0.90)',
          },
        ]}
      />

      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Header with Avatar and Controls */}
        <View style={styles.header}>
          <Pressable
            onPress={handleSettings}
            style={({ pressed }) => [
              styles.avatarContainer,
              pressed && styles.pressed,
            ]}
          >
            <Avatar size={48} />
          </Pressable>

          <View style={styles.headerControls}>
            {/* Language Selector */}
            <Pressable
              onPress={toggleLanguage}
              style={({ pressed }) => [
                styles.controlButton,
                { backgroundColor: isDark ? COLORS.neoGray : COLORS.neoWhite },
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.controlIcon}>{LANGUAGE_FLAGS[language]}</Text>
            </Pressable>

            {/* Music Toggle */}
            <Pressable
              onPress={handleToggleMusic}
              style={({ pressed }) => [
                styles.controlButton,
                { backgroundColor: isDark ? COLORS.neoGray : COLORS.neoWhite },
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.controlIcon}>
                {isMusicMuted ? '🔇' : '🔊'}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Main Content */}
        <View style={styles.content}>
          {/* Logo */}
          <View style={styles.logoContainer}>
            <Text style={[styles.logoLexi, { color: COLORS.neoCyan }]}>
              {t('logo.lexi')}
            </Text>
            <Text style={[styles.logoClash, { color: COLORS.neoPink }]}>
              {t('logo.clash')}
            </Text>
          </View>

          {/* Tagline */}
          <Text
            style={[
              styles.tagline,
              { color: isDark ? COLORS.neoCream : COLORS.neoBlack },
            ]}
          >
            {t('home.tagline')}
          </Text>

          {/* Connection Status */}
          <View style={styles.statusContainer}>
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor: isConnected
                    ? COLORS.success
                    : COLORS.warning,
                },
              ]}
            />
            <Text
              style={[
                styles.statusText,
                { color: isDark ? COLORS.neoCream : COLORS.neoBlack },
              ]}
            >
              {isConnected ? t('home.connected') : t('home.connecting')}
            </Text>
          </View>

          {/* Main Action Buttons */}
          <View style={styles.buttonContainer}>
            <Button
              variant="cyan"
              size="lg"
              onPress={handleJoinGame}
              style={styles.mainButton}
            >
              {t('home.joinGame')}
            </Button>

            <Button
              variant="accent"
              size="lg"
              onPress={handleHostGame}
              style={styles.mainButton}
            >
              {t('home.hostGame')}
            </Button>

            <Button
              variant="default"
              size="default"
              onPress={handlePractice}
              style={styles.secondaryButton}
            >
              {t('home.practice')}
            </Button>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text
            style={[
              styles.footerText,
              { color: isDark ? COLORS.neoCream : COLORS.neoBlack },
            ]}
          >
            {t('home.version')}
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  container: {
    flex: 1,
    zIndex: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  avatarContainer: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  headerControls: {
    flexDirection: 'row',
    gap: 12,
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.neoBlack,
    shadowColor: COLORS.neoBlack,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  controlIcon: {
    fontSize: 24,
  },
  pressed: {
    transform: [{ scale: 0.95 }],
    opacity: 0.8,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  logoContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'center',
  },
  logoLexi: {
    fontSize: 56,
    fontWeight: '900',
    letterSpacing: -3,
    textShadowColor: COLORS.neoBlack,
    textShadowOffset: { width: 4, height: 4 },
    textShadowRadius: 0,
  },
  logoClash: {
    fontSize: 56,
    fontWeight: '900',
    letterSpacing: -3,
    textShadowColor: COLORS.neoBlack,
    textShadowOffset: { width: 4, height: 4 },
    textShadowRadius: 0,
  },
  tagline: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 32,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: COLORS.neoBlack,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
    borderWidth: 2,
    borderColor: COLORS.neoBlack,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 340,
    gap: 16,
  },
  mainButton: {
    minHeight: 64,
  },
  secondaryButton: {
    minHeight: 52,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 16,
  },
  footerText: {
    fontSize: 12,
    opacity: 0.6,
    fontWeight: '600',
  },
});
