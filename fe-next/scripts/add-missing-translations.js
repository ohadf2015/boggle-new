// Script to add missing translations based on the analysis
const fs = require('fs');
const path = require('path');

// Missing translations with English text (extracted from code fallbacks)
const missingTranslations = {
  // Challenge section
  'challenge.settingRecord': 'Setting your first record!',
  'challenge.aheadOfRecord': '+{diff} ahead of record!',
  'challenge.behindRecord': '{diff} to beat your record',
  'challenge.tiedWithRecord': 'Tied with your record!',

  // Chat section
  'chat.send': 'Send message',
  'chat.newMessages': 'New chat messages',

  // Common section
  'common.loadingProfile': 'Loading profile...',
  'common.rematch': 'Rematch',
  'common.roomFull': 'Room is full. You joined as a spectator.',
  'common.selectLanguage': 'Select language',

  // Errors section
  'errors.connectionLost': 'Connection lost',
  'errors.connectionTimeout': 'Connection timeout',
  'errors.notConnected': 'Not connected to server',
  'errors.rateLimited': 'Too many requests. Please slow down.',

  // Host View section
  'hostView.creatingTournament': 'Creating tournament...',
  'hostView.increaseRounds': 'Increase number of rounds',
  'hostView.decreaseRounds': 'Decrease number of rounds',
  'hostView.resetFailed': 'Failed to reset game',

  // How To Play section
  'howToPlay.demo.play': 'Play Demo',

  // Join View section
  'joinView.loadingProfile': 'Loading profile...',
  'joinView.nickname': 'Nickname',
  'joinView.nicknamePlaceholder': 'Enter your nickname',
  'joinView.roomCode': 'Room Code',

  // Music section
  'music.musicVolumeSlider': 'Music volume slider',
  'music.sfxVolumeSlider': 'Sound effects volume slider',

  // Player View section
  'playerView.rankings': 'Rankings',
  'playerView.showLeaderboard': 'Show leaderboard',
  'playerView.slowDown': 'Slow down! Words are being processed.',
  'playerView.submittingTooFast': 'You\'re submitting words too fast',
  'playerView.words': 'Words',

  // Results section
  'results.rankings': 'Rankings',
  'results.yourWords': 'Your Words',

  // Single Player section
  'singlePlayer.botDetails': 'Bot Details',
  'singlePlayer.difficulty': 'Difficulty',
  'singlePlayer.timer': 'Timer',
  'singlePlayer.totalScore': 'Total Score',
  'singlePlayer.wordsByLength': 'Words by Length',

  // Social section
  'social.games': 'games',
  'social.newRecord': 'New record!',
  'social.online': 'online',

  // Validation section
  'validation.gameCodeHint': 'Enter the game code shared by the host',
};

function addTranslationsToFile() {
  const translationsPath = path.join(__dirname, '..', 'translations', 'index.js');
  let content = fs.readFileSync(translationsPath, 'utf8');

  // For each missing key, add it to the appropriate section in all languages
  Object.entries(missingTranslations).forEach(([key, englishValue]) => {
    const [section, ...keyPath] = key.split('.');
    const leafKey = keyPath.join('.');

    console.log(`Adding ${key} = "${englishValue}"`);

    // Find each language section and add the key
    const languages = ['en', 'he', 'sv', 'ja', 'es'];

    languages.forEach(lang => {
      const sectionRegex = new RegExp(`(  ${lang}: {[\\s\\S]*?    ${section}: {)([\\s\\S]*?)(    },)`, 'm');
      const match = content.match(sectionRegex);

      if (match) {
        // Check if key already exists
        const existingKeyRegex = new RegExp(`\\s+${leafKey}:`, 'm');
        if (existingKeyRegex.test(match[2])) {
          console.log(`  - ${lang}: Key already exists, skipping`);
          return;
        }

        // Add the key at the end of the section
        const value = lang === 'en' ? englishValue : `[${lang.toUpperCase()}] ${englishValue}`;
        const newKey = `      ${leafKey}: '${value}',\n`;

        const replacement = match[1] + match[2] + newKey + match[3];
        content = content.replace(sectionRegex, replacement);
        console.log(`  - ${lang}: Added`);
      } else {
        console.log(`  - ${lang}: Section not found`);
      }
    });
  });

  fs.writeFileSync(translationsPath, content, 'utf8');
  console.log('\n✓ Translations added successfully!');
}

addTranslationsToFile();
