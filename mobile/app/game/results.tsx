// Game results screen
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  FlatList,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { useSocketEvent, useGameSocket } from '../../src/contexts/SocketContext';
import { HapticsService } from '../../src/features/haptics/HapticsService';
import { COLORS } from '../../src/constants/game';
import { ResultsWinnerBanner } from '../../src/components/results/ResultsWinnerBanner';
import { ResultsPlayerCard } from '../../src/components/results/ResultsPlayerCard';

interface PlayerResult {
  username: string;
  score: number;
  wordCount?: number;
  validWordCount?: number;
  allWords?: Array<{ word: string; score: number; validated: boolean; isDuplicate?: boolean; comboBonus?: number }>;
  longestWord?: string;
  achievements?: any[];
  avatar?: { emoji?: string; color?: string };
  title?: { icon: string; name: string; description: string };
}

export default function ResultsScreen() {
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code: string }>();
  const { t } = useLanguage();
  const { resetGame: emitResetGame, leaveRoom: emitLeaveRoom } = useGameSocket();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [results, setResults] = useState<PlayerResult[]>([]);
  const [currentUsername, setCurrentUsername] = useState<string>('');
  const [allPlayerWords, setAllPlayerWords] = useState<Record<string, any[]>>({});

  // Animation values
  const bannerScale = useSharedValue(0);
  const bannerRotate = useSharedValue(-10);

  // Listen for final scores
  useSocketEvent('validatedScores', (data: { scores: PlayerResult[]; letterGrid?: string[][] }) => {
    const sorted = [...data.scores].sort((a, b) => b.score - a.score);
    setResults(sorted);

    // Build allPlayerWords map for ResultsPlayerCard
    const wordsMap: Record<string, any[]> = {};
    sorted.forEach(player => {
      if (player.allWords) {
        wordsMap[player.username] = player.allWords;
      }
    });
    setAllPlayerWords(wordsMap);

    // Animate winner banner
    bannerScale.value = withDelay(
      300,
      withSpring(1, { damping: 8, stiffness: 100 })
    );
    bannerRotate.value = withSequence(
      withTiming(-5, { duration: 100 }),
      withTiming(5, { duration: 100 }),
      withTiming(0, { duration: 100 })
    );
  });

  // Get current username from storage or socket
  useEffect(() => {
    // In a real app, you'd get this from auth context or AsyncStorage
    // For now, we'll leave it empty - the component will still work
  }, []);

  useEffect(() => {
    // Play celebration haptic for winner
    if (results.length > 0) {
      HapticsService.achievement();
    }
  }, [results]);

  const handlePlayAgain = async () => {
    await HapticsService.buttonPress();
    emitResetGame();
    router.replace(`/game/${code}`);
  };

  const handleExit = async () => {
    await HapticsService.buttonPress();
    if (code && currentUsername) {
      emitLeaveRoom(code, currentUsername);
    }
    router.replace('/');
  };

  const bannerStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: bannerScale.value },
      { rotate: `${bannerRotate.value}deg` },
    ],
  }));

  const winner = results[0];
  const isCurrentUserWinner = currentUsername && winner?.username === currentUsername;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? COLORS.neoBlack : COLORS.neoCream }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Winner Banner */}
        {winner && (
          <Animated.View style={bannerStyle}>
            <ResultsWinnerBanner
              winner={winner}
              isCurrentUserWinner={isCurrentUserWinner}
            />
          </Animated.View>
        )}

        {/* Results List */}
        <View style={styles.resultsContainer}>
          <Text style={[styles.sectionTitle, { color: isDark ? COLORS.neoCream : COLORS.neoBlack }]}>
            {t('results.leaderboard')}
          </Text>
          {results.map((player, index) => (
            <ResultsPlayerCard
              key={player.username}
              player={player}
              index={index}
              allPlayerWords={allPlayerWords}
              currentUsername={currentUsername}
              isWinner={index === 0}
            />
          ))}
        </View>
      </ScrollView>

      {/* Action Buttons - Fixed at bottom */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, styles.playAgainButton]}
          onPress={handlePlayAgain}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>{t('results.playAgain')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.exitButton]}
          onPress={handleExit}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>{t('results.exit')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  resultsContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 15,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    backgroundColor: 'transparent',
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: COLORS.neoBlack,
    alignItems: 'center',
    shadowColor: COLORS.neoBlack,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 5,
  },
  playAgainButton: {
    backgroundColor: COLORS.success,
  },
  exitButton: {
    backgroundColor: COLORS.error,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.neoBlack,
    textTransform: 'uppercase',
  },
});
