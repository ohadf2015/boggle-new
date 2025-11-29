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
import { useLanguage } from '../../contexts/LanguageContext';

/**
 * Neo-Brutalist Results Winner Banner - React Native
 * Ported from fe-next/components/results/ResultsWinnerBanner.jsx
 * Features: Animated crown, winner announcement, score display
 * Note: Confetti removed for mobile performance
 */

interface Winner {
  username: string;
  score: number;
}

interface ResultsWinnerBannerProps {
  winner: Winner | null;
  isCurrentUserWinner?: boolean;
}

const { width } = Dimensions.get('window');

export const ResultsWinnerBanner: React.FC<ResultsWinnerBannerProps> = ({
  winner,
  isCurrentUserWinner = false,
}) => {
  const { t } = useLanguage();
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const rotateAnim = useRef(new Animated.Value(-3)).current;
  const crownYAnim = useRef(new Animated.Value(-20)).current;
  const crownRotateAnim = useRef(new Animated.Value(-15)).current;
  const trophyRotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!winner) return;

    // Main container entrance animation
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 120,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.spring(rotateAnim, {
        toValue: 0,
        tension: 120,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();

    // Crown entrance animation
    setTimeout(() => {
      Animated.parallel([
        Animated.spring(crownYAnim, {
          toValue: 0,
          tension: 150,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.spring(crownRotateAnim, {
          toValue: 0,
          tension: 150,
          friction: 10,
          useNativeDriver: true,
        }),
      ]).start();

      // Crown floating animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(crownYAnim, {
            toValue: -6,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(crownYAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }, 300);

    // Trophy wobble animation
    setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(trophyRotateAnim, {
            toValue: -8,
            duration: 750,
            useNativeDriver: true,
          }),
          Animated.timing(trophyRotateAnim, {
            toValue: 8,
            duration: 750,
            useNativeDriver: true,
          }),
          Animated.timing(trophyRotateAnim, {
            toValue: 0,
            duration: 750,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }, 600);
  }, [winner]);

  if (!winner) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [
            { scale: scaleAnim },
            {
              rotate: rotateAnim.interpolate({
                inputRange: [-3, 0],
                outputRange: ['-3deg', '0deg'],
              }),
            },
          ],
        },
      ]}
    >
      {/* Neo-Brutalist Main Container */}
      <View style={styles.card}>
        {/* Halftone texture pattern */}
        <View style={styles.halftoneOverlay} />

        {/* Content */}
        <View style={styles.content}>
          {/* Animated Crown */}
          <Animated.View
            style={[
              styles.crownContainer,
              {
                transform: [
                  { translateY: crownYAnim },
                  {
                    rotate: crownRotateAnim.interpolate({
                      inputRange: [-15, 0],
                      outputRange: ['-15deg', '0deg'],
                    }),
                  },
                ],
              },
            ]}
          >
            <TouchableOpacity style={styles.crownBox} activeOpacity={0.9}>
              <Text style={styles.crownIcon}>👑</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* You Won! Message for current user */}
          {isCurrentUserWinner && (
            <View style={styles.youWonContainer}>
              <View style={styles.youWonBadge}>
                <Text style={styles.youWonText}>{t('results.youWon')}</Text>
              </View>
            </View>
          )}

          {/* Winner Announcement Text */}
          <Text style={styles.announcementText}>
            {t('results.winnerAnnouncement')}
          </Text>

          {/* Winner Name */}
          <View style={styles.winnerNameContainer}>
            <Text style={styles.winnerName}>{winner.username}!</Text>
          </View>

          {/* Score Display */}
          <View style={styles.scoreSection}>
            <Animated.View
              style={[
                styles.trophyContainer,
                {
                  transform: [
                    {
                      rotate: trophyRotateAnim.interpolate({
                        inputRange: [-8, 8],
                        outputRange: ['-8deg', '8deg'],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Text style={styles.trophyIcon}>🏆</Text>
            </Animated.View>
            <View style={styles.scoreBox}>
              <Text style={styles.scoreText}>
                {winner.score} {t('results.points')}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
    marginHorizontal: 4,
  },
  card: {
    backgroundColor: COLORS.neoYellow,
    borderWidth: 4,
    borderColor: COLORS.neoBlack,
    borderRadius: 12,
    shadowColor: COLORS.neoBlack,
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  halftoneOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.1,
    backgroundColor: 'transparent',
  },
  content: {
    padding: 24,
    alignItems: 'center',
    position: 'relative',
    zIndex: 10,
  },
  crownContainer: {
    marginBottom: 16,
  },
  crownBox: {
    backgroundColor: COLORS.neoCream,
    borderWidth: 4,
    borderColor: COLORS.neoBlack,
    borderRadius: 6,
    padding: 12,
    shadowColor: COLORS.neoBlack,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  crownIcon: {
    fontSize: 56,
  },
  youWonContainer: {
    marginBottom: 16,
  },
  youWonBadge: {
    backgroundColor: COLORS.neoPink,
    borderWidth: 4,
    borderColor: COLORS.neoBlack,
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    shadowColor: COLORS.neoBlack,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  youWonText: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.neoCream,
    textTransform: 'uppercase',
    letterSpacing: 1,
    textAlign: 'center',
  },
  announcementText: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.neoBlack,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 12,
    textAlign: 'center',
  },
  winnerNameContainer: {
    marginBottom: 24,
  },
  winnerName: {
    fontSize: Math.min(width * 0.1, 48),
    fontWeight: '900',
    color: COLORS.neoBlack,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
    textShadowColor: COLORS.neoCyan,
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 0,
  },
  scoreSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  trophyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  trophyIcon: {
    fontSize: 36,
  },
  scoreBox: {
    backgroundColor: COLORS.neoCream,
    borderWidth: 4,
    borderColor: COLORS.neoBlack,
    borderRadius: 6,
    paddingHorizontal: 24,
    paddingVertical: 12,
    shadowColor: COLORS.neoBlack,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  scoreText: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.neoBlack,
  },
});
