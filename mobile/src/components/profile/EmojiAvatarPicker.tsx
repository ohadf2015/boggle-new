// EmojiAvatarPicker - Modal for selecting emoji and color for avatar
// Ported from fe-next/components/EmojiAvatarPicker.jsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Pressable,
  I18nManager,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { COLORS } from '../../constants/game';

// Same emojis and colors as backend socketHandlers.js
const AVATAR_EMOJIS = [
  '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼',
  '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔',
  '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺',
  '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞',
];

const AVATAR_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
  '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52B788',
  '#FF8FAB', '#6BCF7F', '#FFB347', '#9D84B7', '#FF6F61',
];

interface EmojiAvatarPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (selection: { emoji: string; color: string }) => void;
  currentEmoji?: string;
  currentColor?: string;
}

/**
 * EmojiAvatarPicker - Modal for selecting emoji and color for avatar
 * Ported from fe-next/components/EmojiAvatarPicker.jsx
 *
 * Neo-brutalist styled picker with emoji grid and color palette
 * Supports RTL layout for Hebrew
 */
export default function EmojiAvatarPicker({
  isOpen,
  onClose,
  onSave,
  currentEmoji = '🐶',
  currentColor = '#4ECDC4',
}: EmojiAvatarPickerProps) {
  const [selectedEmoji, setSelectedEmoji] = useState(currentEmoji);
  const [selectedColor, setSelectedColor] = useState(currentColor);
  const isRTL = I18nManager.isRTL;

  // Reset selections when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setSelectedEmoji(currentEmoji);
      setSelectedColor(currentColor);
    }
  }, [isOpen, currentEmoji, currentColor]);

  const handleSave = () => {
    onSave({ emoji: selectedEmoji, color: selectedColor });
    onClose();
  };

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* Modal Content */}
        <Pressable onPress={(e) => e.stopPropagation()}>
          <Animated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(200)}
            style={[
              styles.modal,
              {
                backgroundColor: COLORS.neoNavy,
                borderColor: COLORS.neoBlack,
              },
            ]}
          >
            {/* Preview */}
            <View style={styles.previewContainer}>
              <View
                style={[
                  styles.preview,
                  {
                    backgroundColor: selectedColor,
                    borderColor: COLORS.neoBlack,
                  },
                ]}
              >
                <Text style={styles.previewEmoji}>{selectedEmoji}</Text>
              </View>
            </View>

            {/* Emoji Grid */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: COLORS.neoCream }]}>
                Choose Emoji
              </Text>
              <ScrollView
                style={styles.emojiScrollView}
                contentContainerStyle={styles.emojiGrid}
                showsVerticalScrollIndicator={false}
              >
                {AVATAR_EMOJIS.map((emoji) => (
                  <EmojiButton
                    key={emoji}
                    emoji={emoji}
                    isSelected={selectedEmoji === emoji}
                    onPress={() => setSelectedEmoji(emoji)}
                  />
                ))}
              </ScrollView>
            </View>

            {/* Color Palette */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: COLORS.neoCream }]}>
                Choose Color
              </Text>
              <View style={styles.colorPalette}>
                {AVATAR_COLORS.map((color) => (
                  <ColorButton
                    key={color}
                    color={color}
                    isSelected={selectedColor === color}
                    onPress={() => setSelectedColor(color)}
                  />
                ))}
              </View>
            </View>

            {/* Buttons */}
            <View style={styles.buttonsContainer}>
              <TouchableOpacity
                onPress={onClose}
                style={[
                  styles.button,
                  styles.cancelButton,
                  {
                    backgroundColor: COLORS.neoGray,
                    borderColor: COLORS.neoBlack,
                  },
                ]}
                activeOpacity={0.8}
              >
                <Text style={[styles.buttonText, { color: COLORS.neoCream }]}>
                  ✕ Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSave}
                style={[
                  styles.button,
                  styles.saveButton,
                  {
                    backgroundColor: COLORS.neoCyan,
                    borderColor: COLORS.neoBlack,
                  },
                ]}
                activeOpacity={0.8}
              >
                <Text style={[styles.buttonText, { color: COLORS.neoBlack }]}>
                  ✓ Save
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// EmojiButton Component
interface EmojiButtonProps {
  emoji: string;
  isSelected: boolean;
  onPress: () => void;
}

function EmojiButton({ emoji, isSelected, onPress }: EmojiButtonProps) {
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withSpring(0.9);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View
        style={[
          styles.emojiButton,
          animatedStyle,
          {
            backgroundColor: isSelected
              ? `${COLORS.neoCyan}33`
              : 'transparent',
            borderColor: isSelected ? COLORS.neoCyan : 'transparent',
            borderWidth: isSelected ? 2 : 0,
          },
        ]}
      >
        <Text style={styles.emojiButtonText}>{emoji}</Text>
      </Animated.View>
    </Pressable>
  );
}

// ColorButton Component
interface ColorButtonProps {
  color: string;
  isSelected: boolean;
  onPress: () => void;
}

function ColorButton({ color, isSelected, onPress }: ColorButtonProps) {
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withSpring(0.9);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View
        style={[
          styles.colorButton,
          animatedStyle,
          {
            backgroundColor: color,
            borderColor: isSelected ? COLORS.neoCyan : COLORS.neoBlack,
            borderWidth: isSelected ? 4 : 2,
          },
        ]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modal: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    borderWidth: 4,
    padding: 24,
    // Neo-brutalist hard shadow
    shadowColor: COLORS.neoBlack,
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 10,
  },
  previewContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  preview: {
    width: 96,
    height: 96,
    borderRadius: 999,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    // Neo-brutalist hard shadow
    shadowColor: COLORS.neoBlack,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
  },
  previewEmoji: {
    fontSize: 56,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  emojiScrollView: {
    maxHeight: 180,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  emojiButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiButtonText: {
    fontSize: 24,
  },
  colorPalette: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  colorButton: {
    width: 36,
    height: 36,
    borderRadius: 999,
    // Neo-brutalist hard shadow
    shadowColor: COLORS.neoBlack,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    // Neo-brutalist hard shadow
    shadowColor: COLORS.neoBlack,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  cancelButton: {},
  saveButton: {},
  buttonText: {
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
