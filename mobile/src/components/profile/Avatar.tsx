// Unified Avatar Component - Displays profile pictures or emoji fallback
// Ported from fe-next/components/Avatar.jsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, ImageStyle, ViewStyle } from 'react-native';

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  profilePictureUrl?: string;
  avatarEmoji?: string;
  avatarColor?: string;
  size?: AvatarSize;
  style?: ViewStyle;
}

interface SizeConfig {
  container: number;
  text: number;
}

/**
 * Avatar - Unified avatar component for profile pictures or emoji fallback
 * Ported from fe-next/components/Avatar.jsx
 *
 * @param profilePictureUrl - URL of profile picture (optional)
 * @param avatarEmoji - Fallback emoji (default: dog)
 * @param avatarColor - Fallback background color
 * @param size - Size preset: sm, md, lg, xl
 * @param style - Additional style overrides
 */
export default function Avatar({
  profilePictureUrl,
  avatarEmoji = '🐶',
  avatarColor = '#4ECDC4',
  size = 'md',
  style,
}: AvatarProps) {
  const [imageError, setImageError] = useState(false);

  const sizeConfig: Record<AvatarSize, SizeConfig> = {
    sm: { container: 24, text: 14 },
    md: { container: 32, text: 16 },
    lg: { container: 48, text: 24 },
    xl: { container: 96, text: 48 },
  };

  const config = sizeConfig[size] || sizeConfig.md;

  // Show profile picture if available and hasn't errored
  if (profilePictureUrl && !imageError) {
    return (
      <View
        style={[
          styles.container,
          {
            width: config.container,
            height: config.container,
          },
          style,
        ]}
      >
        <Image
          source={{ uri: profilePictureUrl }}
          style={styles.image}
          onError={() => setImageError(true)}
          resizeMode="cover"
        />
      </View>
    );
  }

  // Fallback to emoji avatar
  return (
    <View
      style={[
        styles.emojiContainer,
        {
          width: config.container,
          height: config.container,
          backgroundColor: avatarColor,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.emoji,
          {
            fontSize: config.text,
          },
        ]}
      >
        {avatarEmoji}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 999,
    overflow: 'hidden',
    flexShrink: 0,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  emojiContainer: {
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  emoji: {
    textAlign: 'center',
  },
});
