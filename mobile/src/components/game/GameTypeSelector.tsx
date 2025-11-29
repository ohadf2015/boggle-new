// Game Type Selector - Neo-Brutalist Style
// Ported from fe-next/components/GameTypeSelector.jsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  I18nManager,
  Pressable,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useLanguage } from '../../contexts/LanguageContext';
import { COLORS } from '../../constants/game';

// Icons as emoji
const ICONS = {
  regular: '🎮',
  tournament: '🏆',
  lock: '🔒',
  minus: '−',
  plus: '+',
};

interface GameType {
  id: 'regular' | 'tournament';
  icon: string;
  titleKey: string;
  descKey: string;
  locked?: boolean;
  colors: {
    bg: string;
    bgUnselected: string;
    text: string;
    icon: string;
  };
}

interface GameTypeSelectorProps {
  gameType: 'regular' | 'tournament';
  setGameType: (type: 'regular' | 'tournament') => void;
  tournamentRounds: number;
  setTournamentRounds: (rounds: number) => void;
}

/**
 * GameTypeSelector - Neo-Brutalist styled game mode selector
 * Ported from fe-next/components/GameTypeSelector.jsx
 *
 * Allows host to choose between Regular Game and Tournament mode
 * Supports RTL layout for Hebrew
 */
export default function GameTypeSelector({
  gameType,
  setGameType,
  tournamentRounds,
  setTournamentRounds,
}: GameTypeSelectorProps) {
  const { t } = useLanguage();
  const isRTL = I18nManager.isRTL;

  const gameTypes: GameType[] = [
    {
      id: 'regular',
      icon: ICONS.regular,
      titleKey: 'hostView.regularGame',
      descKey: 'hostView.regularGameDesc',
      colors: {
        bg: COLORS.neoCyan,
        bgUnselected: COLORS.neoCream,
        text: COLORS.neoBlack,
        icon: COLORS.neoBlack,
      },
    },
    {
      id: 'tournament',
      icon: ICONS.tournament,
      titleKey: 'hostView.tournament',
      descKey: 'hostView.tournamentDesc',
      locked: true,
      colors: {
        bg: COLORS.neoYellow,
        bgUnselected: COLORS.neoCream,
        text: COLORS.neoBlack,
        icon: COLORS.neoBlack,
      },
    },
  ];

  return (
    <View style={styles.container}>
      {/* Title */}
      <Text style={[styles.title, { color: COLORS.neoCream }]}>
        {t('hostView.gameTypeSelector') || 'Game Mode'}
      </Text>

      {/* Game Type Cards */}
      <View style={styles.cardsGrid}>
        {gameTypes.map((type) => (
          <GameTypeCard
            key={type.id}
            type={type}
            isSelected={gameType === type.id}
            onPress={() => !type.locked && setGameType(type.id)}
          />
        ))}
      </View>

      {/* Tournament Rounds Selector */}
      {gameType === 'tournament' && (
        <Animated.View
          style={[
            styles.roundsSelector,
            {
              backgroundColor: COLORS.neoNavy,
              borderColor: `${COLORS.neoCream}4D`,
            },
          ]}
        >
          <Text style={[styles.roundsLabel, { color: COLORS.neoCream }]}>
            {t('hostView.numberOfRounds') || 'Rounds'}
          </Text>
          <View style={styles.roundsControls}>
            {/* Minus button */}
            <RoundsButton
              disabled={tournamentRounds <= 2}
              onPress={() => setTournamentRounds(Math.max(2, tournamentRounds - 1))}
              label={ICONS.minus}
            />

            {/* Rounds number */}
            <RoundsNumber value={tournamentRounds} />

            {/* Plus button */}
            <RoundsButton
              disabled={tournamentRounds >= 5}
              onPress={() => setTournamentRounds(Math.min(5, tournamentRounds + 1))}
              label={ICONS.plus}
            />
          </View>
        </Animated.View>
      )}
    </View>
  );
}

// GameTypeCard Component
interface GameTypeCardProps {
  type: GameType;
  isSelected: boolean;
  onPress: () => void;
}

function GameTypeCard({ type, isSelected, onPress }: GameTypeCardProps) {
  const { t } = useLanguage();
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const handlePressIn = () => {
    if (!type.locked) {
      scale.value = withSpring(0.98);
      translateX.value = withSpring(2);
      translateY.value = withSpring(2);
    }
  };

  const handlePressOut = () => {
    if (!type.locked) {
      scale.value = withSpring(1);
      translateX.value = withSpring(isSelected ? 2 : 0);
      translateY.value = withSpring(isSelected ? 2 : 0);
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  React.useEffect(() => {
    translateX.value = withSpring(isSelected ? 2 : 0);
    translateY.value = withSpring(isSelected ? 2 : 0);
  }, [isSelected]);

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={type.locked}
      style={styles.cardWrapper}
    >
      <Animated.View
        style={[
          styles.card,
          animatedStyle,
          {
            backgroundColor: type.locked
              ? COLORS.neoGray
              : isSelected
              ? type.colors.bg
              : type.colors.bgUnselected,
            borderColor: COLORS.neoBlack,
            opacity: type.locked ? 0.7 : 1,
          },
        ]}
      >
        {/* Coming Soon badge for locked items */}
        {type.locked && (
          <View
            style={[
              styles.comingSoonBadge,
              {
                backgroundColor: COLORS.neoOrange,
                borderColor: COLORS.neoBlack,
              },
            ]}
          >
            <Text style={[styles.lockIcon, { color: COLORS.neoBlack }]}>
              {ICONS.lock}
            </Text>
            <Text style={[styles.comingSoonText, { color: COLORS.neoBlack }]}>
              {t('hostView.comingSoon') || 'Soon'}
            </Text>
          </View>
        )}

        {/* Selection indicator */}
        {isSelected && !type.locked && (
          <Animated.View
            style={[
              styles.selectedBadge,
              {
                backgroundColor: COLORS.neoLime,
                borderColor: COLORS.neoBlack,
              },
            ]}
          >
            <Text style={[styles.checkmark, { color: COLORS.neoBlack }]}>✓</Text>
          </Animated.View>
        )}

        {/* Icon */}
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: isSelected
                ? COLORS.neoWhite
                : `${COLORS.neoWhite}80`,
              borderColor: COLORS.neoBlack,
            },
          ]}
        >
          <Text style={styles.iconEmoji}>{type.icon}</Text>
        </View>

        {/* Title */}
        <Text
          style={[
            styles.cardTitle,
            {
              color: type.locked ? COLORS.neoCream : type.colors.text,
            },
          ]}
        >
          {t(type.titleKey) || type.id}
        </Text>

        {/* Description */}
        <Text
          style={[
            styles.cardDescription,
            {
              color: type.locked ? COLORS.neoCream : COLORS.neoBlack,
            },
          ]}
        >
          {t(type.descKey) || ''}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

// RoundsButton Component
interface RoundsButtonProps {
  disabled: boolean;
  onPress: () => void;
  label: string;
}

function RoundsButton({ disabled, onPress, label }: RoundsButtonProps) {
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const handlePressIn = () => {
    if (!disabled) {
      scale.value = withSpring(0.95);
      translateX.value = withSpring(1);
      translateY.value = withSpring(1);
    }
  };

  const handlePressOut = () => {
    if (!disabled) {
      scale.value = withSpring(1);
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
    >
      <Animated.View
        style={[
          styles.roundsButton,
          animatedStyle,
          {
            backgroundColor: disabled
              ? `${COLORS.neoGray}80`
              : COLORS.neoCream,
            borderColor: disabled
              ? `${COLORS.neoCream}4D`
              : COLORS.neoBlack,
          },
        ]}
      >
        <Text
          style={[
            styles.roundsButtonText,
            {
              color: disabled ? `${COLORS.neoCream}99` : COLORS.neoBlack,
            },
          ]}
        >
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

// RoundsNumber Component
interface RoundsNumberProps {
  value: number;
}

function RoundsNumber({ value }: RoundsNumberProps) {
  const scale = useSharedValue(1);

  React.useEffect(() => {
    scale.value = withSequence(withSpring(1.3), withSpring(1));
  }, [value]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.Text
      style={[
        styles.roundsNumber,
        animatedStyle,
        { color: COLORS.neoYellow },
      ]}
    >
      {value}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  title: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  cardWrapper: {
    flex: 1,
  },
  card: {
    position: 'relative',
    padding: 16,
    borderRadius: 8,
    borderWidth: 3,
    alignItems: 'center',
    minHeight: 160,
    // Neo-brutalist hard shadow
    shadowColor: COLORS.neoBlack,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  comingSoonBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 2,
    // Neo-brutalist hard shadow
    shadowColor: COLORS.neoBlack,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
    zIndex: 10,
  },
  lockIcon: {
    fontSize: 10,
  },
  comingSoonText: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  selectedBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    // Neo-brutalist hard shadow
    shadowColor: COLORS.neoBlack,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
    zIndex: 10,
  },
  checkmark: {
    fontSize: 16,
    fontWeight: '900',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  iconEmoji: {
    fontSize: 28,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 16,
  },
  roundsSelector: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 3,
    // Neo-brutalist hard shadow
    shadowColor: COLORS.neoBlack,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  roundsLabel: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
    marginBottom: 8,
  },
  roundsControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  roundsButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    // Neo-brutalist hard shadow
    shadowColor: COLORS.neoBlack,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  roundsButtonText: {
    fontSize: 24,
    fontWeight: '900',
  },
  roundsNumber: {
    fontSize: 36,
    fontWeight: '900',
    width: 48,
    textAlign: 'center',
  },
});
