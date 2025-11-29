import React from 'react';
import { View, StyleSheet, ViewStyle, Animated } from 'react-native';
import { COLORS } from '../../constants/game';

// Neo-Brutalist Progress Component
// Matches fe-next/components/ui/progress.jsx design with thick borders and hard shadows

export type ProgressVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'danger'
  | 'accent'
  | 'cyan';

export type ProgressSize = 'sm' | 'default' | 'lg';

interface ProgressProps {
  value: number; // 0-100
  variant?: ProgressVariant;
  size?: ProgressSize;
  style?: ViewStyle;
  animated?: boolean;
}

export const Progress: React.FC<ProgressProps> = ({
  value,
  variant = 'default',
  size = 'default',
  style,
  animated = true
}) => {
  const [animatedValue] = React.useState(new Animated.Value(0));

  React.useEffect(() => {
    if (animated) {
      Animated.timing(animatedValue, {
        toValue: value,
        duration: 300,
        useNativeDriver: false,
      }).start();
    } else {
      animatedValue.setValue(value);
    }
  }, [value, animated, animatedValue]);

  const clampedValue = Math.min(Math.max(value, 0), 100);

  const width = animated
    ? animatedValue.interpolate({
        inputRange: [0, 100],
        outputRange: ['0%', '100%'],
      })
    : `${clampedValue}%`;

  return (
    <View style={[
      styles.progress,
      sizeStyles[size],
      style
    ]}>
      <Animated.View
        style={[
          styles.indicator,
          variantStyles[variant],
          { width }
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  progress: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: 999, // pill shape
    borderWidth: 3,
    borderColor: COLORS.neoBlack,
    backgroundColor: COLORS.neoCream,
    // Hard shadow for neo-brutalist style
    shadowColor: COLORS.neoBlack,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  indicator: {
    height: '100%',
    borderRightWidth: 2,
    borderRightColor: COLORS.neoBlack,
  },
});

const sizeStyles = StyleSheet.create({
  sm: {
    height: 12,
  },
  default: {
    height: 20,
  },
  lg: {
    height: 28,
  },
});

const variantStyles = StyleSheet.create({
  default: {
    backgroundColor: COLORS.neoYellow,
  },
  success: {
    backgroundColor: COLORS.neoLime,
  },
  warning: {
    backgroundColor: COLORS.neoOrange,
  },
  danger: {
    backgroundColor: COLORS.neoRed,
  },
  accent: {
    backgroundColor: COLORS.neoPink,
  },
  cyan: {
    backgroundColor: COLORS.neoCyan,
  },
});
