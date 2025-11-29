// Neo-Brutalist styled circular countdown timer using React Native SVG
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, I18nManager } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
  useAnimatedStyle,
  withRepeat,
  withSequence,
} from 'react-native-reanimated';
import { useLanguage } from '../../contexts/LanguageContext';
import { COLORS, TIMER_WARNING_THRESHOLD } from '../../constants/game';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface CircularTimerProps {
  remainingTime: number;
  totalTime?: number;
}

/**
 * CircularTimer - Neo-Brutalist styled countdown timer
 * Ported from fe-next/components/CircularTimer.jsx
 */
export default function CircularTimer({
  remainingTime,
  totalTime = 180
}: CircularTimerProps) {
  const { t } = useLanguage();
  const isRTL = I18nManager.isRTL;

  // Calculate progress percentage
  const progress = totalTime > 0 ? (remainingTime / totalTime) * 100 : 0;

  // SVG circle parameters
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = useSharedValue(circumference);

  // Determine if time is running low
  const isLowTime = remainingTime <= TIMER_WARNING_THRESHOLD;

  // Animation values
  const pulseScale = useSharedValue(1);
  const warningRotation = useSharedValue(0);

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const paddedSecs = secs < 10 ? `0${secs}` : secs;
    return `${mins}:${paddedSecs}`;
  };

  // Update progress circle
  useEffect(() => {
    strokeDashoffset.value = withTiming(
      circumference - (progress / 100) * circumference,
      { duration: 500, easing: Easing.out(Easing.ease) }
    );
  }, [progress, circumference]);

  // Low time warning pulse animation
  useEffect(() => {
    if (isLowTime) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 250 }),
          withTiming(1, { duration: 250 })
        ),
        -1,
        false
      );
    } else {
      pulseScale.value = withTiming(1, { duration: 300 });
    }
  }, [isLowTime]);

  // Animated props for the progress circle
  const animatedCircleProps = useAnimatedProps(() => ({
    strokeDashoffset: strokeDashoffset.value,
  }));

  // Animated style for pulsing text
  const animatedTextStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  // Container rotation for neo-brutalist style
  const containerRotation = isRTL ? 2 : -2;
  const innerRotation = isRTL ? -2 : 2;

  return (
    <View style={styles.container}>
      {/* Neo-Brutalist frame with rotation */}
      <View
        style={[
          styles.frame,
          {
            transform: [{ rotate: `${containerRotation}deg` }],
            backgroundColor: COLORS.neoCream,
            borderColor: COLORS.neoBlack,
          },
        ]}
      >
        <View style={[styles.innerFrame, { transform: [{ rotate: `${innerRotation}deg` }] }]}>
          {/* SVG Timer Circle */}
          <Svg width={120} height={120} style={styles.svg}>
            {/* Background circle - thick black stroke */}
            <Circle
              cx="60"
              cy="60"
              r={radius}
              stroke={COLORS.neoBlack}
              strokeWidth="4"
              fill="none"
              opacity={0.2}
            />

            {/* Inner background circle */}
            <Circle
              cx="60"
              cy="60"
              r={radius - 6}
              stroke={COLORS.neoBlack}
              strokeWidth="12"
              fill="none"
              opacity={0.1}
            />

            {/* Progress circle - solid Neo-Brutalist colors */}
            <AnimatedCircle
              cx="60"
              cy="60"
              r={radius}
              stroke={isLowTime ? COLORS.neoRed : COLORS.neoCyan}
              strokeWidth="10"
              fill="none"
              strokeLinecap="butt"
              strokeDasharray={circumference}
              animatedProps={animatedCircleProps}
              rotation="-90"
              origin="60, 60"
            />

            {/* Outer ring */}
            <Circle
              cx="60"
              cy="60"
              r={radius + 4}
              stroke={COLORS.neoBlack}
              strokeWidth="3"
              fill="none"
            />
          </Svg>

          {/* Timer text in the center */}
          <View style={styles.textContainer}>
            <Animated.View style={animatedTextStyle}>
              <Text
                style={[
                  styles.timerText,
                  {
                    color: COLORS.neoBlack,
                    textShadowColor: isLowTime ? COLORS.neoRed : COLORS.neoCyan,
                  },
                ]}
              >
                {formatTime(remainingTime)}
              </Text>
            </Animated.View>
          </View>
        </View>

        {/* Low time warning badge */}
        {isLowTime && (
          <View
            style={[
              styles.warningBadge,
              {
                backgroundColor: COLORS.neoRed,
                borderColor: COLORS.neoBlack,
                top: -8,
                [isRTL ? 'left' : 'right']: -8,
                transform: [{ rotate: isRTL ? '-12deg' : '12deg' }],
              },
            ]}
          >
            <Text
              style={[
                styles.warningText,
                { color: COLORS.neoCream },
              ]}
            >
              {t('common.hurry')}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    padding: 12,
    borderWidth: 4,
    borderRadius: 16,
    // Shadow for neo-brutalist hard shadow effect
    shadowColor: COLORS.neoBlack,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 8,
  },
  innerFrame: {
    position: 'relative',
    width: 120,
    height: 120,
  },
  svg: {
    transform: [{ rotate: '-90deg' }],
  },
  textContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerText: {
    fontSize: 30,
    fontWeight: '900',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 0,
    letterSpacing: 1,
  },
  warningBadge: {
    position: 'absolute',
    zIndex: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 2,
    borderRadius: 6,
    // Shadow for neo-brutalist hard shadow effect
    shadowColor: COLORS.neoBlack,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
  },
  warningText: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
