// Profile screen - User profile with stats, achievements, and settings
// Ported from fe-next/app/[locale]/profile/page.jsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { usePlayer } from '../../src/hooks/usePlayer';
import { HapticsService } from '../../src/features/haptics/HapticsService';
import Avatar from '../../src/components/profile/Avatar';
import EmojiAvatarPicker from '../../src/components/profile/EmojiAvatarPicker';
import AchievementDock from '../../src/components/achievements/AchievementDock';
import { Card, CardContent, CardHeader, CardTitle } from '../../src/components/ui/Card';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { Badge } from '../../src/components/ui/Badge';
import { COLORS } from '../../src/constants/game';

export default function ProfileScreen() {
  const router = useRouter();
  const { t, isRTL } = useLanguage();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const {
    profile,
    isLoading,
    updateUsername,
    updateAvatar,
    getStats,
    clearData,
  } = usePlayer();

  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(profile.username);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const stats = getStats();

  // Handle username save
  const handleSaveUsername = async () => {
    await HapticsService.buttonPress();

    if (!editedName.trim() || editedName.trim().length < 2) {
      Alert.alert(t('validation.usernameTooShort') || 'Name too short', t('validation.minLength') || 'Name must be at least 2 characters');
      return;
    }

    if (editedName.trim().length > 20) {
      Alert.alert(t('validation.usernameTooLong') || 'Name too long', t('validation.maxLength') || 'Name must be 20 characters or less');
      return;
    }

    updateUsername(editedName.trim());
    setIsEditingName(false);
    await HapticsService.wordAccepted();
  };

  // Handle avatar save
  const handleSaveAvatar = async (selection: { emoji: string; color: string }) => {
    await HapticsService.buttonPress();
    updateAvatar(selection.emoji, selection.color);
    await HapticsService.wordAccepted();
  };

  // Handle clear data
  const handleClearData = () => {
    Alert.alert(
      t('profile.clearData') || 'Clear All Data',
      t('profile.clearDataConfirm') || 'Are you sure you want to delete all your stats and achievements? This cannot be undone.',
      [
        { text: t('common.cancel') || 'Cancel', style: 'cancel' },
        {
          text: t('common.delete') || 'Delete',
          style: 'destructive',
          onPress: async () => {
            await HapticsService.buttonPress();
            await clearData();
            Alert.alert(t('profile.dataCleared') || 'Data Cleared', t('profile.dataClearedMessage') || 'All your data has been cleared.');
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? COLORS.neoBlack : COLORS.neoCream }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.neoCyan} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? COLORS.neoBlack : COLORS.neoCream }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={[styles.backText, { color: isDark ? COLORS.neoCream : COLORS.neoBlack }]}>
              {isRTL ? '→' : '←'} {t('common.back')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/settings')} style={styles.settingsButton}>
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>

        {/* Profile Card */}
        <View style={styles.section}>
          <Card>
            <CardContent>
              <View style={styles.profileHeader}>
                {/* Avatar */}
                <TouchableOpacity onPress={() => setShowEmojiPicker(true)}>
                  <View style={styles.avatarContainer}>
                    <Avatar
                      avatarEmoji={profile.avatarEmoji}
                      avatarColor={profile.avatarColor}
                      size="xl"
                    />
                    <View style={[styles.editBadge, { backgroundColor: COLORS.neoCyan }]}>
                      <Text style={styles.editIcon}>✏️</Text>
                    </View>
                  </View>
                </TouchableOpacity>

                {/* Username */}
                <View style={styles.usernameContainer}>
                  {isEditingName ? (
                    <View style={styles.usernameEditRow}>
                      <Input
                        value={editedName}
                        onChangeText={setEditedName}
                        placeholder={t('profile.enterUsername') || 'Enter username'}
                        style={styles.usernameInput}
                        maxLength={20}
                        autoFocus
                      />
                      <TouchableOpacity onPress={handleSaveUsername} style={styles.saveButton}>
                        <Text style={styles.saveIcon}>✓</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => {
                        setIsEditingName(false);
                        setEditedName(profile.username);
                      }} style={styles.cancelButton}>
                        <Text style={styles.cancelIcon}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      onPress={() => {
                        setEditedName(profile.username);
                        setIsEditingName(true);
                      }}
                      style={styles.usernameDisplayRow}
                    >
                      <Text style={[styles.username, { color: isDark ? COLORS.neoCream : COLORS.neoBlack }]}>
                        {profile.username}
                      </Text>
                      <Text style={styles.editUsernameIcon}>✏️</Text>
                    </TouchableOpacity>
                  )}

                  <Text style={[styles.memberSince, { color: isDark ? '#888' : '#666' }]}>
                    {t('profile.memberSince')} {new Date(profile.createdAt).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            </CardContent>
          </Card>
        </View>

        {/* Stats Grid */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: isDark ? COLORS.neoCream : COLORS.neoBlack }]}>
            {t('profile.statistics')}
          </Text>

          <View style={styles.statsGrid}>
            <StatCard
              icon="🎮"
              label={t('profile.totalGames')}
              value={stats.totalGames.toString()}
              isDark={isDark}
            />
            <StatCard
              icon="🏆"
              label={t('profile.wins')}
              value={stats.totalWins.toString()}
              isDark={isDark}
            />
            <StatCard
              icon="⭐"
              label={t('profile.totalScore')}
              value={stats.totalScore.toLocaleString()}
              isDark={isDark}
              highlight
            />
            <StatCard
              icon="📝"
              label={t('profile.wordsFound')}
              value={stats.totalWords.toString()}
              isDark={isDark}
            />
            <StatCard
              icon="🎯"
              label={t('profile.bestScore')}
              value={stats.bestScore.toString()}
              isDark={isDark}
            />
            <StatCard
              icon="🔤"
              label={t('profile.longestWord')}
              value={stats.longestWord}
              isDark={isDark}
            />
          </View>
        </View>

        {/* Additional Stats */}
        <View style={styles.section}>
          <Card>
            <CardHeader>
              <CardTitle>{t('profile.moreStats')}</CardTitle>
            </CardHeader>
            <CardContent>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>{t('profile.winRate')}</Text>
                <Badge variant="success">{stats.winRate}</Badge>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>{t('profile.avgScore')}</Text>
                <Badge variant="cyan">{stats.avgScore}</Badge>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>{t('profile.avgWords')}</Text>
                <Badge variant="purple">{stats.avgWordsPerGame}</Badge>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>{t('profile.timePlayed')}</Text>
                <Badge variant="accent">{stats.timePlayedFormatted}</Badge>
              </View>
            </CardContent>
          </Card>
        </View>

        {/* Achievements */}
        {profile.achievements.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: isDark ? COLORS.neoCream : COLORS.neoBlack }]}>
              {t('profile.achievements')} ({profile.achievements.length})
            </Text>

            <AchievementDock
              achievements={profile.achievements.map((a) => ({
                name: t(`achievements.${a.id}.name`) || a.name,
                description: t(`achievements.${a.id}.description`) || a.description,
                icon: a.icon,
              }))}
              isRTL={isRTL}
              title={t('profile.yourAchievements') || 'YOUR ACHIEVEMENTS'}
            />
          </View>
        )}

        {/* Actions */}
        <View style={styles.section}>
          <View style={styles.actionButtons}>
            <Button
              variant="destructive"
              onPress={handleClearData}
              style={styles.actionButton}
            >
              🗑️ {t('profile.clearData')}
            </Button>

            <Button
              variant="outline"
              onPress={() => router.push('/settings')}
              style={styles.actionButton}
            >
              ⚙️ {t('settings.title')}
            </Button>
          </View>
        </View>

        {/* Footer spacing */}
        <View style={styles.footer} />
      </ScrollView>

      {/* Emoji Avatar Picker Modal */}
      <EmojiAvatarPicker
        isOpen={showEmojiPicker}
        onClose={() => setShowEmojiPicker(false)}
        onSave={handleSaveAvatar}
        currentEmoji={profile.avatarEmoji}
        currentColor={profile.avatarColor}
      />
    </SafeAreaView>
  );
}

// StatCard Component
interface StatCardProps {
  icon: string;
  label: string;
  value: string;
  isDark: boolean;
  highlight?: boolean;
}

function StatCard({ icon, label, value, isDark, highlight = false }: StatCardProps) {
  return (
    <View
      style={[
        styles.statCard,
        {
          backgroundColor: highlight
            ? isDark
              ? `${COLORS.neoCyan}20`
              : `${COLORS.neoCyan}10`
            : isDark
            ? COLORS.neoGray
            : COLORS.neoWhite,
          borderColor: highlight ? COLORS.neoCyan : COLORS.neoBlack,
        },
      ]}
    >
      <Text style={styles.statIcon}>{icon}</Text>
      <Text
        style={[
          styles.statValue,
          {
            color: highlight
              ? COLORS.neoCyan
              : isDark
              ? COLORS.neoCream
              : COLORS.neoBlack,
          },
        ]}
      >
        {value}
      </Text>
      <Text style={[styles.statCardLabel, { color: isDark ? '#888' : '#666' }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingBottom: 10,
  },
  backButton: {
    padding: 8,
  },
  backText: {
    fontSize: 16,
    fontWeight: '700',
  },
  settingsButton: {
    padding: 8,
  },
  settingsIcon: {
    fontSize: 24,
  },
  section: {
    padding: 20,
    paddingTop: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  profileHeader: {
    alignItems: 'center',
    gap: 16,
  },
  avatarContainer: {
    position: 'relative',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: COLORS.neoBlack,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.neoBlack,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  editIcon: {
    fontSize: 14,
  },
  usernameContainer: {
    alignItems: 'center',
    gap: 4,
  },
  usernameEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  usernameInput: {
    flex: 1,
    minWidth: 200,
  },
  saveButton: {
    width: 40,
    height: 40,
    backgroundColor: COLORS.neoLime,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: COLORS.neoBlack,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveIcon: {
    fontSize: 18,
  },
  cancelButton: {
    width: 40,
    height: 40,
    backgroundColor: COLORS.neoRed,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: COLORS.neoBlack,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelIcon: {
    fontSize: 18,
    color: COLORS.neoWhite,
  },
  usernameDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  username: {
    fontSize: 24,
    fontWeight: '900',
  },
  editUsernameIcon: {
    fontSize: 16,
    opacity: 0.6,
  },
  memberSince: {
    fontSize: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: '47%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 3,
    alignItems: 'center',
    shadowColor: COLORS.neoBlack,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  statIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '900',
  },
  statCardLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 4,
    textAlign: 'center',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.neoBlack + '20',
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.neoBlack,
  },
  actionButtons: {
    gap: 12,
  },
  actionButton: {
    width: '100%',
  },
  footer: {
    height: 40,
  },
});
