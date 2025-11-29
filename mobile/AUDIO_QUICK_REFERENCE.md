# Audio System - Quick Reference Card

## Import
```typescript
import { useAudio } from '../src/features/audio/AudioContext';
```

## Music Playback

### Play Track (Quick)
```typescript
const { playTrack, isAudioReady } = useAudio();

// Always check audio ready
if (isAudioReady) {
  playTrack('LOBBY');          // Home screen
  playTrack('BEFORE_GAME');    // Waiting room
  playTrack('IN_GAME');        // Gameplay
  playTrack('ALMOST_OUT_OF_TIME'); // Final minute
}
```

### Play with Custom Fade
```typescript
const { fadeToTrack } = useAudio();

fadeToTrack('IN_GAME', 1000, 2000);
//           ^^^^^^^^  ^^^^  ^^^^
//           track     fade  fade
//                     out   in
```

### Stop Music
```typescript
const { stopMusic } = useAudio();

stopMusic(1000); // Fade out over 1 second
```

## Sound Effects

### Quick Methods (Recommended)
```typescript
const {
  playWordAcceptedSound,
  playWordRejectedSound,
  playComboSound,
  playAchievementSound,
} = useAudio();

// Word submission
playWordAcceptedSound();  // Valid word
playWordRejectedSound();  // Invalid word

// Combo (auto pitch scaling)
playComboSound(5);  // Level 5 = ~1.3x pitch

// Achievement
playAchievementSound();
```

### Advanced SFX
```typescript
const { playSoundEffect } = useAudio();

playSoundEffect('GAME_START', {
  volume: 0.8,      // 80% of sfx volume
  pitchShift: 1.2,  // 20% higher pitch
});
```

## Volume Control

```typescript
const {
  musicVolume,      // Current music volume (0-1)
  sfxVolume,        // Current SFX volume (0-1)
  setMusicVolume,   // Set music volume
  setSfxVolume,     // Set SFX volume
} = useAudio();

// In settings screen
<Slider
  value={musicVolume}
  onValueChange={setMusicVolume}
  minimumValue={0}
  maximumValue={1}
/>
```

## Mute Toggles

```typescript
const {
  isMusicMuted,
  isSfxMuted,
  toggleMusicMute,
  toggleSfxMute,
} = useAudio();

// Button example
<Button onPress={toggleMusicMute}>
  {isMusicMuted ? '🔇' : '🔊'}
</Button>
```

## Common Patterns

### Game Flow
```typescript
// Lobby
useEffect(() => {
  if (isAudioReady) {
    playTrack('BEFORE_GAME');
  }
}, [isAudioReady]);

// Game Start
useEffect(() => {
  if (gameStarted) {
    playSoundEffect('GAME_START');
    fadeToTrack('IN_GAME', 500, 1000);
  }
}, [gameStarted]);

// Final Minute
useEffect(() => {
  if (timeRemaining === 60) {
    playSoundEffect('TIMER_WARNING');
    fadeToTrack('ALMOST_OUT_OF_TIME', 1000, 2000);
  }
}, [timeRemaining]);

// Game Over
useEffect(() => {
  if (gameOver) {
    playSoundEffect('GAME_END');
    stopMusic(1000);
  }
}, [gameOver]);
```

### Word Submission
```typescript
const handleWordSubmit = (word: string, isValid: boolean) => {
  if (isValid) {
    playWordAcceptedSound();
    incrementCombo();
  } else {
    playWordRejectedSound();
    resetCombo();
  }
};
```

### Combo Tracking
```typescript
useEffect(() => {
  if (comboLevel > 0) {
    playComboSound(comboLevel); // Auto pitch scaling
  }
}, [comboLevel]);
```

### Achievement Unlock
```typescript
const unlockAchievement = (achievement: Achievement) => {
  playAchievementSound();
  showAchievementPopup(achievement);
};
```

## Track Keys
```typescript
TRACKS.LOBBY                  // Home/lobby music
TRACKS.BEFORE_GAME           // Pre-game waiting
TRACKS.IN_GAME               // Active gameplay
TRACKS.ALMOST_OUT_OF_TIME    // Final minute
```

## SFX Keys
```typescript
SFX.WORD_ACCEPTED    // Valid word
SFX.WORD_REJECTED    // Invalid word
SFX.COMBO            // Combo achievement
SFX.ACHIEVEMENT      // Achievement unlock
SFX.GAME_START       // Game beginning
SFX.GAME_END         // Game over
SFX.TIMER_WARNING    // Time warning
```

## Combo Pitch Scaling
```typescript
playComboSound(1)   // 1.0x (normal)
playComboSound(5)   // ~1.3x
playComboSound(10)  // ~1.6x
playComboSound(20)  // ~2.0x
// Capped at 3.0x
```

## State Flags
```typescript
const {
  isAudioReady,  // Audio system initialized
  isPlaying,     // Music currently playing
  currentTrack,  // Current track name or null
} = useAudio();

// Always check isAudioReady before playing
if (!isAudioReady) {
  console.log('Audio not ready yet');
  return;
}
```

## Best Practices

✅ **DO:**
- Check `isAudioReady` before playing
- Use convenience methods (`playWordAcceptedSound()`)
- Let system handle mute states
- Use `fadeToTrack()` for smooth transitions
- Clean up on unmount

❌ **DON'T:**
- Play audio before `isAudioReady`
- Check mute states manually
- Stop/start instead of fade
- Play too many sounds simultaneously
- Forget to handle errors

## Troubleshooting

**Audio not playing?**
```typescript
const { isAudioReady, isMusicMuted, musicVolume } = useAudio();
console.log('Ready:', isAudioReady);
console.log('Muted:', isMusicMuted);
console.log('Volume:', musicVolume);
```

**Settings not persisting?**
- Automatically saved to AsyncStorage
- Restored on app restart
- No manual save needed

**Performance issues?**
- Reduce simultaneous SFX
- Lower audio quality
- Check for memory leaks

## Files Location

Audio files: `/mobile/assets/audio/`
- All music and SFX are already in place
- No additional setup needed

---

**📚 Full Documentation:**
- `/mobile/AUDIO_INTEGRATION_GUIDE.md` - Complete guide
- `/mobile/AUDIO_SYSTEM_SUMMARY.md` - Feature summary
- `/mobile/MOBILE_AUDIO_UPDATE.md` - Change overview

**Last Updated:** 2025-11-29
