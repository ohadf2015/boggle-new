// Neo-Brutalist styled game header with timer, score, and round info
import React from 'react';
import { View, Text, StyleSheet, Pressable, I18nManager, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  useAnimatedReaction,
  runOnJS,
} from 'react-native-reanimated';
import { useLanguage } from '../../contexts/LanguageContext';
import { COLORS } from '../../constants/game';
import CircularTimer from './CircularTimer';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface GameHeaderProps {
  remainingTime: number;
  totalTime?: number;
  score: number;
  round?: number;
  totalRounds?: number;
  onLogoPress?: () => void;
  rightContent?: React.ReactNode;
}

/**
 * GameHeader - Neo-Brutalist styled game header component
 * Ported from fe-next/components/GameHeader.jsx
 *
 * Shows timer, score, and optional round information
 * Supports RTL layout for Hebrew
 */
export default function GameHeader({
  remainingTime,
  totalTime = 180,
  score,
  round,
  totalRounds,
  onLogoPress,
  rightContent,
}: GameHeaderProps) {
  const { t } = useLanguage();
  const isRTL = I18nManager.isRTL;

  // Animation values
  const logoScale = useSharedValue(1);
  const logoRotation = useSharedValue(isRTL ? 1 : -1);
  const scoreScale = useSharedValue(1);
  const previousScore = useSharedValue(score);

  // Lightning bolt animation
  const boltScale = useSharedValue(1);
  const boltRotation = useSharedValue(0);

  // Trigger lightning animation periodically
  React.useEffect(() => {
    const interval = setInterval(() => {
      boltRotation.value = withSequence(
        withTiming(-15, { duration: 100 }),
        withTiming(15, { duration: 100 }),
        withTiming(-15, { duration: 100 }),
        withTiming(15, { duration: 100 }),
        withTiming(0, { duration: 100 })
      );
      boltScale.value = withSequence(
        withTiming(1.3, { duration: 100 }),
        withTiming(1, { duration: 300 })
      );
    }, 6000); // Every 6 seconds

    return () => clearInterval(interval);
  }, []);

  // Animate score changes
  useAnimatedReaction(
    () => score,
    (current, previous) => {
      if (previous !== null && current > previous) {
        scoreScale.value = withSequence(
          withSpring(1.2, { damping: 10, stiffness: 200 }),
          withSpring(1, { damping: 10, stiffness: 200 })
        );
      }
    }
  );

  // Logo press animation
  const handleLogoPress = () => {
    logoScale.value = withSequence(
      withSpring(0.95, { damping: 10, stiffness: 200 }),
      withSpring(1, { damping: 10, stiffness: 200 })
    );
    if (onLogoPress) {
      onLogoPress();
    }
  };

  // Animated styles
  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: logoScale.value },
      { rotate: `${logoRotation.value}deg` },
    ],
  }));

  const boltAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${boltRotation.value}deg` },
      { scale: boltScale.value },
    ],
  }));

  const scoreAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scoreScale.value }],
  }));

  // Determine if we should show in compact mode (small screens)
  const isCompact = SCREEN_WIDTH < 375;

  return (
    <View style={styles.container}>
      {/* Neo-Brutalist Header Container */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: COLORS.neoCyan,
            borderColor: COLORS.neoBlack,
          },
        ]}
      >
        {/* Left side - Logo */}
        <Pressable onPress={handleLogoPress}>
          <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
            <View style={styles.logoRow}>
              {/* LEXI - with text shadow */}
              <Text
                style={[
                  styles.logoTextLexi,
                  isCompact && styles.logoTextCompact,
                  {
                    color: COLORS.neoBlack,
                    textShadowColor: COLORS.neoPink,
                  },
                ]}
              >
                {t('logo.lexi')}
              </Text>

              {/* Lightning bolt */}
              <Animated.Text
                style={[
                  styles.logoEmoji,
                  isCompact && styles.logoEmojiCompact,
                  boltAnimatedStyle,
                ]}
              >
                ⚡
              </Animated.Text>

              {/* CLASH - italic skewed */}
              <Text
                style={[
                  styles.logoTextClash,
                  isCompact && styles.logoTextCompact,
                  {
                    color: COLORS.neoPink,
                    textShadowColor: COLORS.neoBlack,
                    transform: [{ skewX: isRTL ? '8deg' : '-8deg' }],
                  },
                ]}
              >
                {t('logo.clash')}
              </Text>
            </View>
          </Animated.View>
        </Pressable>

        {/* Center - Timer */}
        <View style={styles.centerContent}>
          <CircularTimer remainingTime={remainingTime} totalTime={totalTime} />

          {/* Round indicator (if provided) */}
          {round !== undefined && totalRounds !== undefined && (
            <View
              style={[
                styles.roundBadge,
                {
                  backgroundColor: COLORS.neoYellow,
                  borderColor: COLORS.neoBlack,
                },
              ]}
            >
              <Text style={[styles.roundText, { color: COLORS.neoBlack }]}>
                {t('game.round', { current: round, total: totalRounds })}
              </Text>
            </View>
          )}
        </View>

        {/* Right side - Score */}
        <View style={styles.rightContent}>
          <Animated.View
            style={[
              styles.scoreContainer,
              scoreAnimatedStyle,
              {
                backgroundColor: COLORS.neoYellow,
                borderColor: COLORS.neoBlack,
              },
            ]}
          >
            <Text style={[styles.scoreLabel, { color: COLORS.neoBlack }]}>
              {t('game.score')}
            </Text>
            <Text
              style={[
                styles.scoreValue,
                isCompact && styles.scoreValueCompact,
                {
                  color: COLORS.neoBlack,
                  textShadowColor: COLORS.neoOrange,
                },
              ]}
            >
              {score}
            </Text>
          </Animated.View>

          {/* Custom right content (if provided) */}
          {rightContent && <View style={styles.customContent}>{rightContent}</View>}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 4,
    borderRadius: 16,
    // Neo-brutalist hard shadow
    shadowColor: COLORS.neoBlack,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 8,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  logoTextLexi: {
    fontSize: 28,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: -1,
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 0,
  },
  logoTextClash: {
    fontSize: 28,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: -1,
    fontStyle: 'italic',
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 0,
  },
  logoTextCompact: {
    fontSize: 20,
  },
  logoEmoji: {
    fontSize: 24,
  },
  logoEmojiCompact: {
    fontSize: 18,
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  roundBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 2,
    borderRadius: 8,
    marginTop: 4,
    // Neo-brutalist hard shadow
    shadowColor: COLORS.neoBlack,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  roundText: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rightContent: {
    alignItems: 'flex-end',
    gap: 8,
  },
  scoreContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 3,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 80,
    // Neo-brutalist hard shadow
    shadowColor: COLORS.neoBlack,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
  },
  scoreLabel: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 0,
  },
  scoreValueCompact: {
    fontSize: 24,
  },
  customContent: {
    marginTop: 4,
  },
});
