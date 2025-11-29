// Game lobby screen - waiting room before game starts
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  FlatList,
  Share,
  Alert,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { useSocket, useSocketEvent, useGameSocket } from '../../src/contexts/SocketContext';
import { HapticsService } from '../../src/features/haptics/HapticsService';
import { COLORS, DIFFICULTIES, DEFAULT_DIFFICULTY, DEFAULT_TIMER_SECONDS } from '../../src/constants/game';
import { RoomChat } from '../../src/components/game/RoomChat';
import GameTypeSelector from '../../src/components/game/GameTypeSelector';

interface PlayerData {
  avatar?: { emoji: string; color: string };
  isHost: boolean;
}

interface Player extends PlayerData {
  username: string;
}

interface GameSettings {
  difficulty: string;
  timerSeconds: number;
  language: string;
}

export default function LobbyScreen() {
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code: string }>();
  const { t, language } = useLanguage();
  const { isConnected } = useSocket();
  const { startGame: emitStartGame } = useGameSocket();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [players, setPlayers] = useState<Player[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [username, setUsername] = useState('');
  const [roomName, setRoomName] = useState('');
  const [gameType, setGameType] = useState<'regular' | 'tournament'>('regular');
  const [tournamentRounds, setTournamentRounds] = useState(3);
  const [settings, setSettings] = useState<GameSettings>({
    difficulty: DEFAULT_DIFFICULTY,
    timerSeconds: DEFAULT_TIMER_SECONDS,
    language,
  });

  // Listen for player updates
  useSocketEvent('updateUsers', (data: { users: Record<string, PlayerData> }) => {
    const playerList = Object.entries(data.users).map(([username, player]) => ({
      username,
      ...player,
    }));
    setPlayers(playerList);
  });

  // Listen for room info (on join)
  useSocketEvent('joined', (data: { roomName: string; isHost: boolean; username: string; users: Record<string, PlayerData> }) => {
    setRoomName(data.roomName);
    setIsHost(data.isHost);
    setUsername(data.username);
    const playerList = Object.entries(data.users).map(([username, player]) => ({
      username,
      ...player,
    }));
    setPlayers(playerList);
  });

  // Listen for game start
  useSocketEvent('startGame', (data: { letterGrid: string[][] }) => {
    HapticsService.gameStart();
    router.replace({
      pathname: '/game/play',
      params: { code, grid: JSON.stringify(data.letterGrid) },
    });
  });

  // Listen for room closed
  useSocketEvent('hostLeftRoomClosing', () => {
    HapticsService.wordRejected();
    Alert.alert(t('lobby.roomClosed'), t('lobby.hostLeft'), [
      { text: 'OK', onPress: () => router.replace('/') },
    ]);
  });

  const handleStartGame = useCallback(async () => {
    if (!isHost) return;
    await HapticsService.buttonPress();

    // Generate letter grid based on difficulty
    const difficultyConfig = DIFFICULTIES[settings.difficulty];
    const letterGrid = generateRandomGrid(difficultyConfig.rows, difficultyConfig.cols, settings.language);

    emitStartGame({
      letterGrid,
      timerSeconds: settings.timerSeconds,
      language: settings.language,
      minWordLength: 2,
    });
  }, [isHost, settings, emitStartGame]);

  // Helper function to generate random grid
  const generateRandomGrid = (rows: number, cols: number, lang: string): string[][] => {
    // Hebrew letters distribution
    const hebrewLetters = 'אבגדהוזחטיכלמנסעפצקרשת';
    // English letters distribution
    const englishLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    const letters = lang === 'he' ? hebrewLetters : englishLetters;
    const grid: string[][] = [];

    for (let i = 0; i < rows; i++) {
      const row: string[] = [];
      for (let j = 0; j < cols; j++) {
        const randomIndex = Math.floor(Math.random() * letters.length);
        row.push(letters[randomIndex]);
      }
      grid.push(row);
    }

    return grid;
  };

  const handleShare = useCallback(async () => {
    await HapticsService.buttonPress();
    try {
      await Share.share({
        message: `${t('lobby.shareMessage')} ${code}\n\nlexiclash://join/${code}`,
        title: t('lobby.shareTitle'),
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  }, [code, t]);

  const handleLeave = useCallback(async () => {
    await HapticsService.buttonPress();
    emit('leaveRoom', { gameCode: code });
    router.replace('/');
  }, [code, emit, router]);

  const changeDifficulty = useCallback(async () => {
    if (!isHost) return;
    await HapticsService.buttonPress();
    const difficulties = Object.keys(DIFFICULTIES);
    const currentIndex = difficulties.indexOf(settings.difficulty);
    const nextIndex = (currentIndex + 1) % difficulties.length;
    setSettings((prev) => ({ ...prev, difficulty: difficulties[nextIndex] }));
  }, [isHost, settings.difficulty]);

  const renderPlayer = ({ item }: { item: Player }) => (
    <View style={[styles.playerCard, { backgroundColor: isDark ? '#2A2A2A' : '#FFFFFF' }]}>
      <Text style={styles.playerAvatar}>{item.avatar?.emoji || '👤'}</Text>
      <Text style={[styles.playerName, { color: isDark ? COLORS.neoCream : COLORS.neoBlack }]}>
        {item.username}
      </Text>
      {item.isHost && (
        <View style={styles.hostBadge}>
          <Text style={styles.hostBadgeText}>👑</Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? COLORS.neoBlack : COLORS.neoCream }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleLeave} style={styles.leaveButton}>
            <Text style={[styles.leaveText, { color: COLORS.error }]}>
              ← {t('lobby.leave')}
            </Text>
          </TouchableOpacity>
          <Text style={[styles.roomName, { color: isDark ? COLORS.neoCream : COLORS.neoBlack }]}>
            {roomName || t('lobby.waitingRoom')}
          </Text>
        </View>

        {/* Game Code */}
        <View style={styles.codeContainer}>
          <Text style={[styles.codeLabel, { color: isDark ? COLORS.neoCream : COLORS.neoBlack }]}>
            {t('lobby.gameCode')}
          </Text>
          <Text style={[styles.codeText, { color: COLORS.neoCyan }]}>{code}</Text>
          <TouchableOpacity onPress={handleShare} style={styles.shareButton}>
            <Text style={styles.shareButtonText}>{t('lobby.share')} 📤</Text>
          </TouchableOpacity>
        </View>

        {/* Game Type Selector (Host only) */}
        {isHost && (
          <View style={styles.gameTypeSelectorContainer}>
            <GameTypeSelector
              gameType={gameType}
              setGameType={setGameType}
              tournamentRounds={tournamentRounds}
              setTournamentRounds={setTournamentRounds}
            />
          </View>
        )}

        {/* Settings (Host only) */}
        {isHost && (
          <View style={styles.settingsContainer}>
            <TouchableOpacity onPress={changeDifficulty} style={styles.settingButton}>
              <Text style={[styles.settingLabel, { color: isDark ? COLORS.neoCream : COLORS.neoBlack }]}>
                {t('lobby.difficulty')}:
              </Text>
              <Text style={[styles.settingValue, { color: COLORS.neoYellow }]}>
                {t(DIFFICULTIES[settings.difficulty]?.nameKey || 'difficulty.hard')}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Players List */}
        <View style={styles.playersContainer}>
          <Text style={[styles.playersTitle, { color: isDark ? COLORS.neoCream : COLORS.neoBlack }]}>
            {t('lobby.players')} ({players.length})
          </Text>
          <FlatList
            data={players}
            renderItem={renderPlayer}
            keyExtractor={(item) => item.username}
            contentContainerStyle={styles.playersList}
            showsVerticalScrollIndicator={false}
            scrollEnabled={false}
            nestedScrollEnabled
          />
        </View>

        {/* Room Chat */}
        {username && code && (
          <View style={styles.chatContainer}>
            <RoomChat
              username={username}
              isHost={isHost}
              gameCode={code}
              maxHeight={200}
            />
          </View>
        )}
      </ScrollView>

      {/* Start Button (Host only) - Fixed at bottom */}
      {isHost && (
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.startButton,
              players.length < 1 && styles.buttonDisabled,
            ]}
            onPress={handleStartGame}
            disabled={players.length < 1}
            activeOpacity={0.8}
          >
            <Text style={styles.startButtonText}>{t('lobby.startGame')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Waiting message (Non-host) - Fixed at bottom */}
      {!isHost && (
        <View style={styles.waitingContainer}>
          <Text style={[styles.waitingText, { color: isDark ? COLORS.neoCream : COLORS.neoBlack }]}>
            {t('lobby.waitingForHost')}
          </Text>
        </View>
      )}
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
  scrollViewContent: {
    flexGrow: 1,
  },
  header: {
    padding: 20,
  },
  leaveButton: {
    marginBottom: 10,
  },
  leaveText: {
    fontSize: 16,
    fontWeight: '600',
  },
  roomName: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -1,
  },
  codeContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderColor: COLORS.neoBlack,
    marginHorizontal: 20,
  },
  codeLabel: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  codeText: {
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: 8,
    marginVertical: 10,
  },
  shareButton: {
    backgroundColor: COLORS.neoYellow,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.neoBlack,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.neoBlack,
  },
  gameTypeSelectorContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  settingsContainer: {
    padding: 20,
  },
  settingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  settingValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  playersContainer: {
    padding: 20,
  },
  playersTitle: {
    fontSize: 18,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 15,
  },
  playersList: {
    gap: 10,
  },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.neoBlack,
  },
  playerAvatar: {
    fontSize: 28,
    marginRight: 12,
  },
  playerName: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  hostBadge: {
    backgroundColor: COLORS.neoYellow,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  hostBadgeText: {
    fontSize: 14,
  },
  chatContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  buttonContainer: {
    padding: 20,
    backgroundColor: 'transparent',
  },
  startButton: {
    backgroundColor: COLORS.success,
    paddingVertical: 20,
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
  buttonDisabled: {
    opacity: 0.5,
  },
  startButtonText: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.neoBlack,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  waitingContainer: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  waitingText: {
    fontSize: 16,
    fontStyle: 'italic',
  },
});
