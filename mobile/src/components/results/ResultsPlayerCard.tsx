import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ScrollView,
} from 'react-native';
import { COLORS } from '../../constants/game';
import { AchievementBadge, Achievement } from '../achievements/AchievementBadge';
import { useLanguage } from '../../contexts/LanguageContext';

/**
 * Neo-Brutalist Results Player Card - React Native
 * Ported from fe-next/components/results/ResultsPlayerCard.jsx
 * Features: Expandable word list, achievement display, score breakdown
 */

// Point colors mapping - Neo-Brutalist solid colors
const POINT_COLORS: Record<number, string> = {
  1: COLORS.neoGray,     // 2 letters (neutral, lowest value)
  2: COLORS.neoCyan,     // 3 letters
  3: COLORS.neoCyan,     // 4 letters
  4: COLORS.neoOrange,   // 5 letters
  5: COLORS.neoPurple,   // 6 letters
  6: COLORS.neoPurple,   // 7 letters
  7: COLORS.neoPink,     // 8 letters
  8: COLORS.neoPink,     // 9+ letters (premium/rare)
};

interface WordObj {
  word: string;
  score: number;
  isDuplicate?: boolean;
  validated?: boolean;
  comboBonus?: number;
}

interface Avatar {
  profilePictureUrl?: string;
  emoji?: string;
  color?: string;
}

interface PlayerTitle {
  icon: string;
  name: string;
  description: string;
}

interface Player {
  username: string;
  score: number;
  validWordCount?: number;
  allWords?: WordObj[];
  longestWord?: string;
  achievements?: Achievement[];
  avatar?: Avatar;
  title?: PlayerTitle;
}

interface ResultsPlayerCardProps {
  player: Player;
  index: number;
  allPlayerWords?: Record<string, WordObj[]>;
  currentUsername?: string;
  isWinner?: boolean;
}

// Helper function to apply Hebrew final letters (simplified for mobile)
const applyHebrewFinalLetters = (word: string): string => {
  if (!word) return word;
  // Add logic if needed for Hebrew sofit letters
  return word;
};

// Word Chip Component
interface WordChipProps {
  wordObj: WordObj;
  playerCount: number;
}

const WordChip: React.FC<WordChipProps> = ({ wordObj, playerCount }) => {
  const isDuplicate = wordObj.isDuplicate;
  const isValid = wordObj.validated;
  const displayWord = applyHebrewFinalLetters(wordObj.word);
  const comboBonus = wordObj.comboBonus || 0;

  const backgroundColor = isDuplicate
    ? COLORS.neoOrange
    : !isValid
    ? COLORS.neoRed
    : POINT_COLORS[wordObj.score] || POINT_COLORS[8];

  const textColor = isDuplicate || !isValid
    ? COLORS.neoCream
    : wordObj.score === 2 || wordObj.score === 3
    ? COLORS.neoBlack
    : COLORS.neoCream;

  return (
    <View style={[styles.wordChipContainer, !isValid && styles.wordChipInvalid]}>
      <View
        style={[
          styles.wordChip,
          { backgroundColor },
          isDuplicate && styles.wordChipDuplicate,
        ]}
      >
        <Text
          style={[
            styles.wordChipText,
            { color: textColor },
            isDuplicate && styles.wordChipTextStrikethrough,
          ]}
        >
          {displayWord}
        </Text>
        {comboBonus > 0 && !isDuplicate && isValid && (
          <View style={styles.comboBadge}>
            <Text style={styles.comboBadgeText}>+{comboBonus}</Text>
          </View>
        )}
      </View>
      {isDuplicate && playerCount > 1 && (
        <View style={styles.duplicateCountBadge}>
          <Text style={styles.duplicateCountText}>{playerCount}</Text>
        </View>
      )}
    </View>
  );
};

export const ResultsPlayerCard: React.FC<ResultsPlayerCardProps> = ({
  player,
  index,
  allPlayerWords,
  currentUsername,
  isWinner = false,
}) => {
  const { t } = useLanguage();
  const isCurrentPlayer = currentUsername && player.username === currentUsername;
  const [isWordsExpanded, setIsWordsExpanded] = useState(isCurrentPlayer);
  const scaleAnim = new Animated.Value(0);

  React.useEffect(() => {
    // Entrance animation
    Animated.spring(scaleAnim, {
      toValue: 1,
      delay: Math.min(index * 50, 300),
      tension: 200,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, []);

  // Memoize word categorization
  const { duplicateWords, invalidWords, wordsByPoints, sortedPointGroups, totalComboBonus } = useMemo(() => {
    if (!player.allWords || player.allWords.length === 0) {
      return { duplicateWords: [], invalidWords: [], wordsByPoints: {}, sortedPointGroups: [], totalComboBonus: 0 };
    }

    const duplicateWords = player.allWords.filter(w => w && w.isDuplicate);
    const invalidWords = player.allWords.filter(w => w && !w.isDuplicate && !w.validated);
    const validWords = player.allWords.filter(w => w && !w.isDuplicate && w.validated);

    const totalComboBonus = validWords.reduce((sum, w) => sum + (w.comboBonus || 0), 0);

    const wordsByPoints: Record<number, WordObj[]> = {};
    validWords.forEach(wordObj => {
      const points = wordObj.score || 0;
      if (!wordsByPoints[points]) {
        wordsByPoints[points] = [];
      }
      wordsByPoints[points].push(wordObj);
    });

    // Sort words alphabetically within each group
    Object.keys(wordsByPoints).forEach(points => {
      wordsByPoints[Number(points)].sort((a, b) => a.word.localeCompare(b.word));
    });

    duplicateWords.sort((a, b) => a.word.localeCompare(b.word));
    invalidWords.sort((a, b) => a.word.localeCompare(b.word));

    const sortedPointGroups = Object.keys(wordsByPoints)
      .map(Number)
      .sort((a, b) => b - a);

    return { duplicateWords, invalidWords, wordsByPoints, sortedPointGroups, totalComboBonus };
  }, [player.allWords]);

  const showWinnerMessage = isCurrentPlayer && isWinner;

  // Calculate player count for word
  const getPlayerCountForWord = (word: string): number => {
    if (!allPlayerWords || !word) return 1;
    let count = 0;
    Object.values(allPlayerWords).forEach(playerWordList => {
      if (Array.isArray(playerWordList) && playerWordList.some(w => w?.word?.toLowerCase() === word.toLowerCase())) {
        count++;
      }
    });
    return count;
  };

  // Rank icons
  const getRankIcon = (): string => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `#${index + 1}`;
  };

  // Card background color
  const getCardBackgroundColor = (): string => {
    if (index === 0) return COLORS.neoYellow;
    if (index === 1) return '#D1D5DB'; // Silver
    if (index === 2) return COLORS.neoOrange;
    return COLORS.neoCream;
  };

  return (
    <Animated.View
      style={[
        styles.cardContainer,
        {
          backgroundColor: getCardBackgroundColor(),
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      {/* Halftone pattern overlay */}
      <View style={styles.halftoneOverlay} />

      {/* Header: Rank, Name, Score */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.rankBox}>
            <Text style={styles.rankText}>{getRankIcon()}</Text>
          </View>
          <View style={styles.playerInfo}>
            <View style={styles.playerNameRow}>
              <Text style={styles.playerName}>{player.username}</Text>
              {isCurrentPlayer && (
                <View style={styles.meBadge}>
                  <Text style={styles.meBadgeText}>{t('playerView.me')}</Text>
                </View>
              )}
              {showWinnerMessage && (
                <View style={styles.winnerBadge}>
                  <Text style={styles.winnerBadgeText}>{t('results.youWon')}</Text>
                </View>
              )}
            </View>
            {player.title && (
              <View style={styles.titleRow}>
                <Text style={styles.titleIcon}>{player.title.icon}</Text>
                <Text style={styles.titleName}>{player.title.name}</Text>
              </View>
            )}
            <Text style={styles.validWordCount}>
              {player.validWordCount !== undefined && `${player.validWordCount} ${t('results.valid')}`}
            </Text>
          </View>
        </View>
        <View style={styles.scoreContainer}>
          {totalComboBonus > 0 && (
            <View style={styles.comboBonusContainer}>
              <Text style={styles.comboBonusText}>🔥 +{totalComboBonus}</Text>
              <Text style={styles.comboBonusLabel}>{t('results.comboBonus')}</Text>
            </View>
          )}
          <View style={styles.scoreBox}>
            <Text style={styles.scoreText}>{player.score}</Text>
          </View>
        </View>
      </View>

      {/* Longest Word */}
      {player.longestWord && (
        <View style={styles.longestWordContainer}>
          <Text style={styles.longestWordLabel}>
            {t('playerView.longestWord')}:{' '}
          </Text>
          <Text style={styles.longestWord}>
            {applyHebrewFinalLetters(player.longestWord)}
          </Text>
        </View>
      )}

      {/* Words Section - Collapsible */}
      <View style={styles.wordsSection}>
        <TouchableOpacity
          style={styles.wordsToggle}
          onPress={() => setIsWordsExpanded(!isWordsExpanded)}
        >
          <Text style={styles.wordsToggleText}>
            {t('hostView.words')}: ({player.allWords?.length || 0})
          </Text>
          <Text style={styles.chevron}>{isWordsExpanded ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        {isWordsExpanded && player.allWords && player.allWords.length > 0 && (
          <ScrollView style={styles.wordsContent} nestedScrollEnabled>
            {/* Valid Words Grouped by Points */}
            {sortedPointGroups.length > 0 && (
              <View style={styles.wordGroup}>
                <View style={styles.wordGroupHeader}>
                  <View style={styles.wordGroupBadge}>
                    <Text style={styles.wordGroupIcon}>✓</Text>
                  </View>
                  <Text style={styles.wordGroupTitle}>
                    {t('results.validWords') || 'Valid Words'} ({Object.values(wordsByPoints).flat().length})
                  </Text>
                </View>
                {sortedPointGroups.map(points => (
                  <View
                    key={`points-${points}`}
                    style={[
                      styles.pointsGroup,
                      { borderLeftColor: POINT_COLORS[points] || POINT_COLORS[8] },
                    ]}
                  >
                    <View style={styles.pointsHeader}>
                      <View
                        style={[
                          styles.pointsBadge,
                          { backgroundColor: POINT_COLORS[points] || POINT_COLORS[8] },
                        ]}
                      >
                        <Text style={styles.pointsBadgeText}>
                          {points} {t('results.points') || 'pts'}
                        </Text>
                      </View>
                      <Text style={styles.pointsCount}>
                        {wordsByPoints[points].length} {t('hostView.words') || 'words'}
                      </Text>
                    </View>
                    <View style={styles.wordsGrid}>
                      {wordsByPoints[points].map((wordObj, i) => (
                        <WordChip
                          key={`${points}-${i}`}
                          wordObj={wordObj}
                          playerCount={getPlayerCountForWord(wordObj.word)}
                        />
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Duplicate Words */}
            {duplicateWords.length > 0 && (
              <View style={styles.wordGroup}>
                <View style={styles.wordGroupHeader}>
                  <View style={[styles.wordGroupBadge, { backgroundColor: COLORS.neoOrange }]}>
                    <Text style={styles.wordGroupIcon}>👥</Text>
                  </View>
                  <Text style={styles.wordGroupTitle}>
                    {t('results.shared') || 'Shared Words'} ({duplicateWords.length})
                  </Text>
                </View>
                <View style={styles.wordsGrid}>
                  {duplicateWords.map((wordObj, i) => (
                    <WordChip
                      key={`duplicate-${i}`}
                      wordObj={wordObj}
                      playerCount={getPlayerCountForWord(wordObj.word)}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* Invalid Words */}
            {invalidWords.length > 0 && (
              <View style={styles.wordGroup}>
                <View style={styles.wordGroupHeader}>
                  <View style={[styles.wordGroupBadge, { backgroundColor: COLORS.neoGray }]}>
                    <Text style={[styles.wordGroupIcon, { color: COLORS.neoCream }]}>✗</Text>
                  </View>
                  <Text style={[styles.wordGroupTitle, { opacity: 0.7 }]}>
                    {t('results.invalid') || 'Invalid Words'} ({invalidWords.length})
                  </Text>
                </View>
                <View style={styles.wordsGrid}>
                  {invalidWords.map((wordObj, i) => (
                    <WordChip
                      key={`invalid-${i}`}
                      wordObj={wordObj}
                      playerCount={getPlayerCountForWord(wordObj.word)}
                    />
                  ))}
                </View>
              </View>
            )}
          </ScrollView>
        )}
      </View>

      {/* Achievements Section */}
      {player.achievements && player.achievements.length > 0 && (
        <View style={styles.achievementsSection}>
          <Text style={styles.achievementsTitle}>
            {t('hostView.achievements')}:
          </Text>
          <View style={styles.achievementsGrid}>
            {player.achievements.map((ach, i) => (
              <AchievementBadge key={i} achievement={ach} index={i} />
            ))}
          </View>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    marginVertical: 8,
    marginHorizontal: 4,
    padding: 16,
    borderWidth: 4,
    borderColor: COLORS.neoBlack,
    borderRadius: 8,
    shadowColor: COLORS.neoBlack,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 8,
    position: 'relative',
  },
  halftoneOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.05,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  rankBox: {
    width: 48,
    height: 48,
    borderRadius: 4,
    backgroundColor: COLORS.neoCream,
    borderWidth: 3,
    borderColor: COLORS.neoBlack,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.neoBlack,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  rankText: {
    fontSize: 24,
    fontWeight: '900',
  },
  playerInfo: {
    flex: 1,
  },
  playerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  playerName: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.neoBlack,
  },
  meBadge: {
    backgroundColor: COLORS.neoBlack,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  meBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.neoCream,
  },
  winnerBadge: {
    backgroundColor: COLORS.neoPink,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.neoBlack,
  },
  winnerBadgeText: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.neoCream,
    textTransform: 'uppercase',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  titleIcon: {
    fontSize: 16,
  },
  titleName: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.neoPurple,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  validWordCount: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.neoBlack,
    opacity: 0.7,
    marginTop: 2,
  },
  scoreContainer: {
    alignItems: 'flex-end',
    gap: 8,
  },
  comboBonusContainer: {
    backgroundColor: COLORS.neoOrange,
    borderWidth: 3,
    borderColor: COLORS.neoBlack,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    shadowColor: COLORS.neoBlack,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  comboBonusText: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.neoBlack,
  },
  comboBonusLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.neoBlack,
    textTransform: 'uppercase',
  },
  scoreBox: {
    backgroundColor: COLORS.neoCream,
    borderWidth: 3,
    borderColor: COLORS.neoBlack,
    borderRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
    shadowColor: COLORS.neoBlack,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  scoreText: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.neoBlack,
  },
  longestWordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.neoCyan,
    borderWidth: 3,
    borderColor: COLORS.neoBlack,
    borderRadius: 4,
    padding: 12,
    marginBottom: 12,
    shadowColor: COLORS.neoBlack,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  longestWordLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.neoBlack,
    textTransform: 'uppercase',
  },
  longestWord: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.neoBlack,
    textTransform: 'uppercase',
  },
  wordsSection: {
    marginBottom: 12,
  },
  wordsToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.neoCream,
    borderWidth: 2,
    borderColor: COLORS.neoBlack,
    borderRadius: 4,
    padding: 12,
    shadowColor: COLORS.neoBlack,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  wordsToggleText: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.neoBlack,
    textTransform: 'uppercase',
  },
  chevron: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.neoBlack,
  },
  wordsContent: {
    marginTop: 12,
    maxHeight: 400,
  },
  wordGroup: {
    backgroundColor: COLORS.neoCream,
    borderWidth: 3,
    borderColor: COLORS.neoBlack,
    borderRadius: 4,
    padding: 12,
    marginBottom: 12,
    shadowColor: COLORS.neoBlack,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  wordGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  wordGroupBadge: {
    backgroundColor: COLORS.neoCyan,
    borderWidth: 2,
    borderColor: COLORS.neoBlack,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  wordGroupIcon: {
    fontSize: 12,
    color: COLORS.neoBlack,
  },
  wordGroupTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.neoBlack,
    textTransform: 'uppercase',
  },
  pointsGroup: {
    borderLeftWidth: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    padding: 8,
    marginBottom: 8,
  },
  pointsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  pointsBadge: {
    borderWidth: 2,
    borderColor: COLORS.neoBlack,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  pointsBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.neoCream,
    textTransform: 'uppercase',
  },
  pointsCount: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.neoBlack,
    textTransform: 'uppercase',
  },
  wordsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  wordChipContainer: {
    position: 'relative',
  },
  wordChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 2,
    borderColor: COLORS.neoBlack,
    borderRadius: 4,
    shadowColor: COLORS.neoBlack,
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 0,
    gap: 4,
  },
  wordChipDuplicate: {
    opacity: 0.8,
  },
  wordChipInvalid: {
    opacity: 0.7,
  },
  wordChipText: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  wordChipTextStrikethrough: {
    textDecorationLine: 'line-through',
  },
  comboBadge: {
    backgroundColor: COLORS.neoYellow,
    borderWidth: 1,
    borderColor: COLORS.neoBlack,
    borderRadius: 2,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  comboBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    color: COLORS.neoBlack,
  },
  duplicateCountBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: COLORS.neoBlack,
    borderWidth: 2,
    borderColor: COLORS.neoBlack,
    borderRadius: 4,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  duplicateCountText: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.neoCream,
  },
  achievementsSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 4,
    borderTopColor: COLORS.neoBlack,
  },
  achievementsTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.neoPurple,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
