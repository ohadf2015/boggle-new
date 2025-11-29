import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { COLORS } from '../../constants/game';

/**
 * Neo-Brutalist Achievement Popup for React Native
 * Ported from fe-next/components/achievements/AchievementPopup.jsx
 * Features: Thick borders, hard shadows, bold uppercase text, vibrant colors
 * Uses React Native Animated API instead of Framer Motion
 */

export interface Achievement {
  name: string;
  description: string;
  icon: string;
}

interface AchievementPopupProps {
  achievement: Achievement | null;
  onComplete?: () => void;
  playSound?: () => void; // Optional sound playback function
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DISPLAY_DURATION = 3000; // 3 seconds

const AchievementPopup: React.FC<AchievementPopupProps> = ({
  achievement,
  onComplete,
  playSound,
}) => {
  const slideAnim = useRef(new Animated.Value(300)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const iconScaleAnim = useRef(new Animated.Value(0)).current;
  const iconRotateAnim = useRef(new Animated.Value(-90)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const closeScaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!achievement) return;

    // Play sound if provided
    playSound?.();

    // Reset animations
    slideAnim.setValue(300);
    opacityAnim.setValue(0);
    iconScaleAnim.setValue(0);
    iconRotateAnim.setValue(-90);
    progressAnim.setValue(0);
    closeScaleAnim.setValue(0);

    // Slide in from right
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 300,
        friction: 25,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Icon animation
    Animated.parallel([
      Animated.spring(iconScaleAnim, {
        toValue: 1,
        delay: 100,
        tension: 400,
        friction: 15,
        useNativeDriver: true,
      }),
      Animated.spring(iconRotateAnim, {
        toValue: 0,
        delay: 100,
        tension: 400,
        friction: 15,
        useNativeDriver: true,
      }),
    ]).start();

    // Close button animation
    Animated.spring(closeScaleAnim, {
      toValue: 1,
      delay: 300,
      tension: 300,
      friction: 10,
      useNativeDriver: true,
    }).start();

    // Progress bar animation
    Animated.timing(progressAnim, {
      toValue: 100,
      duration: DISPLAY_DURATION,
      useNativeDriver: false, // Can't use native driver for width
    }).start();

    // Auto-dismiss after duration
    const timeout = setTimeout(() => {
      handleDismiss();
    }, DISPLAY_DURATION);

    return () => clearTimeout(timeout);
  }, [achievement]);

  const handleDismiss = () => {
    // Slide out to right
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 300,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onComplete?.();
    });
  };

  if (!achievement) return null;

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  const iconRotate = iconRotateAnim.interpolate({
    inputRange: [-90, 0],
    outputRange: ['-90deg', '0deg'],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateX: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.popup}
        onPress={handleDismiss}
        activeOpacity={0.95}
      >
        <View style={styles.content}>
          {/* Icon */}
          <Animated.View
            style={[
              styles.iconContainer,
              {
                transform: [
                  { scale: iconScaleAnim },
                  { rotate: iconRotate },
                ],
              },
            ]}
          >
            <Text style={styles.icon}>{achievement.icon}</Text>
          </Animated.View>

          {/* Text content */}
          <View style={styles.textContainer}>
            <Text style={styles.title} numberOfLines={1}>
              {achievement.name}
            </Text>
            <Text style={styles.description} numberOfLines={1}>
              {achievement.description}
            </Text>
          </View>

          {/* Close button */}
          <Animated.View
            style={[
              styles.closeButton,
              {
                transform: [{ scale: closeScaleAnim }],
              },
            ]}
          >
            <Text style={styles.closeText}>✕</Text>
          </Animated.View>
        </View>

        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <Animated.View
            style={[
              styles.progressBar,
              {
                width: progressWidth,
              },
            ]}
          />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default AchievementPopup;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 80,
    right: 16,
    width: Math.min(320, SCREEN_WIDTH - 32),
    zIndex: 9999,
  },
  popup: {
    backgroundColor: COLORS.neoPurple,
    borderWidth: 3,
    borderColor: COLORS.neoBlack,
    borderRadius: 12,
    overflow: 'hidden',
    // Hard shadow for neo-brutalist style
    shadowColor: COLORS.neoBlack,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    backgroundColor: COLORS.neoCyan,
    borderWidth: 2,
    borderColor: COLORS.neoBlack,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.neoBlack,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  icon: {
    fontSize: 20,
  },
  textContainer: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 14,
    fontWeight: '900',
    textTransform: 'uppercase',
    color: COLORS.neoYellow,
    letterSpacing: 0.5,
  },
  description: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
  },
  closeButton: {
    width: 24,
    height: 24,
    backgroundColor: COLORS.neoPink,
    borderWidth: 2,
    borderColor: COLORS.neoBlack,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.neoWhite,
  },
  progressContainer: {
    height: 6,
    backgroundColor: COLORS.neoNavyLight,
    borderTopWidth: 1,
    borderColor: COLORS.neoBlack,
  },
  progressBar: {
    height: '100%',
    backgroundColor: COLORS.neoLime,
  },
});
