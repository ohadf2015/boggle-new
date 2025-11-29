import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { COLORS } from '../../constants/game';

// Neo-Brutalist Card Component
// Matches fe-next/components/ui/card.jsx design with thick borders and hard shadows

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  tilt?: 'left' | 'right';
  variant?: 'default' | 'dark';
}

interface CardHeaderProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

interface CardTitleProps {
  children: React.ReactNode;
  style?: TextStyle;
}

interface CardDescriptionProps {
  children: React.ReactNode;
  style?: TextStyle;
}

interface CardContentProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

interface CardFooterProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  tilt,
  variant = 'default'
}) => {
  const tiltTransform = tilt === 'left' ? '-2deg' : tilt === 'right' ? '2deg' : '0deg';

  return (
    <View
      style={[
        styles.card,
        variant === 'dark' ? styles.cardDark : styles.cardDefault,
        { transform: [{ rotate: tiltTransform }] },
        style
      ]}
    >
      {children}
    </View>
  );
};

export const CardDark: React.FC<CardProps> = (props) => {
  return <Card {...props} variant="dark" />;
};

export const CardHeader: React.FC<CardHeaderProps> = ({ children, style }) => {
  return (
    <View style={[styles.cardHeader, style]}>
      {children}
    </View>
  );
};

export const CardTitle: React.FC<CardTitleProps> = ({ children, style }) => {
  return (
    <Text style={[styles.cardTitle, style]}>
      {typeof children === 'string' ? children.toUpperCase() : children}
    </Text>
  );
};

export const CardDescription: React.FC<CardDescriptionProps> = ({ children, style }) => {
  return (
    <Text style={[styles.cardDescription, style]}>
      {children}
    </Text>
  );
};

export const CardContent: React.FC<CardContentProps> = ({ children, style }) => {
  return (
    <View style={[styles.cardContent, style]}>
      {children}
    </View>
  );
};

export const CardFooter: React.FC<CardFooterProps> = ({ children, style }) => {
  return (
    <View style={[styles.cardFooter, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 4,
    borderColor: COLORS.neoBlack,
    // Hard shadow for neo-brutalist style
    shadowColor: COLORS.neoBlack,
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 8,
  },
  cardDefault: {
    backgroundColor: COLORS.neoCream,
  },
  cardDark: {
    backgroundColor: COLORS.neoGray,
  },
  cardHeader: {
    padding: 20,
    gap: 6,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
    color: COLORS.neoBlack,
  },
  cardDescription: {
    fontSize: 14,
    color: COLORS.neoBlack,
    opacity: 0.7,
  },
  cardContent: {
    padding: 20,
    paddingTop: 0,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 0,
  },
});
