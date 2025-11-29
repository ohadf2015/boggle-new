// Example usage of GameHeader and CircularTimer components
// This file demonstrates how to integrate the components in a game screen

import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import GameHeader from './GameHeader';
import { COLORS } from '../../constants/game';

/**
 * Example Game Screen showing proper usage of GameHeader
 */
export default function ExampleGameScreen() {
  const [remainingTime, setRemainingTime] = useState(180);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);
  const totalRounds = 3;

  // Simulate countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setRemainingTime((prev) => {
        if (prev <= 0) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Simulate score increases
  const handleWordFound = (points: number) => {
    setScore((prev) => prev + points);
  };

  const handleLogoPress = () => {
    console.log('Logo pressed - could show menu or return to lobby');
  };

  return (
    <View style={styles.container}>
      {/* Game Header */}
      <GameHeader
        remainingTime={remainingTime}
        totalTime={180}
        score={score}
        round={round}
        totalRounds={totalRounds}
        onLogoPress={handleLogoPress}
      />

      {/* Game content would go here */}
      <View style={styles.gameContent}>
        {/* Add your game grid, word list, etc. here */}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.neoCream,
  },
  gameContent: {
    flex: 1,
    padding: 16,
  },
});

/**
 * Example: Using CircularTimer standalone
 */
export function ExampleTimerOnly() {
  const [remainingTime, setRemainingTime] = useState(180);

  useEffect(() => {
    const interval = setInterval(() => {
      setRemainingTime((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.timerContainer}>
      {/* Just the timer, no header */}
      {/*
      <CircularTimer
        remainingTime={remainingTime}
        totalTime={180}
      />
      */}
    </View>
  );
}

const timerStyles = StyleSheet.create({
  timerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.neoCream,
  },
});
