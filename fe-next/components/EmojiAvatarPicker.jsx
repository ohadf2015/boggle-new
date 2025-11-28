'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaCheck, FaTimes } from 'react-icons/fa';
import { useTheme } from '../contexts/ThemeContext';

// Same emojis and colors as backend socketHandlers.js
const AVATAR_EMOJIS = [
  '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼',
  '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔',
  '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺',
  '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞'
];

const AVATAR_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
  '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52B788',
  '#FF8FAB', '#6BCF7F', '#FFB347', '#9D84B7', '#FF6F61'
];

/**
 * EmojiAvatarPicker - Modal for selecting emoji and color for avatar
 *
 * @param {boolean} isOpen - Whether the picker is open
 * @param {function} onClose - Called when picker is closed
 * @param {function} onSave - Called with { emoji, color } when saved
 * @param {string} currentEmoji - Currently selected emoji
 * @param {string} currentColor - Currently selected color
 */
const EmojiAvatarPicker = ({
  isOpen,
  onClose,
  onSave,
  currentEmoji = '🐶',
  currentColor = '#4ECDC4'
}) => {
  const { isDarkMode } = useTheme();
  const [selectedEmoji, setSelectedEmoji] = useState(currentEmoji);
  const [selectedColor, setSelectedColor] = useState(currentColor);

  const handleSave = () => {
    onSave({ emoji: selectedEmoji, color: selectedColor });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className={`w-full max-w-sm rounded-2xl p-6 shadow-xl ${
            isDarkMode ? 'bg-slate-800' : 'bg-white'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Preview */}
          <div className="flex justify-center mb-6">
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center text-5xl shadow-lg"
              style={{ backgroundColor: selectedColor }}
            >
              {selectedEmoji}
            </div>
          </div>

          {/* Emoji Grid */}
          <div className="mb-4">
            <p className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Choose Emoji
            </p>
            <div className="grid grid-cols-8 gap-1">
              {AVATAR_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => setSelectedEmoji(emoji)}
                  className={`w-9 h-9 rounded-lg flex items-center justify-center text-xl transition-all ${
                    selectedEmoji === emoji
                      ? 'ring-2 ring-cyan-500 bg-cyan-500/20'
                      : isDarkMode
                        ? 'hover:bg-slate-700'
                        : 'hover:bg-gray-100'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Color Palette */}
          <div className="mb-6">
            <p className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Choose Color
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {AVATAR_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`w-8 h-8 rounded-full transition-all ${
                    selectedColor === color
                      ? 'ring-2 ring-offset-2 ring-cyan-500'
                      : ''
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className={`flex-1 py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 ${
                isDarkMode
                  ? 'bg-slate-700 hover:bg-slate-600 text-gray-300'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              <FaTimes size={14} />
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 py-3 rounded-xl font-medium bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-600 hover:to-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <FaCheck size={14} />
              Save
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default EmojiAvatarPicker;
