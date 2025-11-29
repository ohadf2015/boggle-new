// Offline practice mode screen
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  Alert,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useLanguage } from '../src/contexts/LanguageContext';
import { HapticsService } from '../src/features/haptics/HapticsService';
import { DictionaryService } from '../src/features/offline/DictionaryService';
import { OfflineGameService } from '../src/features/offline/OfflineGameService';
import LetterGrid from '../src/components/game/LetterGrid';
import { COLORS, DIFFICULTIES, SupportedLanguage, DEFAULT_TIMER_SECONDS } from '../src/constants/game';

type GamePhase = 'setup' | 'playing' | 'results';

interface FoundWord {
  word: string;
  score: number;
  status: 'valid' | 'invalid' | 'duplicate' | 'not_on_board';
}

export default function PracticeScreen() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [phase, setPhase] = useState<GamePhase>('setup');
  const [selectedDifficulty, setSelectedDifficulty] = useState<keyof typeof DIFFICULTIES>('HARD');
  const [timerSeconds, setTimerSeconds] = useState(DEFAULT_TIMER_SECONDS);
  const [isDictionaryReady, setIsDictionaryReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Game state
  const [letterGrid, setLetterGrid] = useState<string[][]>([]);
  const [remainingTime, setRemainingTime] = useState(0);
  const [foundWords, setFoundWords] = useState<FoundWord[]>([]);
  const [score, setScore] = useState(0);
  const [comboLevel, setComboLevel] = useState(0);

  // Check if dictionary is available
  useEffect(() => {
    const checkDictionary = async () => {
      const isDownloaded = await DictionaryService.isDictionaryDownloaded(language);
      setIsDictionaryReady(isDownloaded);
    };
    checkDictionary();
  }, [language]);

  // Handle word submission
  const handleWordSubmit = useCallback(async (word: string) => {
    const result = OfflineGameService.submitWord(word);

    let status: FoundWord['status'] = 'valid';
    if (result.isDuplicate) status = 'duplicate';
    else if (!result.isOnBoard) status = 'not_on_board';
    else if (!result.isValid) status = 'invalid';

    setFoundWords((prev) => [
      { word: result.word, score: result.score, status },
      ...prev,
    ]);

    if (result.isValid) {
      setScore((prev) => prev + result.score);
      setComboLevel(result.comboLevel);
      await HapticsService.wordAccepted();
      if (result.comboLevel > 1) {
        await HapticsService.combo(result.comboLevel);
      }
    } else if (result.isDuplicate) {
      await HapticsService.wordDuplicate();
    } else {
      await HapticsService.wordRejected();
      setComboLevel(0);
    }
  }, []);

  // Start game
  const handleStartGame = useCallback(async () => {
    if (!isDictionaryReady) {
      Alert.alert(
        t('practice.dictionaryRequired'),
        t('practice.downloadDictionary'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('practice.goToSettings'), onPress: () => router.push('/settings' as any) },
        ]
      );
      return;
    }

    setIsLoading(true);
    await HapticsService.gameStart();

    const gameState = await OfflineGameService.startGame(
      language,
      selectedDifficulty,
      timerSeconds,
      (remaining) => setRemainingTime(remaining),
      () => {
        HapticsService.gameEnd();
        setPhase('results');
      }
    );

    if (gameState) {
      setLetterGrid(gameState.letterGrid);
      setRemainingTime(gameState.remainingTime);
      setFoundWords([]);
      setScore(0);
      setComboLevel(0);
      setPhase('playing');
    } else {
      Alert.alert(t('practice.error'), t('practice.failedToStart'));
    }

    setIsLoading(false);
  }, [isDictionaryReady, language, selectedDifficulty, timerSeconds, t, router]);

  // End game early
  const handleEndGame = useCallback(() => {
    OfflineGameService.endGame();
    setPhase('results');
  }, []);

  // Play again
  const handlePlayAgain = useCallback(() => {
    setPhase('setup');
  }, []);

  // Format time
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Render word item
  const renderWord = ({ item }: { item: FoundWord }) => (
    <View
      style={[
        styles.wordItem,
        item.status === 'valid' && styles.wordValid,
        item.status === 'invalid' && styles.wordInvalid,
        item.status === 'duplicate' && styles.wordDuplicate,
        item.status === 'not_on_board' && styles.wordNotOnBoard,
      ]}
    >
      <Text style={styles.wordText}>{item.word}</Text>
      {item.status === 'valid' && <Text style={styles.wordScore}>+{item.score}</Text>}
    </View>
  );

  // Setup phase
  if (phase === 'setup') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? COLORS.neoBlack : COLORS.neoCream }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={[styles.backText, { color: isDark ? COLORS.neoCream : COLORS.neoBlack }]}>
              ← {t('common.back')}
            </Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: isDark ? COLORS.neoCream : COLORS.neoBlack }]}>
            {t('practice.title')}
          </Text>
        </View>

        <View style={styles.setupContainer}>
          {/* Dictionary Status */}
          <View style={[styles.statusCard, { backgroundColor: isDictionaryReady ? COLORS.success : COLORS.warning }]}>
            <Text style={styles.statusIcon}>{isDictionaryReady ? '✓' : '⚠️'}</Text>
            <Text style={styles.statusText}>
              {isDictionaryReady ? t('practice.dictionaryReady') : t('practice.dictionaryNotDownloaded')}
            </Text>
          </View>

          {/* Difficulty Selection */}
          <Text style={[styles.sectionTitle, { color: isDark ? COLORS.neoCream : COLORS.neoBlack }]}>
            {t('practice.difficulty')}
          </Text>
          <View style={styles.difficultyGrid}>
            {Object.keys(DIFFICULTIES).map((diff) => (
              <TouchableOpacity
                key={diff}
                style={[
                  styles.difficultyButton,
                  selectedDifficulty === diff && styles.difficultySelected,
                ]}
                onPress={() => setSelectedDifficulty(diff as keyof typeof DIFFICULTIES)}
              >
                <Text style={styles.difficultyText}>{t(DIFFICULTIES[diff as keyof typeof DIFFICULTIES].nameKey)}</Text>
                <Text style={styles.difficultySize}>
                  {DIFFICULTIES[diff as keyof typeof DIFFICULTIES].rows}x{DIFFICULTIES[diff as keyof typeof DIFFICULTIES].cols}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Timer Selection */}
          <Text style={[styles.sectionTitle, { color: isDark ? COLORS.neoCream : COLORS.neoBlack }]}>
            {t('practice.timer')}
          </Text>
          <View style={styles.timerOptions}>
            {[60, 120, 180, 300].map((secs) => (
              <TouchableOpacity
                key={secs}
                style={[
                  styles.timerButton,
                  timerSeconds === secs && styles.timerSelected,
                ]}
                onPress={() => setTimerSeconds(secs)}
              >
                <Text style={styles.timerText}>{secs / 60}m</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Start Button */}
          <TouchableOpacity
            style={[styles.startButton, !isDictionaryReady && styles.buttonDisabled]}
            onPress={handleStartGame}
            disabled={!isDictionaryReady || isLoading}
          >
            <Text style={styles.startButtonText}>
              {isLoading ? t('common.loading') : t('practice.start')}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Playing phase
  if (phase === 'playing') {
    const isUrgent = remainingTime <= 20;

    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? COLORS.neoBlack : COLORS.neoCream }]}>
        {/* Timer */}
        <View style={styles.timerContainer}>
          <Text style={[styles.timerDisplay, { color: isUrgent ? COLORS.error : COLORS.neoCyan }]}>
            {formatTime(remainingTime)}
          </Text>
          <View style={styles.scoreContainer}>
            <Text style={[styles.scoreLabel, { color: isDark ? COLORS.neoCream : COLORS.neoBlack }]}>
              {t('game.score')}
            </Text>
            <Text style={[styles.scoreValue, { color: COLORS.neoYellow }]}>{score}</Text>
          </View>
          {comboLevel > 0 && (
            <View style={[styles.comboBadge, { backgroundColor: COLORS.neoOrange }]}>
              <Text style={styles.comboText}>🔥 x{comboLevel}</Text>
            </View>
          )}
        </View>

        {/* Grid */}
        <View style={styles.gridContainer}>
          <LetterGrid
            grid={letterGrid}
            size={300}
            onWordSubmit={handleWordSubmit}
            comboLevel={comboLevel}
          />
        </View>

        {/* Found Words */}
        <View style={styles.wordsContainer}>
          <Text style={[styles.wordsTitle, { color: isDark ? COLORS.neoCream : COLORS.neoBlack }]}>
            {t('game.foundWords')} ({foundWords.filter((w) => w.status === 'valid').length})
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

        {/* End Game Button */}
        <TouchableOpacity style={styles.endButton} onPress={handleEndGame}>
          <Text style={styles.endButtonText}>{t('practice.endEarly')}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Results phase
  const stats = OfflineGameService.getGameStats();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? COLORS.neoBlack : COLORS.neoCream }]}>
      <View style={styles.resultsContainer}>
        <Text style={[styles.resultsTitle, { color: isDark ? COLORS.neoCream : COLORS.neoBlack }]}>
          {t('practice.gameOver')}
        </Text>

        <View style={styles.statsCard}>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>{t('results.score')}</Text>
            <Text style={styles.statValue}>{stats?.totalScore || 0}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>{t('results.words')}</Text>
            <Text style={styles.statValue}>{stats?.wordCount || 0}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>{t('practice.longestWord')}</Text>
            <Text style={styles.statValue}>{stats?.longestWord || '-'}</Text>
          </View>
        </View>

        <View style={styles.resultsActions}>
          <TouchableOpacity style={styles.playAgainButton} onPress={handlePlayAgain}>
            <Text style={styles.playAgainText}>{t('results.playAgain')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.exitButton} onPress={() => router.replace('/')}>
            <Text style={styles.exitText}>{t('results.exit')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20 },
  backButton: { marginBottom: 10 },
  backText: { fontSize: 16, fontWeight: '600' },
  title: { fontSize: 32, fontWeight: '900' },
  setupContainer: { flex: 1, padding: 20 },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    marginBottom: 25,
  },
  statusIcon: { fontSize: 20, marginRight: 10 },
  statusText: { fontSize: 16, fontWeight: '700', color: COLORS.neoBlack },
  sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 12 },
  difficultyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 25 },
  difficultyButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.neoBlack,
    backgroundColor: '#DDD',
  },
  difficultySelected: { backgroundColor: COLORS.neoCyan },
  difficultyText: { fontSize: 14, fontWeight: '700', color: COLORS.neoBlack },
  difficultySize: { fontSize: 12, color: COLORS.neoBlack, opacity: 0.7 },
  timerOptions: { flexDirection: 'row', gap: 10, marginBottom: 30 },
  timerButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.neoBlack,
    backgroundColor: '#DDD',
    alignItems: 'center',
  },
  timerSelected: { backgroundColor: COLORS.neoYellow },
  timerText: { fontSize: 18, fontWeight: '800', color: COLORS.neoBlack },
  startButton: {
    backgroundColor: COLORS.success,
    paddingVertical: 18,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: COLORS.neoBlack,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  startButtonText: { fontSize: 20, fontWeight: '900', color: COLORS.neoBlack },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    gap: 15,
  },
  timerDisplay: { fontSize: 48, fontWeight: '900' },
  scoreContainer: { alignItems: 'center' },
  scoreLabel: { fontSize: 12, fontWeight: '600' },
  scoreValue: { fontSize: 24, fontWeight: '900' },
  comboBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: COLORS.neoBlack,
  },
  comboText: { fontSize: 16, fontWeight: '800', color: COLORS.neoBlack },
  gridContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  wordsContainer: { padding: 15, borderTopWidth: 2, borderColor: COLORS.neoBlack },
  wordsTitle: { fontSize: 14, fontWeight: '700', marginBottom: 10 },
  wordsList: { gap: 8 },
  wordItem: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.neoBlack,
    gap: 6,
  },
  wordValid: { backgroundColor: COLORS.success },
  wordInvalid: { backgroundColor: COLORS.error },
  wordDuplicate: { backgroundColor: COLORS.warning },
  wordNotOnBoard: { backgroundColor: '#888' },
  wordText: { fontSize: 16, fontWeight: '700', color: COLORS.neoBlack },
  wordScore: { fontSize: 14, fontWeight: '800', color: COLORS.neoBlack },
  endButton: {
    margin: 15,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORS.error,
    alignItems: 'center',
  },
  endButtonText: { fontSize: 16, fontWeight: '700', color: COLORS.neoCream },
  resultsContainer: { flex: 1, padding: 20, justifyContent: 'center' },
  resultsTitle: { fontSize: 36, fontWeight: '900', textAlign: 'center', marginBottom: 30 },
  statsCard: {
    backgroundColor: COLORS.neoYellow,
    borderRadius: 16,
    padding: 25,
    borderWidth: 3,
    borderColor: COLORS.neoBlack,
    marginBottom: 30,
  },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  statLabel: { fontSize: 18, fontWeight: '700', color: COLORS.neoBlack },
  statValue: { fontSize: 24, fontWeight: '900', color: COLORS.neoBlack },
  resultsActions: { flexDirection: 'row', gap: 15 },
  playAgainButton: {
    flex: 1,
    paddingVertical: 16,
    backgroundColor: COLORS.success,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: COLORS.neoBlack,
    alignItems: 'center',
  },
  playAgainText: { fontSize: 16, fontWeight: '800', color: COLORS.neoBlack },
  exitButton: {
    flex: 1,
    paddingVertical: 16,
    backgroundColor: COLORS.error,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: COLORS.neoBlack,
    alignItems: 'center',
  },
  exitText: { fontSize: 16, fontWeight: '800', color: COLORS.neoBlack },
});
