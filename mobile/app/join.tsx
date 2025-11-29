// Join/Host game screen
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '../src/contexts/LanguageContext';
import { useSocket, useSocketEvent, useSocketEmit } from '../src/contexts/SocketContext';
import { HapticsService } from '../src/features/haptics/HapticsService';
import { COLORS } from '../src/constants/game';

// Generate a random 4-digit game code
const generateGameCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export default function JoinScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string; code?: string }>();
  const isHostMode = params.mode === 'host';

  const { t, language } = useLanguage();
  const { isConnected } = useSocket();
  const emit = useSocketEmit();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [gameCode, setGameCode] = useState(params.code || '');
  const [username, setUsername] = useState('');
  const [roomName, setRoomName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Handle successful join
  useSocketEvent('joined', (data: { gameCode: string; isHost: boolean }) => {
    setIsLoading(false);
    HapticsService.wordAccepted();
    router.replace(`/game/${data.gameCode}`);
  });

  // Handle join error
  useSocketEvent('joinError', (data: { message: string }) => {
    setIsLoading(false);
    HapticsService.wordRejected();
    Alert.alert(t('join.error'), data.message);
  });

  // Handle room created
  useSocketEvent('roomCreated', (data: { gameCode: string }) => {
    setIsLoading(false);
    HapticsService.wordAccepted();
    router.replace(`/game/${data.gameCode}`);
  });

  const handleJoin = useCallback(async () => {
    if (!username.trim()) {
      Alert.alert(t('join.error'), t('join.enterUsername'));
      return;
    }
    if (!gameCode.trim() || gameCode.length !== 4) {
      Alert.alert(t('join.error'), t('join.enterValidCode'));
      return;
    }

    await HapticsService.buttonPress();
    setIsLoading(true);

    emit('join', {
      gameCode: gameCode.toUpperCase(),
      username: username.trim(),
    });
  }, [gameCode, username, emit, t]);

  const handleHost = useCallback(async () => {
    if (!username.trim()) {
      Alert.alert(t('join.error'), t('join.enterUsername'));
      return;
    }

    await HapticsService.buttonPress();
    setIsLoading(true);

    const newCode = generateGameCode();
    emit('createGame', {
      gameCode: newCode,
      roomName: roomName.trim() || `${username}'s Game`,
      language,
      hostUsername: username.trim(),
    });
  }, [username, roomName, language, emit, t]);

  const handleBack = async () => {
    await HapticsService.buttonPress();
    router.back();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? COLORS.neoBlack : COLORS.neoCream }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Text style={[styles.backText, { color: isDark ? COLORS.neoCream : COLORS.neoBlack }]}>
              ← {t('common.back')}
            </Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: isDark ? COLORS.neoCream : COLORS.neoBlack }]}>
            {isHostMode ? t('join.hostTitle') : t('join.joinTitle')}
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Username */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: isDark ? COLORS.neoCream : COLORS.neoBlack }]}>
              {t('join.username')}
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: isDark ? '#2A2A2A' : '#FFFFFF',
                  color: isDark ? COLORS.neoCream : COLORS.neoBlack,
                },
              ]}
              placeholder={t('join.usernamePlaceholder')}
              placeholderTextColor={isDark ? '#666' : '#999'}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={20}
            />
          </View>

          {/* Game Code (Join mode) */}
          {!isHostMode && (
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: isDark ? COLORS.neoCream : COLORS.neoBlack }]}>
                {t('join.gameCode')}
              </Text>
              <TextInput
                style={[
                  styles.input,
                  styles.codeInput,
                  {
                    backgroundColor: isDark ? '#2A2A2A' : '#FFFFFF',
                    color: isDark ? COLORS.neoCream : COLORS.neoBlack,
                  },
                ]}
                placeholder="ABCD"
                placeholderTextColor={isDark ? '#666' : '#999'}
                value={gameCode}
                onChangeText={(text) => setGameCode(text.toUpperCase())}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={4}
                keyboardType="default"
              />
            </View>
          )}

          {/* Room Name (Host mode) */}
          {isHostMode && (
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: isDark ? COLORS.neoCream : COLORS.neoBlack }]}>
                {t('join.roomName')}
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? '#2A2A2A' : '#FFFFFF',
                    color: isDark ? COLORS.neoCream : COLORS.neoBlack,
                  },
                ]}
                placeholder={t('join.roomNamePlaceholder')}
                placeholderTextColor={isDark ? '#666' : '#999'}
                value={roomName}
                onChangeText={setRoomName}
                maxLength={30}
              />
            </View>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              { backgroundColor: isHostMode ? COLORS.neoPink : COLORS.neoCyan },
              (!isConnected || isLoading) && styles.buttonDisabled,
            ]}
            onPress={isHostMode ? handleHost : handleJoin}
            disabled={!isConnected || isLoading}
            activeOpacity={0.8}
          >
            <Text style={styles.submitButtonText}>
              {isLoading
                ? t('common.loading')
                : isHostMode
                ? t('join.createRoom')
                : t('join.joinRoom')}
            </Text>
          </TouchableOpacity>

          {/* Connection Status */}
          {!isConnected && (
            <Text style={styles.connectionWarning}>
              {t('join.notConnected')}
            </Text>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    padding: 20,
  },
  backButton: {
    marginBottom: 20,
  },
  backText: {
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
  },
  form: {
    flex: 1,
    padding: 20,
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    borderWidth: 3,
    borderColor: COLORS.neoBlack,
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    fontWeight: '600',
  },
  codeInput: {
    fontSize: 32,
    textAlign: 'center',
    letterSpacing: 8,
    fontWeight: '900',
  },
  submitButton: {
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: COLORS.neoBlack,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: COLORS.neoBlack,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 5,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.neoBlack,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  connectionWarning: {
    color: COLORS.error,
    textAlign: 'center',
    marginTop: 10,
    fontSize: 14,
  },
});
