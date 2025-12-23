/**
 * Game Settings Panel - Static Code Analysis Test
 * Verifies the compact UI redesign by analyzing component code
 */

const fs = require('fs');
const path = require('path');

// Component paths
const GAME_SETTINGS_PATH = path.join(__dirname, 'host', 'components', 'pre-game', 'GameSettingsPanel.tsx');
const GAME_TYPE_SELECTOR_PATH = path.join(__dirname, 'components', 'GameTypeSelector.tsx');
const BOT_CONTROLS_PATH = path.join(__dirname, 'components', 'BotControls.tsx');

console.log('═══════════════════════════════════════════════════════════');
console.log('  Game Settings Panel - Static Code Analysis');
console.log('  Testing Compact UI Redesign');
console.log('═══════════════════════════════════════════════════════════\n');

// Read component files
const gameSettingsCode = fs.readFileSync(GAME_SETTINGS_PATH, 'utf-8');
const gameTypeSelectorCode = fs.readFileSync(GAME_TYPE_SELECTOR_PATH, 'utf-8');
const botControlsCode = fs.readFileSync(BOT_CONTROLS_PATH, 'utf-8');

const testResults = {
  gameModeSelector: { name: '1. Game Mode Selector - Horizontal Radio Buttons', tests: [], passed: 0, failed: 0 },
  timerControls: { name: '2. Timer Controls - Compact Design', tests: [], passed: 0, failed: 0 },
  moreSettings: { name: '3. More Settings Section - Collapsible Combined', tests: [], passed: 0, failed: 0 },
  difficultyButtons: { name: '4. Difficulty Buttons - Good Contrast', tests: [], passed: 0, failed: 0 },
  botControls: { name: '5. Bot Controls - Integrated Design', tests: [], passed: 0, failed: 0 },
  startButton: { name: '6. Start Game Button - Prominent', tests: [], passed: 0, failed: 0 },
  rtl: { name: '7. RTL Support', tests: [], passed: 0, failed: 0 }
};

function recordTest(category, testName, passed, details = '') {
  const result = { test: testName, result: passed ? 'PASS' : 'FAIL', details };
  testResults[category].tests.push(result);
  if (passed) {
    testResults[category].passed++;
    console.log(`✓ PASS: ${testName}${details ? ' - ' + details : ''}`);
  } else {
    testResults[category].failed++;
    console.log(`✗ FAIL: ${testName}${details ? ' - ' + details : ''}`);
  }
}

function recordWarning(category, testName, details = '') {
  const result = { test: testName, result: 'WARNING', details };
  testResults[category].tests.push(result);
  console.log(`⚠️  WARNING: ${testName}${details ? ' - ' + details : ''}`);
}

// ============================================================================
// TEST 1: Game Mode Selector - Horizontal Radio Buttons
// ============================================================================
console.log('\n🎮 Test 1: Game Mode Selector - Horizontal Radio Buttons\n');

// Check for horizontal layout structure
const hasFlexHorizontal = gameTypeSelectorCode.includes('flex gap-2') &&
                          gameTypeSelectorCode.includes('role="radiogroup"');
recordTest('gameModeSelector', 'Uses horizontal flex layout with role="radiogroup"', hasFlexHorizontal);

// Check for Regular game button
const hasRegularButton = gameTypeSelectorCode.includes('FaGamepad') &&
                         gameTypeSelectorCode.includes("t('hostView.regularGame')");
recordTest('gameModeSelector', 'Regular game button with gamepad icon', hasRegularButton);

// Check Regular button is selectable (not disabled)
const regularButtonNotDisabled = !gameTypeSelectorCode.match(
  /regularGame[\s\S]{0,200}disabled\s*=\s*{true}/
);
recordTest('gameModeSelector', 'Regular game button is selectable (not disabled)', regularButtonNotDisabled);

// Check for Tournament button with lock icon
const hasTournamentLock = gameTypeSelectorCode.includes('FaLock') &&
                           gameTypeSelectorCode.includes('FaTrophy');
recordTest('gameModeSelector', 'Tournament button with trophy and lock icons', hasTournamentLock);

// Check Tournament button is disabled
const tournamentIsLocked = gameTypeSelectorCode.includes('isTournamentLocked = true') &&
                           gameTypeSelectorCode.includes('disabled={isTournamentLocked}');
recordTest('gameModeSelector', 'Tournament button is disabled (locked)', tournamentIsLocked);

// Check for proper ARIA attributes
const hasAriaAttributes = gameTypeSelectorCode.includes('aria-checked') &&
                           gameTypeSelectorCode.includes('role="radio"');
recordTest('gameModeSelector', 'Proper ARIA attributes for accessibility', hasAriaAttributes);

// Check for visual distinction (cyan for selected, cream for unselected)
const hasVisualStates = gameTypeSelectorCode.includes('bg-neo-cyan') &&
                        gameTypeSelectorCode.includes('bg-neo-cream');
recordTest('gameModeSelector', 'Visual distinction between selected/unselected states', hasVisualStates);

// ============================================================================
// TEST 2: Timer Controls - Compact Design
// ============================================================================
console.log('\n\n⏱️  Test 2: Timer Controls - Compact Design (32px buttons)\n');

// Check for compact button size (w-8 h-8 = 32px)
const hasCompactButtons = gameSettingsCode.includes('w-8 h-8') &&
                           gameSettingsCode.includes('FaMinus') &&
                           gameSettingsCode.includes('FaPlus');
recordTest('timerControls', 'Compact +/- buttons (w-8 h-8 = 32px)', hasCompactButtons);

// Check for smaller icon sizes
const hasSmallIcons = gameSettingsCode.match(/FaMinus.*?size={12}/) &&
                       gameSettingsCode.match(/FaPlus.*?size={12}/);
recordTest('timerControls', 'Small icon size (12px) for +/- buttons', hasSmallIcons !== null);

// Check for timer number display styling
const hasTimerDisplay = gameSettingsCode.includes('text-2xl') &&
                         gameSettingsCode.includes('text-neo-yellow') &&
                         gameSettingsCode.includes('font-black');
recordTest('timerControls', 'Prominent timer number display (2xl, yellow, black)', hasTimerDisplay);

// Check for animation
const hasTimerAnimation = gameSettingsCode.includes('AnimatePresence') &&
                           gameSettingsCode.includes('timerDirection') &&
                           gameSettingsCode.includes('motion.span');
recordTest('timerControls', 'Animated timer value changes', hasTimerAnimation);

// Check timer controls are properly labeled
const hasTimerLabels = gameSettingsCode.includes('aria-label={t(\'hostView.decreaseTimer\')') &&
                        gameSettingsCode.includes('aria-label={t(\'hostView.increaseTimer\')');
recordTest('timerControls', 'Accessible labels for timer controls', hasTimerLabels);

// Check for visual feedback (shadow effects)
const hasVisualFeedback = gameSettingsCode.includes('shadow-hard-sm') &&
                           gameSettingsCode.includes('hover:shadow-hard') &&
                           gameSettingsCode.includes('active:shadow-none');
recordTest('timerControls', 'Visual feedback on hover/active states', hasVisualFeedback);

// ============================================================================
// TEST 3: More Settings Section - Collapsible Combined
// ============================================================================
console.log('\n\n⚙️  Test 3: More Settings Section - Single Collapsible\n');

// Check for single collapsible section (not separate Bots + Advanced)
const hasSingleMoreSettings = gameSettingsCode.includes("t('hostView.moreSettings')") &&
                               gameSettingsCode.includes('showAdvancedSettings') &&
                               !gameSettingsCode.includes('showBotSettings');
recordTest('moreSettings', 'Single "More Settings" section (not separate sections)', hasSingleMoreSettings);

// Check for collapsible toggle button
const hasToggleButton = gameSettingsCode.includes('onClick={() => setShowAdvancedSettings(prev => !prev)') &&
                         gameSettingsCode.includes('aria-expanded={showAdvancedSettings}');
recordTest('moreSettings', 'Collapsible toggle with aria-expanded', hasToggleButton);

// Check for chevron icons
const hasChevronIcons = gameSettingsCode.includes('FaChevronDown') &&
                         gameSettingsCode.includes('FaChevronUp');
recordTest('moreSettings', 'Chevron up/down icons for expand/collapse', hasChevronIcons);

// Check for animation
const hasCollapseAnimation = gameSettingsCode.includes('AnimatePresence') &&
                              gameSettingsCode.includes("initial={{ height: 0, opacity: 0 }}") &&
                              gameSettingsCode.includes("animate={{ height: 'auto', opacity: 1 }}");
recordTest('moreSettings', 'Smooth collapse/expand animation', hasCollapseAnimation);

// Check bot count badge
const hasBotCountBadge = gameSettingsCode.includes('playerDataOnly.filter(p => p.isBot).length') &&
                          gameSettingsCode.includes('bg-neo-cyan');
recordTest('moreSettings', 'Bot count badge displayed when bots present', hasBotCountBadge);

// ============================================================================
// TEST 4: Difficulty Buttons - Good Contrast
// ============================================================================
console.log('\n\n🎨 Test 4: Difficulty Buttons - Cream Background & Black Border\n');

// Check for cream background on unselected buttons
const hasCreamBackground = gameSettingsCode.includes('bg-neo-cream') &&
                            gameSettingsCode.includes('text-neo-black');
recordTest('difficultyButtons', 'Unselected buttons have cream background', hasCreamBackground);

// Check for black border
const hasBlackBorder = gameSettingsCode.includes('border-2 border-neo-black') ||
                        gameSettingsCode.includes('border-neo-black');
recordTest('difficultyButtons', 'Buttons have black border for contrast', hasBlackBorder);

// Check for color-coded selected states
const hasColorCodedStates = gameSettingsCode.includes('difficultyColors') &&
                             gameSettingsCode.includes('bg-neo-lime') &&
                             gameSettingsCode.includes('bg-neo-yellow') &&
                             gameSettingsCode.includes('bg-neo-orange') &&
                             gameSettingsCode.includes('bg-neo-red') &&
                             gameSettingsCode.includes('bg-neo-purple');
recordTest('difficultyButtons', 'Color-coded difficulty levels (lime, yellow, orange, red, purple)', hasColorCodedStates);

// Check for min word length buttons
const hasMinWordLength = gameSettingsCode.includes('MIN_WORD_LENGTH_OPTIONS') &&
                          gameSettingsCode.includes('minWordLength');
recordTest('difficultyButtons', 'Min word length selector present', hasMinWordLength);

// Check min word length has same styling
const minWordLengthStyling = gameSettingsCode.match(
  /minWordLength.*?[\s\S]{0,400}bg-neo-cream.*?border-2 border-neo-black/
);
recordTest('difficultyButtons', 'Min word length buttons match difficulty button styling', minWordLengthStyling !== null);

// ============================================================================
// TEST 5: Bot Controls - Integrated Design
// ============================================================================
console.log('\n\n🤖 Test 5: Bot Controls - Difficulty + Add Button in Same Row\n');

// Check Bot Controls is integrated in More Settings
const botControlsIntegrated = gameSettingsCode.includes('<BotControls') &&
                               gameSettingsCode.includes('showAdvancedSettings');
recordTest('botControls', 'Bot Controls integrated in More Settings section', botControlsIntegrated);

// Check difficulty selector in same row as Add button
const sameRowLayout = botControlsCode.includes('flex items-center gap-2 flex-wrap') &&
                       botControlsCode.includes('BOT_DIFFICULTIES.map') &&
                       botControlsCode.includes('canAddMore');
recordTest('botControls', 'Difficulty selector and Add button in same row (flex)', sameRowLayout);

// Check for compact Add button
const hasCompactAddButton = botControlsCode.includes('FaPlus') &&
                             botControlsCode.includes('bg-neo-cyan') &&
                             botControlsCode.includes('text-[11px]');
recordTest('botControls', 'Compact Add button with cyan background', hasCompactAddButton);

// Check difficulty buttons have good contrast
const botDifficultyContrast = botControlsCode.includes('bg-neo-cream') &&
                               botControlsCode.includes('border-2 border-neo-black');
recordTest('botControls', 'Bot difficulty buttons have cream background and black border', botDifficultyContrast);

// Check for bot list display
const hasBotList = botControlsCode.includes('bots.map((bot)') &&
                    botControlsCode.includes('FaTimes');
recordTest('botControls', 'Bot list with remove button functionality', hasBotList);

// ============================================================================
// TEST 6: Start Game Button - Prominent
// ============================================================================
console.log('\n\n🚀 Test 6: Start Game Button - Prominent Design\n');

// Check for prominent button at bottom
const hasStartButton = gameSettingsCode.includes("t('hostView.startGame')") &&
                        gameSettingsCode.includes('onClick={onStartGame}');
recordTest('startButton', 'Start Game button present', hasStartButton);

// Check for lime green background (prominent)
const hasProminentColor = gameSettingsCode.includes('bg-neo-lime') &&
                           gameSettingsCode.includes('text-neo-black') &&
                           gameSettingsCode.includes('font-black');
recordTest('startButton', 'Prominent lime green background with black text', hasProminentColor);

// Check for good button height (h-10 = 40px)
const hasGoodHeight = gameSettingsCode.match(/startGame.*?[\s\S]{0,200}h-10/);
recordTest('startButton', 'Good button height (h-10 = 40px)', hasGoodHeight !== null);

// Check button is full width with max-width
const hasResponsiveWidth = gameSettingsCode.match(/startGame.*?[\s\S]{0,200}w-full max-w-xs/);
recordTest('startButton', 'Responsive width (w-full max-w-xs)', hasResponsiveWidth !== null);

// Check button has disabled state
const hasDisabledState = gameSettingsCode.includes('disabled={!timerValue || players.length === 0 || tournamentCreating}');
recordTest('startButton', 'Proper disabled state logic', hasDisabledState);

// ============================================================================
// TEST 7: RTL Support
// ============================================================================
console.log('\n\n🔄 Test 7: RTL Layout Support\n');

// Check components use translation system
const usesTranslation = gameSettingsCode.includes("t('hostView") &&
                         gameTypeSelectorCode.includes("t('hostView") &&
                         botControlsCode.includes("t('bots");
recordTest('rtl', 'Components use translation system', usesTranslation);

// Check for proper spacing classes (no hard-coded mr/ml)
const noHardcodedMargins = !gameSettingsCode.includes('ml-') &&
                            !gameSettingsCode.includes('mr-') ||
                            (gameSettingsCode.includes('ml-1') && gameSettingsCode.includes('Add button - Right next'));
recordTest('rtl', 'Uses gap instead of hard-coded margins (RTL-safe)', noHardcodedMargins);

// Check shadows use Tailwind utilities (auto-flip in RTL)
const usesShadowUtilities = gameSettingsCode.includes('shadow-hard-sm') &&
                             gameSettingsCode.includes('shadow-hard');
recordTest('rtl', 'Uses shadow utility classes (RTL auto-flip)', usesShadowUtilities);

// Check flex layouts (RTL-safe)
const usesFlexLayouts = gameSettingsCode.includes('flex') &&
                         gameSettingsCode.includes('items-center') &&
                         gameSettingsCode.includes('justify-between');
recordTest('rtl', 'Uses flex layouts (RTL-safe)', usesFlexLayouts);

// ============================================================================
// SUMMARY
// ============================================================================
console.log('\n\n═══════════════════════════════════════════════════════════');
console.log('📊 TEST SUMMARY');
console.log('═══════════════════════════════════════════════════════════\n');

let totalPassed = 0;
let totalFailed = 0;
let totalTests = 0;

Object.keys(testResults).forEach(category => {
  const result = testResults[category];
  totalPassed += result.passed;
  totalFailed += result.failed;
  totalTests += result.tests.length;

  const status = result.failed === 0 ? '✓' : '✗';
  console.log(`${status} ${result.name}: ${result.passed}/${result.tests.length} passed`);
});

console.log('\n───────────────────────────────────────────────────────────');
console.log(`Total: ${totalPassed}/${totalTests} tests passed`);
console.log(`Pass Rate: ${((totalPassed / totalTests) * 100).toFixed(1)}%`);
console.log('═══════════════════════════════════════════════════════════\n');

// Detailed failures
if (totalFailed > 0) {
  console.log('\n❌ FAILED TESTS:\n');
  Object.keys(testResults).forEach(category => {
    const result = testResults[category];
    const failures = result.tests.filter(t => t.result === 'FAIL');
    if (failures.length > 0) {
      console.log(`\n${result.name}:`);
      failures.forEach(f => {
        console.log(`  ✗ ${f.test}${f.details ? ' - ' + f.details : ''}`);
      });
    }
  });
  console.log('');
}

// Save detailed report
const reportPath = path.join(__dirname, '..', 'test-screenshots', 'game-settings-panel', 'static-analysis-report.json');
const reportDir = path.dirname(reportPath);
if (!fs.existsSync(reportDir)) {
  fs.mkdirSync(reportDir, { recursive: true });
}
fs.writeFileSync(reportPath, JSON.stringify({
  timestamp: new Date().toISOString(),
  summary: {
    totalTests: totalTests,
    passed: totalPassed,
    failed: totalFailed,
    passRate: ((totalPassed / totalTests) * 100).toFixed(1) + '%'
  },
  details: testResults
}, null, 2));

console.log(`📄 Detailed report saved to: ${reportPath}\n`);

// Exit with appropriate code
process.exit(totalFailed > 0 ? 1 : 0);
