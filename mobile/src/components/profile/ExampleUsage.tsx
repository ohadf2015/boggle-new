/**
 * Example Usage for Profile Components
 *
 * Demonstrates how to use Avatar and EmojiAvatarPicker components
 */

import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import Avatar from './Avatar';
import EmojiAvatarPicker from './EmojiAvatarPicker';
import { COLORS } from '../../constants/game';

export default function ProfileComponentsExample() {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [avatarEmoji, setAvatarEmoji] = useState('🐶');
  const [avatarColor, setAvatarColor] = useState('#4ECDC4');

  const handleSaveAvatar = ({ emoji, color }: { emoji: string; color: string }) => {
    setAvatarEmoji(emoji);
    setAvatarColor(color);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Avatar Examples</Text>

      {/* Different sizes */}
      <View style={styles.row}>
        <Avatar size="sm" avatarEmoji={avatarEmoji} avatarColor={avatarColor} />
        <Avatar size="md" avatarEmoji={avatarEmoji} avatarColor={avatarColor} />
        <Avatar size="lg" avatarEmoji={avatarEmoji} avatarColor={avatarColor} />
        <Avatar size="xl" avatarEmoji={avatarEmoji} avatarColor={avatarColor} />
      </View>

      {/* With profile picture */}
      <View style={styles.row}>
        <Avatar
          size="lg"
          profilePictureUrl="https://via.placeholder.com/150"
          avatarEmoji={avatarEmoji}
          avatarColor={avatarColor}
        />
      </View>

      {/* Change avatar button */}
      <TouchableOpacity
        style={styles.button}
        onPress={() => setIsPickerOpen(true)}
      >
        <Text style={styles.buttonText}>Change Avatar</Text>
      </TouchableOpacity>

      {/* Avatar picker modal */}
      <EmojiAvatarPicker
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onSave={handleSaveAvatar}
        currentEmoji={avatarEmoji}
        currentColor={avatarColor}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: COLORS.neoNavy,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.neoCream,
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  button: {
    backgroundColor: COLORS.neoCyan,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: COLORS.neoBlack,
    marginTop: 20,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.neoBlack,
    textTransform: 'uppercase',
  },
});
