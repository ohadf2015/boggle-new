import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Modal,
  Pressable,
} from 'react-native';
import { COLORS } from '../../constants/game';

/**
 * Neo-Brutalist Achievement Badge for React Native
 * Ported from fe-next/components/AchievementBadge.jsx
 * Features: Thick borders, hard shadows, bold uppercase text, vibrant colors
 */

export interface Achievement {
  name: string;
  description: string;
  icon: string;
}

interface AchievementBadgeProps {
  achievement: Achievement;
  index?: number;
}

export const AchievementBadge: React.FC<AchievementBadgeProps> = ({
  achievement,
  index = 0,
}) => {
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const scaleAnim = new Animated.Value(0);

  React.useEffect(() => {
    // Initial entrance animation
    Animated.spring(scaleAnim, {
      toValue: 1,
      delay: index * 50,
      tension: 300,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, []);

  const handlePress = () => {
    setTooltipVisible(!tooltipVisible);
  };

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      tension: 300,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 300,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  return (
    <>
      <Animated.View
        style={[
          styles.container,
          {
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.badge}
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={1}
        >
          <Text style={styles.icon}>{achievement.icon}</Text>
          <Text style={styles.badgeText}>{achievement.name}</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Tooltip Modal */}
      <Modal
        transparent
        visible={tooltipVisible}
        animationType="fade"
        onRequestClose={() => setTooltipVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setTooltipVisible(false)}
        >
          <View style={styles.tooltipContainer}>
            <View style={styles.tooltip}>
              <Text style={styles.tooltipTitle}>{achievement.name}</Text>
              <Text style={styles.tooltipDescription}>
                {achievement.description}
              </Text>
            </View>
          </View>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 4,
    marginVertical: 4,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.neoCyan,
    borderWidth: 3,
    borderColor: COLORS.neoBlack,
    borderRadius: 6,
    // Hard shadow for neo-brutalist style
    shadowColor: COLORS.neoBlack,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  icon: {
    fontSize: 16,
    marginRight: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: COLORS.neoBlack,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tooltipContainer: {
    padding: 20,
    maxWidth: '80%',
  },
  tooltip: {
    backgroundColor: COLORS.neoPurple,
    borderWidth: 3,
    borderColor: COLORS.neoBlack,
    borderRadius: 8,
    padding: 16,
    shadowColor: COLORS.neoBlack,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 8,
  },
  tooltipTitle: {
    fontSize: 16,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: COLORS.neoWhite,
    marginBottom: 8,
  },
  tooltipDescription: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.neoCyan,
    lineHeight: 18,
  },
});
