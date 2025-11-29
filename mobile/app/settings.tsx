// Settings screen for dictionaries, audio, and preferences
// Enhanced with audio controls, haptic feedback, and cache management
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  ScrollView,
  Switch,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';
import { useLanguage } from '../src/contexts/LanguageContext';
import { useAudio } from '../src/features/audio/AudioContext';
import { HapticsService } from '../src/features/haptics/HapticsService';
import { DictionaryService } from '../src/features/offline/DictionaryService';
import { COLORS, SupportedLanguage } from '../src/constants/game';
import { Card, CardContent, CardHeader, CardTitle } from '../src/components/ui/Card';
import { Button } from '../src/components/ui/Button';
import { Badge } from '../src/components/ui/Badge';

interface DictionaryStatus {
  language: SupportedLanguage;
  isDownloaded: boolean;
  isDownloading: boolean;
  downloadProgress: number;
  size: string;
}

const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  en: 'English',
  he: 'עברית',
  sv: 'Svenska',
  ja: '日本語',
};

const LANGUAGE_FLAGS: Record<SupportedLanguage, string> = {
  en: '🇺🇸',
  he: '🇮🇱',
  sv: '🇸🇪',
  ja: '🇯🇵',
};

export default function SettingsScreen() {
  const router = useRouter();
  const { t, language, setLanguage, isRTL } = useLanguage();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Audio context
  const {
    musicVolume,
    sfxVolume,
    isMusicMuted,
    isSfxMuted,
    setMusicVolume,
    setSfxVolume,
    toggleMusicMute,
    toggleSfxMute,
  } = useAudio();

  const [dictionaries, setDictionaries] = useState<DictionaryStatus[]>([]);
  const [isLoadingDicts, setIsLoadingDicts] = useState(true);
  const [isHapticsEnabled, setIsHapticsEnabled] = useState(true);
  const [cacheSize, setCacheSize] = useState<string>('0 MB');

  // Load dictionary statuses
  const loadDictionaryStatus = useCallback(async () => {
    setIsLoadingDicts(true);
    try {
      await DictionaryService.initialize();
      const statuses = await DictionaryService.getAllDictionaryStatus();
      setDictionaries(statuses);
    } catch (error) {
      console.error('[Settings] Failed to load dictionary status:', error);
    }
    setIsLoadingDicts(false);
  }, []);

  // Calculate cache size
  const calculateCacheSize = useCallback(async () => {
    try {
      // This is an approximation - actual cache size calculation would require
      // enumerating all AsyncStorage keys and calculating their sizes
      const keys = await AsyncStorage.getAllKeys();
      let totalSize = 0;

      for (const key of keys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          totalSize += new Blob([value]).size;
        }
      }

      const sizeInMB = (totalSize / (1024 * 1024)).toFixed(2);
      setCacheSize(`${sizeInMB} MB`);
    } catch (error) {
      console.error('[Settings] Failed to calculate cache size:', error);
      setCacheSize('N/A');
    }
  }, []);

  // Load haptics preference
  const loadHapticsPreference = useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem('lexiclash_haptics_enabled');
      if (saved !== null) {
        setIsHapticsEnabled(JSON.parse(saved));
      }
    } catch (error) {
      console.error('[Settings] Failed to load haptics preference:', error);
    }
  }, []);

  useEffect(() => {
    loadDictionaryStatus();
    calculateCacheSize();
    loadHapticsPreference();
  }, [loadDictionaryStatus, calculateCacheSize, loadHapticsPreference]);

  // Save haptics preference
  useEffect(() => {
    const saveHapticsPreference = async () => {
      try {
        await AsyncStorage.setItem('lexiclash_haptics_enabled', JSON.stringify(isHapticsEnabled));
        HapticsService.setEnabled(isHapticsEnabled);
      } catch (error) {
        console.error('[Settings] Failed to save haptics preference:', error);
      }
    };
    saveHapticsPreference();
  }, [isHapticsEnabled]);

  // Download dictionary
  const handleDownloadDictionary = async (lang: SupportedLanguage) => {
    await HapticsService.buttonPress();

    // Update UI to show downloading
    setDictionaries((prev) =>
      prev.map((d) => (d.language === lang ? { ...d, isDownloading: true, downloadProgress: 0 } : d))
    );

    const success = await DictionaryService.downloadDictionary(lang, (progress) => {
      setDictionaries((prev) =>
        prev.map((d) => (d.language === lang ? { ...d, downloadProgress: progress } : d))
      );
    });

    if (success) {
      await HapticsService.wordAccepted();
    } else {
      await HapticsService.wordRejected();
      Alert.alert(t('settings.downloadFailed'), t('settings.tryAgain'));
    }

    await loadDictionaryStatus();
  };

  // Delete dictionary
  const handleDeleteDictionary = (lang: SupportedLanguage) => {
    Alert.alert(
      t('settings.deleteDictionary'),
      t('settings.deleteConfirm', { language: LANGUAGE_NAMES[lang] }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            await HapticsService.buttonPress();
            await DictionaryService.deleteDictionary(lang);
            await loadDictionaryStatus();
          },
        },
      ]
    );
  };

  // Change app language
  const handleLanguageChange = async (lang: SupportedLanguage) => {
    await HapticsService.buttonPress();
    await setLanguage(lang);
  };

  // Clear cache
  const handleClearCache = () => {
    Alert.alert(
      t('settings.clearCache') || 'Clear Cache',
      t('settings.clearCacheConfirm') || 'This will clear all cached data including game sessions. Continue?',
      [
        { text: t('common.cancel') || 'Cancel', style: 'cancel' },
        {
          text: t('common.clear') || 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await HapticsService.buttonPress();
              // Clear all AsyncStorage except user profile and settings
              const keys = await AsyncStorage.getAllKeys();
              const keysToKeep = [
                'lexiclash_player_profile',
                'lexiclash_audio_settings',
                'lexiclash_haptics_enabled',
                'boggle_language',
              ];
              const keysToRemove = keys.filter((key) => !keysToKeep.includes(key));
              await AsyncStorage.multiRemove(keysToRemove);
              await calculateCacheSize();
              Alert.alert(
                t('settings.cacheCleared') || 'Cache Cleared',
                t('settings.cacheClearedMessage') || 'All cached data has been cleared.'
              );
            } catch (error) {
              console.error('[Settings] Failed to clear cache:', error);
              Alert.alert(t('common.error') || 'Error', t('settings.clearCacheError') || 'Failed to clear cache');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? COLORS.neoBlack : COLORS.neoCream }]}>
      <ScrollView>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={[styles.backText, { color: isDark ? COLORS.neoCream : COLORS.neoBlack }]}>
              ← {t('common.back')}
            </Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: isDark ? COLORS.neoCream : COLORS.neoBlack }]}>
            {t('settings.title')}
          </Text>
        </View>

        {/* App Language */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: isDark ? COLORS.neoCream : COLORS.neoBlack }]}>
            {t('settings.appLanguage')}
          </Text>
          <View style={styles.languageGrid}>
            {(['en', 'he', 'sv', 'ja'] as SupportedLanguage[]).map((lang) => (
              <TouchableOpacity
                key={lang}
                style={[
                  styles.languageButton,
                  language === lang && styles.languageSelected,
                  { borderColor: COLORS.neoBlack },
                ]}
                onPress={() => handleLanguageChange(lang)}
              >
                <Text style={styles.languageFlag}>{LANGUAGE_FLAGS[lang]}</Text>
                <Text style={styles.languageName}>{LANGUAGE_NAMES[lang]}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Offline Dictionaries */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: isDark ? COLORS.neoCream : COLORS.neoBlack }]}>
            {t('settings.offlineDictionaries')}
          </Text>
          <Text style={[styles.sectionSubtitle, { color: isDark ? '#888' : '#666' }]}>
            {t('settings.dictionaryDescription')}
          </Text>

          {isLoadingDicts ? (
            <ActivityIndicator size="large" color={COLORS.neoCyan} />
          ) : (
            <View style={styles.dictionaryList}>
              {dictionaries.map((dict) => (
                <View
                  key={dict.language}
                  style={[styles.dictionaryCard, { backgroundColor: isDark ? '#2A2A2A' : '#FFFFFF' }]}
                >
                  <View style={styles.dictionaryInfo}>
                    <Text style={styles.dictionaryFlag}>{LANGUAGE_FLAGS[dict.language]}</Text>
                    <View style={styles.dictionaryText}>
                      <Text style={[styles.dictionaryName, { color: isDark ? COLORS.neoCream : COLORS.neoBlack }]}>
                        {LANGUAGE_NAMES[dict.language]}
                      </Text>
                      <Text style={[styles.dictionarySize, { color: isDark ? '#888' : '#666' }]}>
                        {dict.size}
                      </Text>
                    </View>
                  </View>

                  {dict.isDownloading ? (
                    <View style={styles.progressContainer}>
                      <View
                        style={[
                          styles.progressBar,
                          { width: `${dict.downloadProgress * 100}%`, backgroundColor: COLORS.neoCyan },
                        ]}
                      />
                      <Text style={styles.progressText}>
                        {Math.round(dict.downloadProgress * 100)}%
                      </Text>
                    </View>
                  ) : dict.isDownloaded ? (
                    <View style={styles.dictionaryActions}>
                      <View style={[styles.downloadedBadge, { backgroundColor: COLORS.success }]}>
                        <Text style={styles.downloadedText}>✓</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => handleDeleteDictionary(dict.language)}
                      >
                        <Text style={styles.deleteText}>🗑️</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[styles.downloadButton, { backgroundColor: COLORS.neoCyan }]}
                      onPress={() => handleDownloadDictionary(dict.language)}
                    >
                      <Text style={styles.downloadText}>{t('settings.download')}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Audio Settings */}
        <View style={styles.section}>
          <Card>
            <CardHeader>
              <CardTitle>🎵 {t('settings.audio')}</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Music */}
              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>{t('settings.music')}</Text>
                <Switch
                  value={!isMusicMuted}
                  onValueChange={toggleMusicMute}
                  trackColor={{ false: '#767577', true: COLORS.neoCyan }}
                />
              </View>

              {!isMusicMuted && (
                <View style={styles.sliderRow}>
                  <Text style={styles.sliderLabel}>{t('settings.musicVolume')}</Text>
                  <View style={styles.sliderContainer}>
                    <Text style={styles.volumeIcon}>🔈</Text>
                    <Slider
                      style={styles.slider}
                      minimumValue={0}
                      maximumValue={1}
                      value={musicVolume}
                      onValueChange={setMusicVolume}
                      minimumTrackTintColor={COLORS.neoCyan}
                      maximumTrackTintColor={isDark ? '#444' : '#DDD'}
                      thumbTintColor={COLORS.neoCyan}
                    />
                    <Text style={styles.volumeIcon}>🔊</Text>
                    <Badge variant="cyan">{Math.round(musicVolume * 100)}%</Badge>
                  </View>
                </View>
              )}

              {/* Sound Effects */}
              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>{t('settings.soundEffects')}</Text>
                <Switch
                  value={!isSfxMuted}
                  onValueChange={toggleSfxMute}
                  trackColor={{ false: '#767577', true: COLORS.neoCyan }}
                />
              </View>

              {!isSfxMuted && (
                <View style={styles.sliderRow}>
                  <Text style={styles.sliderLabel}>{t('settings.sfxVolume')}</Text>
                  <View style={styles.sliderContainer}>
                    <Text style={styles.volumeIcon}>🔈</Text>
                    <Slider
                      style={styles.slider}
                      minimumValue={0}
                      maximumValue={1}
                      value={sfxVolume}
                      onValueChange={setSfxVolume}
                      minimumTrackTintColor={COLORS.neoCyan}
                      maximumTrackTintColor={isDark ? '#444' : '#DDD'}
                      thumbTintColor={COLORS.neoCyan}
                    />
                    <Text style={styles.volumeIcon}>🔊</Text>
                    <Badge variant="cyan">{Math.round(sfxVolume * 100)}%</Badge>
                  </View>
                </View>
              )}
            </CardContent>
          </Card>
        </View>

        {/* Haptic Feedback */}
        <View style={styles.section}>
          <Card>
            <CardHeader>
              <CardTitle>📳 {t('settings.hapticFeedback')}</CardTitle>
            </CardHeader>
            <CardContent>
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>{t('settings.haptics')}</Text>
                  <Text style={styles.settingDescription}>
                    {t('settings.hapticsDescription') || 'Vibration feedback for interactions'}
                  </Text>
                </View>
                <Switch
                  value={isHapticsEnabled}
                  onValueChange={setIsHapticsEnabled}
                  trackColor={{ false: '#767577', true: COLORS.neoCyan }}
                />
              </View>
            </CardContent>
          </Card>
        </View>

        {/* Cache Management */}
        <View style={styles.section}>
          <Card>
            <CardHeader>
              <CardTitle>💾 {t('settings.storage')}</CardTitle>
            </CardHeader>
            <CardContent>
              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>{t('settings.cacheSize')}</Text>
                <Badge variant="outline">{cacheSize}</Badge>
              </View>
              <Button
                variant="destructive"
                onPress={handleClearCache}
                style={styles.clearCacheButton}
              >
                🗑️ {t('settings.clearCache')}
              </Button>
            </CardContent>
          </Card>
        </View>

        {/* App Info */}
        <View style={styles.section}>
          <Card>
            <CardHeader>
              <CardTitle>ℹ️ {t('settings.about')}</CardTitle>
            </CardHeader>
            <CardContent>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{t('settings.appName')}</Text>
                <Text style={styles.infoValue}>LexiClash</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{t('settings.version')}</Text>
                <Text style={styles.infoValue}>
                  {Application.nativeApplicationVersion || '1.0.0'}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{t('settings.buildNumber')}</Text>
                <Text style={styles.infoValue}>
                  {Application.nativeBuildVersion || '1'}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{t('settings.platform')}</Text>
                <Text style={styles.infoValue}>
                  {Platform.OS === 'ios' ? 'iOS' : 'Android'} {Platform.Version}
                </Text>
              </View>
            </CardContent>
          </Card>
        </View>

        {/* Footer spacing */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20 },
  backButton: { marginBottom: 10 },
  backText: { fontSize: 16, fontWeight: '600' },
  title: { fontSize: 32, fontWeight: '900' },
  section: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#333' },
  sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
  sectionSubtitle: { fontSize: 14, marginBottom: 15 },
  languageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 2,
    backgroundColor: '#DDD',
    gap: 8,
  },
  languageSelected: { backgroundColor: COLORS.neoCyan },
  languageFlag: { fontSize: 24 },
  languageName: { fontSize: 16, fontWeight: '700', color: COLORS.neoBlack },
  dictionaryList: { gap: 12 },
  dictionaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.neoBlack,
  },
  dictionaryInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dictionaryFlag: { fontSize: 28 },
  dictionaryText: {},
  dictionaryName: { fontSize: 16, fontWeight: '700' },
  dictionarySize: { fontSize: 12 },
  dictionaryActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  downloadedBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadedText: { fontSize: 16, color: COLORS.neoCream },
  deleteButton: { padding: 5 },
  deleteText: { fontSize: 20 },
  downloadButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.neoBlack,
  },
  downloadText: { fontSize: 14, fontWeight: '700', color: COLORS.neoBlack },
  progressContainer: {
    width: 100,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#444',
    overflow: 'hidden',
    position: 'relative',
  },
  progressBar: { height: '100%', borderRadius: 12 },
  progressText: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.neoCream,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neoBlack + '10',
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.neoBlack,
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  sliderRow: {
    paddingVertical: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neoBlack + '10',
  },
  sliderLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: COLORS.neoBlack,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  slider: {
    flex: 1,
    height: 40,
  },
  volumeIcon: {
    fontSize: 16,
  },
  clearCacheButton: {
    marginTop: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neoBlack + '10',
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.neoBlack,
  },
  infoValue: {
    fontSize: 14,
    color: '#666',
  },
});
