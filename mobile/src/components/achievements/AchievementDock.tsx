import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ScrollView,
  ViewStyle,
} from 'react-native';
import { COLORS } from '../../constants/game';

/**
 * Neo-Brutalist Achievement Dock for React Native
 * Ported from fe-next/components/achievements/AchievementDock.jsx
 * Features: Thick borders, hard shadows, bold uppercase text, vibrant colors
 * Displays a trophy button that expands to show all earned achievements
 */

export interface Achievement {
  name: string;
  description: string;
  icon: string;
}

interface AchievementDockProps {
  achievements?: Achievement[];
  style?: ViewStyle;
  isRTL?: boolean;
  title?: string;
}

const AchievementDock: React.FC<AchievementDockProps> = ({
  achievements = [],
  style,
  isRTL = false,
  title = 'YOUR ACHIEVEMENTS',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasNewAchievement, setHasNewAchievement] = useState(false);
  const prevCountRef = useRef(achievements.length);
  const autoCollapseTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Animation values
  const buttonScaleAnim = useRef(new Animated.Value(1)).current;
  const buttonRotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const panelScaleAnim = useRef(new Animated.Value(0.9)).current;
  const panelOpacityAnim = useRef(new Animated.Value(0)).current;

  // Detect new achievement added
  useEffect(() => {
    if (achievements.length > prevCountRef.current) {
      // Clear any existing timeout
      if (autoCollapseTimeoutRef.current) {
        clearTimeout(autoCollapseTimeoutRef.current);
      }

      // Show new achievement animation
      setHasNewAchievement(true);
      setIsExpanded(true);

      // Start pulsing animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(buttonScaleAnim, {
            toValue: 1.15,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(buttonScaleAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Auto-collapse after 5 seconds
      autoCollapseTimeoutRef.current = setTimeout(() => {
        setIsExpanded(false);
        setHasNewAchievement(false);
        buttonScaleAnim.stopAnimation();
        buttonScaleAnim.setValue(1);
      }, 5000);

      prevCountRef.current = achievements.length;
    } else {
      prevCountRef.current = achievements.length;
    }

    return () => {
      if (autoCollapseTimeoutRef.current) {
        clearTimeout(autoCollapseTimeoutRef.current);
      }
    };
  }, [achievements.length]);

  // Panel animation
  useEffect(() => {
    if (isExpanded) {
      Animated.parallel([
        Animated.spring(panelScaleAnim, {
          toValue: 1,
          tension: 300,
          friction: 20,
          useNativeDriver: true,
        }),
        Animated.timing(panelOpacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(panelScaleAnim, {
          toValue: 0.9,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(panelOpacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isExpanded]);

  // Pulse ring animation for new achievements
  useEffect(() => {
    if (hasNewAchievement) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.5,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [hasNewAchievement]);

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
    setHasNewAchievement(false);

    // Stop animations
    buttonScaleAnim.stopAnimation();
    buttonScaleAnim.setValue(1);
    buttonRotateAnim.setValue(0);

    // Clear auto-collapse when user manually toggles
    if (autoCollapseTimeoutRef.current) {
      clearTimeout(autoCollapseTimeoutRef.current);
    }

    // Rotation animation on toggle
    Animated.spring(buttonRotateAnim, {
      toValue: isExpanded ? 0 : 3,
      tension: 300,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  if (achievements.length === 0) return null;

  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [1, 1.5],
    outputRange: [0.8, 0],
  });

  return (
    <View style={[styles.container, style]}>
      {/* Trophy Button */}
      <TouchableOpacity
        onPress={handleToggle}
        activeOpacity={0.9}
        style={styles.buttonContainer}
      >
        <Animated.View
          style={[
            styles.button,
            {
              transform: [
                { scale: buttonScaleAnim },
                {
                  rotate: buttonRotateAnim.interpolate({
                    inputRange: [0, 3],
                    outputRange: ['0deg', '3deg'],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.trophy}>🏆</Text>

          {/* Count badge */}
          <Animated.View style={styles.badge}>
            <Text style={styles.badgeText}>{achievements.length}</Text>
          </Animated.View>

          {/* Pulse ring for new achievement */}
          {hasNewAchievement && (
            <Animated.View
              style={[
                styles.pulseRing,
                {
                  transform: [{ scale: pulseAnim }],
                  opacity: pulseOpacity,
                },
              ]}
            />
          )}
        </Animated.View>
      </TouchableOpacity>

      {/* Expanded Panel */}
      {isExpanded && (
        <Animated.View
          style={[
            styles.panel,
            isRTL ? styles.panelLeft : styles.panelRight,
            {
              transform: [{ scale: panelScaleAnim }],
              opacity: panelOpacityAnim,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerIcon}>🏆</Text>
            <Text style={styles.headerText}>{title}</Text>
          </View>

          {/* Achievement list */}
          <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
            <View style={styles.list}>
              {achievements.map((achievement, index) => (
                <View
                  key={`${achievement.name}-${index}`}
                  style={styles.achievementItem}
                >
                  <View style={styles.achievementIcon}>
                    <Text style={styles.achievementIconText}>
                      {achievement.icon}
                    </Text>
                  </View>
                  <View style={styles.achievementTextContainer}>
                    <Text style={styles.achievementName} numberOfLines={1}>
                      {achievement.name}
                    </Text>
                    <Text style={styles.achievementDescription} numberOfLines={1}>
                      {achievement.description}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        </Animated.View>
      )}
    </View>
  );
};

export default AchievementDock;

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 40,
  },
  buttonContainer: {
    width: 56,
    height: 56,
  },
  button: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: COLORS.neoYellow,
    borderWidth: 4,
    borderColor: COLORS.neoBlack,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.neoBlack,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
  },
  trophy: {
    fontSize: 28,
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: COLORS.neoPink,
    borderWidth: 3,
    borderColor: COLORS.neoBlack,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.neoBlack,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.neoWhite,
  },
  pulseRing: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 12,
    backgroundColor: COLORS.neoLime,
    borderWidth: 4,
    borderColor: COLORS.neoBlack,
  },
  panel: {
    position: 'absolute',
    top: 68,
    width: 320,
    maxHeight: 320,
    backgroundColor: COLORS.neoCream,
    borderWidth: 4,
    borderColor: COLORS.neoBlack,
    borderRadius: 12,
    shadowColor: COLORS.neoBlack,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 8,
    overflow: 'hidden',
  },
  panelRight: {
    right: 0,
  },
  panelLeft: {
    left: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.neoPurple,
    borderBottomWidth: 4,
    borderBottomColor: COLORS.neoBlack,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  headerIcon: {
    fontSize: 20,
  },
  headerText: {
    fontSize: 14,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: COLORS.neoWhite,
  },
  listContainer: {
    flex: 1,
  },
  list: {
    padding: 12,
    gap: 8,
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.neoWhite,
    borderWidth: 3,
    borderColor: COLORS.neoBlack,
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: COLORS.neoBlack,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
    gap: 12,
  },
  achievementIcon: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: COLORS.neoCyan,
    borderWidth: 2,
    borderColor: COLORS.neoBlack,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.neoBlack,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  achievementIconText: {
    fontSize: 18,
  },
  achievementTextContainer: {
    flex: 1,
    minWidth: 0,
  },
  achievementName: {
    fontSize: 14,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: COLORS.neoBlack,
  },
  achievementDescription: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(0, 0, 0, 0.7)',
    marginTop: 2,
  },
});
