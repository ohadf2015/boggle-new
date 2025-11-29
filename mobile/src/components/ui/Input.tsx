import React, { forwardRef } from 'react';
import { TextInput, StyleSheet, TextInputProps, ViewStyle } from 'react-native';
import { COLORS } from '../../constants/game';

// Neo-Brutalist Input Component
// Matches fe-next/components/ui/input.jsx design with thick borders and inset shadow effect

interface InputProps extends TextInputProps {
  containerStyle?: ViewStyle;
}

export const Input = forwardRef<TextInput, InputProps>(
  ({ style, containerStyle, placeholderTextColor, ...props }, ref) => {
    return (
      <TextInput
        ref={ref}
        style={[styles.input, style]}
        placeholderTextColor={placeholderTextColor || COLORS.neoBlack + '66'} // 40% opacity
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';

const styles = StyleSheet.create({
  input: {
    height: 44,
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    fontWeight: '500',
    borderRadius: 8,
    borderWidth: 3,
    borderColor: COLORS.neoBlack,
    backgroundColor: COLORS.neoCream,
    color: COLORS.neoBlack,
    // Inset shadow effect for depth (approximation)
    shadowColor: COLORS.neoBlack,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 0,
    elevation: 0, // Disable elevation for inset effect
  },
});

// Additional styles for different states can be added here
export const inputVariants = StyleSheet.create({
  disabled: {
    opacity: 0.5,
    backgroundColor: COLORS.neoCream + '80', // 50% opacity
  },
  error: {
    borderColor: COLORS.neoRed,
    borderWidth: 3,
  },
  focused: {
    borderColor: COLORS.neoCyan,
    borderWidth: 3,
    shadowColor: COLORS.neoBlack,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 0,
  },
});
