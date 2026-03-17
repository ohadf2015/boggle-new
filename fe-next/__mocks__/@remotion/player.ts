// Mock for @remotion/player
import React from 'react';

const Player = React.forwardRef(function Player(props: Record<string, unknown>, ref: React.Ref<unknown>) {
  return React.createElement('div', { 'data-testid': 'remotion-player', ref }, null);
});

module.exports = { Player };
