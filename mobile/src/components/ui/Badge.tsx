import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { COLORS } from '../../constants/game';

// Neo-Brutalist Badge Component
// Matches fe-next/components/ui/badge.jsx design with thick borders and bold colors

export type BadgeVariant =
  | 'default'
  | 'secondary'
  | 'destructive'
  | 'outline'
  | 'success'
  | 'accent'
  | 'cyan'
  | 'purple';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  style,
  textStyle
}) => {
  return (
    <View style={[styles.badge, variantStyles[variant].container, style]}>
      <Text style={[styles.badgeText, variantStyles[variant].text, textStyle]}>
        {typeof children === 'string' ? children.toUpperCase() : children}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999, // pill shape
    borderWidth: 2,
    borderColor: COLORS.neoBlack,
    paddingHorizontal: 12,
    paddingVertical: 4,
    // Hard shadow for neo-brutalist style
    shadowColor: COLORS.neoBlack,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});

// Variant styles matching fe-next design
const variantStyles = StyleSheet.create({
  default: {
    container: {
      backgroundColor: COLORS.neoYellow,
    },
    text: {
      color: COLORS.neoBlack,
    },
  },
  secondary: {
    container: {
      backgroundColor: COLORS.neoOrange,
    },
    text: {
      color: COLORS.neoBlack,
    },
  },
  destructive: {
    container: {
      backgroundColor: COLORS.neoRed,
    },
    text: {
      color: COLORS.neoWhite,
    },
  },
  outline: {
    container: {
      backgroundColor: COLORS.neoCream,
    },
    text: {
      color: COLORS.neoBlack,
    },
  },
  success: {
    container: {
      backgroundColor: COLORS.neoLime,
    },
    text: {
      color: COLORS.neoBlack,
    },
  },
  accent: {
    container: {
      backgroundColor: COLORS.neoPink,
    },
    text: {
      color: COLORS.neoWhite,
    },
  },
  cyan: {
    container: {
      backgroundColor: COLORS.neoCyan,
    },
    text: {
      color: COLORS.neoBlack,
    },
  },
  purple: {
    container: {
      backgroundColor: COLORS.neoPurple,
    },
    text: {
      color: COLORS.neoWhite,
    },
  },
});
