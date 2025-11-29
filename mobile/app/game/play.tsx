// Main gameplay screen with letter grid
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  useColorScheme,
  Dimensions,
  FlatList,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { useSocketEvent, useGameSocket } from '../../src/contexts/SocketContext';
import { HapticsService } from '../../src/features/haptics/HapticsService';
import { calculateWordScore } from '../../src/lib/gameLogic/scoringEngine';
import { COLORS, TIMER_WARNING_THRESHOLD } from '../../src/constants/game';
import GridComponent from '../../src/components/game/GridComponent';
import GameHeader from '../../src/components/game/GameHeader';
import { AchievementQueue } from '../../src/components/achievements/AchievementQueue';

const { width } = Dimensions.get('window');
const GRID_PADDING = 20;
const GRID_SIZE = width - GRID_PADDING * 2;

interface FoundWord {
  word: string;
  score: number;
  status: 'accepted' | 'rejected' | 'duplicate' | 'pending';
}

interface LeaderboardEntry {
  username: string;
  score: number;
  wordCount: number;
}

export default function PlayScreen() {
  const router = useRouter();
  const { code, grid: gridParam } = useLocalSearchParams<{ code: string; grid: string }>();
  const { t } = useLanguage();
  const { submitWord: emitSubmitWord } = useGameSocket();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [letterGrid, setLetterGrid] = useState<string[][]>([]);
  const [remainingTime, setRemainingTime] = useState(180);
  const [foundWords, setFoundWords] = useState<FoundWord[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [comboLevel, setComboLevel] = useState(0);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [currentWord, setCurrentWord] = useState('');
  const lastWordTime = useRef<number>(Date.now());

  // Timer animation
  const timerScale = useSharedValue(1);
  const timerColor = useSharedValue(COLORS.neoCyan);

  // Parse grid from params
  useEffect(() => {
    if (gridParam) {
      try {
        const parsed = JSON.parse(gridParam);
        setLetterGrid(parsed);
      } catch (e) {
        console.error('Failed to parse grid:', e);
      }
    }
  }, [gridParam]);

  // Listen for time updates
  useSocketEvent('timeUpdate', (data: { remainingTime: number }) => {
    setRemainingTime(data.remainingTime);

    // Warning animation at 20 seconds
    if (data.remainingTime <= TIMER_WARNING_THRESHOLD && data.remainingTime > 0) {
      if (data.remainingTime % 5 === 0) {
        HapticsService.timerWarning();
      }
      timerScale.value = withSequence(
        withTiming(1.1, { duration: 100 }),
        withTiming(1, { duration: 100 })
      );
    }
  });

  // Listen for word validation responses
  useSocketEvent('wordAccepted', (data: { word: string; score: number }) => {
    setFoundWords((prev) => [
      { word: data.word, score: data.score, status: 'accepted' },
      ...prev,
    ]);

    // Update combo
    const now = Date.now();
    const timeSinceLastWord = now - lastWordTime.current;
    if (timeSinceLastWord < 3000) {
      setComboLevel((prev) => Math.min(prev + 1, 10));
      HapticsService.combo(comboLevel + 1);
    } else {
      setComboLevel(1);
    }
    lastWordTime.current = now;

    HapticsService.wordAccepted();
  });

  useSocketEvent('wordRejected', (data: { word: string; reason: string }) => {
    setFoundWords((prev) => [
      { word: data.word, score: 0, status: 'rejected' },
      ...prev,
    ]);
    setComboLevel(0);
    HapticsService.wordRejected();
  });

  useSocketEvent('wordAlreadyFound', (data: { word: string }) => {
    setFoundWords((prev) => [
      { word: data.word, score: 0, status: 'duplicate' },
      ...prev,
    ]);
    HapticsService.wordDuplicate();
  });

  // Listen for leaderboard updates
  useSocketEvent('updateLeaderboard', (data: { leaderboard: LeaderboardEntry[] }) => {
    setLeaderboard(data.leaderboard);
  });

  // Listen for live achievement unlocks
  useSocketEvent('liveAchievementUnlocked', (data: { achievements: any[] }) => {
    setAchievements((prev) => [...prev, ...data.achievements]);
    HapticsService.achievementUnlocked();
  });

  // Listen for game end
  useSocketEvent('endGame', () => {
    HapticsService.gameEnd();
    router.replace({
      pathname: '/game/results',
      params: { code },
    });
  });

  // Handle word submission from grid
  const handleWordSubmit = useCallback(
    (word: string) => {
      if (word.length < 2) return;

      // Add as pending
      setFoundWords((prev) => [
        { word, score: calculateWordScore(word, comboLevel), status: 'pending' },
        ...prev,
      ]);

      HapticsService.wordSubmit();
      emitSubmitWord(word, comboLevel);
    },
    [emitSubmitWord, comboLevel]
  );

  // Handle word selection (for display)
  const handleWordChange = useCallback((word: string) => {
    setCurrentWord(word);
  }, []);

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Timer animated style
  const timerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: timerScale.value }],
  }));

  const isUrgent = remainingTime <= TIMER_WARNING_THRESHOLD;

  const renderWord = ({ item }: { item: FoundWord }) => (
    <View
      style={[
        styles.wordItem,
        item.status === 'accepted' && styles.wordAccepted,
        item.status === 'rejected' && styles.wordRejected,
        item.status === 'duplicate' && styles.wordDuplicate,
        item.status === 'pending' && styles.wordPending,
      ]}
    >
      <Text style={styles.wordText}>{item.word}</Text>
      {item.status === 'accepted' && (
        <Text style={styles.wordScore}>+{item.score}</Text>
      )}
    </View>
  );

  const totalScore = foundWords
    .filter((w) => w.status === 'accepted')
    .reduce((sum, w) => sum + w.score, 0);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? COLORS.neoBlack : COLORS.neoCream }]}>
      {/* Game Header with Timer */}
      <GameHeader
        remainingTime={remainingTime}
        totalScore={totalScore}
        comboLevel={comboLevel}
        currentWord={currentWord}
      />

      {/* Letter Grid */}
      <View style={styles.gridContainer}>
        {letterGrid.length > 0 && (
          <GridComponent
            grid={letterGrid}
            onWordSubmit={handleWordSubmit}
            onWordChange={handleWordChange}
            comboLevel={comboLevel}
            interactive={true}
            playerView={true}
          />
        )}
      </View>

      {/* Found Words */}
      <View style={styles.wordsContainer}>
        <Text style={[styles.wordsTitle, { color: isDark ? COLORS.neoCream : COLORS.neoBlack }]}>
          {t('game.foundWords')} ({foundWords.filter(w => w.status === 'accepted').length})
        </Text>
        <FlatList
          data={foundWords}
          renderItem={renderWord}
          keyExtractor={(item, index) => `${item.word}-${index}`}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.wordsList}
        />
      </View>

      {/* Achievement Queue */}
      <AchievementQueue achievements={achievements} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  timerContainer: {
    alignItems: 'center',
    paddingVertical: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 15,
  },
  timerText: {
    fontSize: 48,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  comboBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: COLORS.neoBlack,
  },
  comboText: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.neoBlack,
  },
  gridContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: GRID_PADDING,
  },
  wordsContainer: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderTopWidth: 2,
    borderColor: COLORS.neoBlack,
  },
  wordsTitle: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  wordsList: {
    gap: 8,
  },
  wordItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.neoBlack,
    gap: 6,
  },
  wordAccepted: {
    backgroundColor: COLORS.success,
  },
  wordRejected: {
    backgroundColor: COLORS.error,
  },
  wordDuplicate: {
    backgroundColor: COLORS.warning,
  },
  wordPending: {
    backgroundColor: '#888',
  },
  wordText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.neoBlack,
  },
  wordScore: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.neoBlack,
  },
});
