import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  ViewStyle,
  ActivityIndicator,
} from 'react-native';
import { COLORS } from '../constants/game';

/**
 * Neo-Brutalist Loading Components - React Native
 * Ported from fe-next/components/LoadingState.jsx
 * Features: Spinner, Overlay, Inline loading, Skeleton loader
 */

export type LoadingSize = 'sm' | 'md' | 'lg' | 'xl';

interface LoadingSpinnerProps {
  size?: LoadingSize;
  style?: ViewStyle;
}

/**
 * LoadingSpinner - Neo-Brutalist styled loading spinner
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  style,
}) => {
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const sizeMap = {
    sm: 20,
    md: 40,
    lg: 56,
    xl: 80,
  };

  const borderMap = {
    sm: 2,
    md: 3,
    lg: 4,
    xl: 4,
  };

  const spinnerSize = sizeMap[size];
  const borderWidth = borderMap[size];

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={[styles.spinnerContainer, style]} accessible accessibilityLabel="Loading">
      <Animated.View
        style={[
          styles.spinner,
          {
            width: spinnerSize,
            height: spinnerSize,
            borderWidth,
            borderTopColor: COLORS.neoYellow,
            borderRightColor: COLORS.neoBlack,
            borderBottomColor: COLORS.neoBlack,
            borderLeftColor: COLORS.neoBlack,
            transform: [{ rotate }],
          },
        ]}
      />
    </View>
  );
};

interface LoadingOverlayProps {
  message?: string;
  transparent?: boolean;
}

/**
 * LoadingOverlay - Neo-Brutalist styled loading overlay
 */
export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  message = 'Loading...',
  transparent = false,
}) => {
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const rotateAnim = useRef(new Animated.Value(-5)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 120,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.spring(rotateAnim, {
        toValue: 2,
        tension: 120,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View
      style={[
        styles.overlayContainer,
        {
          backgroundColor: transparent
            ? 'rgba(0, 0, 0, 0.5)'
            : 'rgba(0, 0, 0, 0.8)',
        },
      ]}
      accessible
      accessibilityLabel="Loading overlay"
      accessibilityLiveRegion="assertive"
    >
      <Animated.View
        style={[
          styles.overlayContent,
          {
            transform: [
              { scale: scaleAnim },
              {
                rotate: rotateAnim.interpolate({
                  inputRange: [-5, 2],
                  outputRange: ['-5deg', '2deg'],
                }),
              },
            ],
          },
        ]}
      >
        <LoadingSpinner size="lg" />
        <Text style={styles.overlayText}>{message}</Text>
      </Animated.View>
    </View>
  );
};

interface InlineLoadingProps {
  message?: string;
  size?: LoadingSize;
}

/**
 * InlineLoading - Neo-Brutalist styled inline loading
 */
export const InlineLoading: React.FC<InlineLoadingProps> = ({
  message = 'Loading...',
  size = 'md',
}) => {
  return (
    <View style={styles.inlineContainer} accessible accessibilityLabel="Loading">
      <LoadingSpinner size={size} />
      <Text style={styles.inlineText}>{message}</Text>
    </View>
  );
};

interface SkeletonLoaderProps {
  style?: ViewStyle;
  count?: number;
}

/**
 * SkeletonLoader - Neo-Brutalist styled skeleton loader
 */
export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  style,
  count = 1,
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.5,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <Animated.View
          key={index}
          style={[
            styles.skeleton,
            style,
            { opacity: pulseAnim },
          ]}
          accessible
          accessibilityLabel="Loading content"
        />
      ))}
    </>
  );
};

interface ButtonLoaderProps {
  children: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  onPress?: () => void;
}

/**
 * ButtonLoader - Neo-Brutalist styled button with loading state
 */
export const ButtonLoader: React.FC<ButtonLoaderProps> = ({
  children,
  loading = false,
  disabled = false,
  style,
  onPress,
}) => {
  return (
    <View style={[styles.buttonContainer, style]}>
      {loading ? (
        <View style={styles.buttonLoadingContent}>
          <ActivityIndicator size="small" color={COLORS.neoBlack} />
          <Text style={styles.buttonText}>{children}</Text>
        </View>
      ) : (
        <Text style={styles.buttonText}>{children}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  spinnerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    borderRadius: 1000,
  },
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 50,
  },
  overlayContent: {
    backgroundColor: COLORS.neoCream,
    borderWidth: 4,
    borderColor: COLORS.neoBlack,
    borderRadius: 12,
    shadowColor: COLORS.neoBlack,
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 12,
    padding: 32,
    alignItems: 'center',
    gap: 16,
  },
  overlayText: {
    fontSize: 16,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: COLORS.neoBlack,
  },
  inlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  inlineText: {
    fontWeight: '700',
    color: COLORS.neoCream,
    fontSize: 14,
  },
  skeleton: {
    backgroundColor: COLORS.neoNavyLight,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLoadingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
