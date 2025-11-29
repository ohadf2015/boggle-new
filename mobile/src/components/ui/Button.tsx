// React Native Button - ported from fe-next/components/ui/button.jsx
// Neo-Brutalist styling with hard shadows and press effects
import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TouchableOpacityProps,
} from 'react-native';
import { COLORS } from '../../constants/game';

export type ButtonVariant =
  | 'default'
  | 'destructive'
  | 'outline'
  | 'secondary'
  | 'ghost'
  | 'link'
  | 'success'
  | 'accent'
  | 'cyan';

export type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

export interface ButtonProps extends TouchableOpacityProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'default',
  size = 'default',
  children,
  style,
  disabled,
  ...props
}) => {
  const containerStyle = [
    styles.base,
    styles[`variant_${variant}`],
    styles[`size_${size}`],
    disabled && styles.disabled,
    style,
  ];

  const textStyle = [
    styles.text,
    styles[`text_${variant}`],
    styles[`textSize_${size}`],
    disabled && styles.textDisabled,
  ];

  return (
    <TouchableOpacity
      style={containerStyle}
      disabled={disabled}
      activeOpacity={0.8}
      {...props}
    >
      <Text style={textStyle}>{children}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.neoBlack,
    borderRadius: 4,
    // Hard shadow effect (simulated with shadow on iOS/Android)
    shadowColor: COLORS.neoBlack,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 0, // Android: use custom shadow instead
  },
  text: {
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Variants
  variant_default: {
    backgroundColor: COLORS.neoYellow,
  },
  text_default: {
    color: COLORS.neoBlack,
  },

  variant_destructive: {
    backgroundColor: COLORS.neoRed,
  },
  text_destructive: {
    color: COLORS.neoWhite,
  },

  variant_outline: {
    backgroundColor: COLORS.neoCream,
  },
  text_outline: {
    color: COLORS.neoBlack,
  },

  variant_secondary: {
    backgroundColor: COLORS.neoOrange,
  },
  text_secondary: {
    color: COLORS.neoBlack,
  },

  variant_ghost: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    shadowOpacity: 0,
  },
  text_ghost: {
    color: COLORS.neoWhite,
  },

  variant_link: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    shadowOpacity: 0,
  },
  text_link: {
    color: COLORS.neoCyan,
    textDecorationLine: 'underline',
  },

  variant_success: {
    backgroundColor: COLORS.neoLime,
  },
  text_success: {
    color: COLORS.neoBlack,
  },

  variant_accent: {
    backgroundColor: COLORS.neoPink,
  },
  text_accent: {
    color: COLORS.neoWhite,
  },

  variant_cyan: {
    backgroundColor: COLORS.neoCyan,
  },
  text_cyan: {
    color: COLORS.neoBlack,
  },

  // Sizes
  size_default: {
    height: 44,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  textSize_default: {
    fontSize: 14,
  },

  size_sm: {
    height: 36,
    paddingHorizontal: 16,
  },
  textSize_sm: {
    fontSize: 12,
  },

  size_lg: {
    height: 56,
    paddingHorizontal: 32,
  },
  textSize_lg: {
    fontSize: 16,
  },

  size_icon: {
    height: 44,
    width: 44,
    paddingHorizontal: 0,
  },
  textSize_icon: {
    fontSize: 14,
  },

  // States
  disabled: {
    opacity: 0.5,
  },
  textDisabled: {
    opacity: 0.5,
  },
});
