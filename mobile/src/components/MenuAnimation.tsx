import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { COLORS } from '../constants/game';
import { useLanguage } from '../contexts/LanguageContext';
import {
  hebrewLetters,
  englishLetters,
  swedishLetters,
  japaneseLetters,
} from '../constants/game';

/**
 * MenuAnimation - Flying letters animation for the menu/join view (Mobile Simplified)
 * Ported from fe-next/components/MenuAnimation.jsx
 * Simplified for mobile performance:
 * - Fewer letters (12 instead of 18)
 * - Simpler animations
 * - No complex particle effects
 * - Optimized for mobile battery/performance
 */

interface Letter {
  id: string;
  char: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  size: number;
  duration: number;
  delay: number;
  bgColor: string;
  borderColor: string;
  rotation: number;
}

interface ColorScheme {
  bg: string;
  border: string;
}

// Neo-Brutalist color palette - bold, high contrast
const BRUTALIST_COLORS: ColorScheme[] = [
  { bg: COLORS.neoYellow, border: COLORS.neoBlack },
  { bg: COLORS.neoPink, border: COLORS.neoBlack },
  { bg: COLORS.neoLime, border: COLORS.neoBlack },
  { bg: COLORS.neoCyan, border: COLORS.neoBlack },
  { bg: COLORS.neoOrange, border: COLORS.neoBlack },
  { bg: COLORS.neoPurpleLight, border: COLORS.neoBlack },
  { bg: COLORS.neoWhite, border: COLORS.neoBlack },
];

const { width, height } = Dimensions.get('window');

export const MenuAnimation: React.FC = () => {
  const { language } = useLanguage();
  const [letters, setLetters] = useState<Letter[]>([]);

  // Get letter set based on language
  const getLetterSet = useCallback(() => {
    switch (language) {
      case 'he':
        return hebrewLetters;
      case 'sv':
        return swedishLetters;
      case 'ja':
        return japaneseLetters;
      case 'en':
      default:
        return englishLetters;
    }
  }, [language]);

  // Generate a single letter
  const generateLetter = useCallback(
    (index: number): Letter => {
      const letterSet = getLetterSet();
      const colorScheme =
        BRUTALIST_COLORS[Math.floor(Math.random() * BRUTALIST_COLORS.length)];
      return {
        id: `letter-${index}-${Date.now()}-${Math.random()}`,
        char: letterSet[Math.floor(Math.random() * letterSet.length)],
        x: Math.random() * width,
        y: Math.random() * height,
        targetX: Math.random() * width,
        targetY: Math.random() * height,
        size: Math.random() * 20 + 30, // 30-50px (smaller for mobile)
        duration: Math.random() * 12000 + 10000, // 10-22 seconds (faster for mobile)
        delay: Math.random() * 2000,
        bgColor: colorScheme.bg,
        borderColor: colorScheme.border,
        rotation: Math.random() > 0.5 ? Math.random() * 20 - 10 : 0,
      };
    },
    [getLetterSet]
  );

  // Generate initial letters (fewer for mobile performance)
  useEffect(() => {
    const numberOfLetters = 12; // Reduced from 18
    const newLetters = Array(numberOfLetters)
      .fill(null)
      .map((_, index) => generateLetter(index));
    setLetters(newLetters);
  }, [language, generateLetter]);

  // Handle letter click - pop it and spawn new one
  const handleLetterClick = useCallback(
    (letterId: string) => {
      setLetters((prev) =>
        prev.map((l) =>
          l.id === letterId ? generateLetter(prev.length) : l
        )
      );
    },
    [generateLetter]
  );

  return (
    <View style={styles.container} pointerEvents="box-none">
      {letters.map((letter) => (
        <FloatingLetter
          key={letter.id}
          letter={letter}
          onPress={handleLetterClick}
          language={language}
        />
      ))}
    </View>
  );
};

interface FloatingLetterProps {
  letter: Letter;
  onPress: (id: string) => void;
  language: string;
}

const FloatingLetter: React.FC<FloatingLetterProps> = ({
  letter,
  onPress,
  language,
}) => {
  const translateX = useRef(new Animated.Value(letter.x)).current;
  const translateY = useRef(new Animated.Value(letter.y)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.5)).current;
  const rotate = useRef(new Animated.Value(letter.rotation)).current;

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0.6,
        duration: 1000,
        delay: letter.delay,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 1000,
        delay: letter.delay,
        useNativeDriver: true,
      }),
    ]).start();

    // Floating animation
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(translateX, {
            toValue: letter.targetX,
            duration: letter.duration,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(translateY, {
            toValue: letter.targetY,
            duration: letter.duration,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(rotate, {
            toValue: letter.rotation + 5,
            duration: letter.duration / 3,
            useNativeDriver: true,
          }),
          Animated.timing(rotate, {
            toValue: letter.rotation - 5,
            duration: letter.duration / 3,
            useNativeDriver: true,
          }),
          Animated.timing(rotate, {
            toValue: letter.rotation,
            duration: letter.duration / 3,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(scale, {
            toValue: 0.8,
            duration: letter.duration,
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();
  }, [letter]);

  const handlePress = () => {
    // Pop animation
    Animated.parallel([
      Animated.timing(scale, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onPress(letter.id);
    });
  };

  const getFontFamily = () => {
    switch (language) {
      case 'he':
        return 'System'; // Or use a Hebrew font if available
      case 'ja':
        return 'System'; // Or use a Japanese font if available
      case 'sv':
      case 'en':
      default:
        return 'System';
    }
  };

  return (
    <Animated.View
      style={[
        styles.letterContainer,
        {
          transform: [
            { translateX },
            { translateY },
            { scale },
            {
              rotate: rotate.interpolate({
                inputRange: [-180, 180],
                outputRange: ['-180deg', '180deg'],
              }),
            },
          ],
          opacity,
        },
      ]}
    >
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.8}
        style={[
          styles.letterBox,
          {
            backgroundColor: letter.bgColor,
            borderColor: letter.borderColor,
          },
        ]}
      >
        <Text
          style={[
            styles.letterText,
            {
              fontSize: letter.size,
              fontFamily: getFontFamily(),
            },
          ]}
        >
          {letter.char}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  letterContainer: {
    position: 'absolute',
  },
  letterBox: {
    borderWidth: 3,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    shadowColor: COLORS.neoBlack,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  letterText: {
    fontWeight: '900',
    color: COLORS.neoBlack,
    letterSpacing: -0.5,
    lineHeight: undefined, // Let RN calculate
  },
});
