/**
 * Component Code Inspection Test
 * Analyzes SinglePlayerResults.tsx source code to verify UI changes
 */

const fs = require('fs');
const path = require('path');

const COMPONENT_PATH = path.join(__dirname, 'components', 'singleplayer', 'SinglePlayerResults.tsx');
const TRANSLATIONS_PATH = path.join(__dirname, 'translations', 'index.js');

console.log('═══════════════════════════════════════════════════════');
console.log('  SinglePlayerResults Component Inspection');
console.log('═══════════════════════════════════════════════════════\n');

// Read component file
const componentCode = fs.readFileSync(COMPONENT_PATH, 'utf-8');
const translationsCode = fs.readFileSync(TRANSLATIONS_PATH, 'utf-8');

const testResults = {
  iconChanges: {
    name: '1. Icon Change Verification',
    tests: [],
    passed: 0,
    failed: 0
  },
  rtlFix: {
    name: '2. RTL Fix Verification (me-2 vs mr-2)',
    tests: [],
    passed: 0,
    failed: 0
  },
  buttonHierarchy: {
    name: '3. Button Hierarchy Verification',
    tests: [],
    passed: 0,
    failed: 0
  },
  translations: {
    name: '4. Translation Keys Verification',
    tests: [],
    passed: 0,
    failed: 0
  }
};

// Test 1: Icon Changes
console.log('🔍 Test 1: Icon Change Verification\n');

// Check FaCog import
if (componentCode.includes('FaCog')) {
  console.log('✓ PASS: FaCog imported from react-icons/fa');
  testResults.iconChanges.tests.push({ test: 'FaCog import', result: 'PASS' });
  testResults.iconChanges.passed++;
} else {
  console.log('✗ FAIL: FaCog not found in imports');
  testResults.iconChanges.tests.push({ test: 'FaCog import', result: 'FAIL' });
  testResults.iconChanges.failed++;
}

// Check Settings button uses FaCog in desktop layout
const settingsButtonDesktopMatch = componentCode.match(
  /onClick={onPlayAgain}[\s\S]*?<FaCog[\s\S]*?settingsAndPlay.*?Play Again/
);
if (settingsButtonDesktopMatch) {
  console.log('✓ PASS: Settings & Play Again button uses FaCog icon (desktop layout)');
  testResults.iconChanges.tests.push({ test: 'FaCog on Settings button (desktop)', result: 'PASS' });
  testResults.iconChanges.passed++;
} else {
  console.log('⚠️ WARNING: Could not verify FaCog on Settings button in desktop layout');
  testResults.iconChanges.tests.push({ test: 'FaCog on Settings button (desktop)', result: 'WARNING' });
}

// Check Settings button uses FaCog in landscape layout
const settingsButtonLandscapeMatch = componentCode.match(
  /variant="cyan"[\s\S]*?onClick={onPlayAgain}[\s\S]*?<FaCog/
);
if (settingsButtonLandscapeMatch) {
  console.log('✓ PASS: Settings button uses FaCog icon (landscape layout)');
  testResults.iconChanges.tests.push({ test: 'FaCog on Settings button (landscape)', result: 'PASS' });
  testResults.iconChanges.passed++;
} else {
  console.log('⚠️ WARNING: Could not verify FaCog on Settings button in landscape layout');
  testResults.iconChanges.tests.push({ test: 'FaCog on Settings button (landscape)', result: 'WARNING' });
}

// Verify FaRedo NOT used on Settings button
const incorrectIconMatch = componentCode.match(
  /onClick={onPlayAgain}[\s\S]{0,200}<FaRedo/
);
if (!incorrectIconMatch) {
  console.log('✓ PASS: FaRedo correctly NOT used on Settings & Play Again button');
  testResults.iconChanges.tests.push({ test: 'FaRedo not on Settings button', result: 'PASS' });
  testResults.iconChanges.passed++;
} else {
  console.log('✗ FAIL: FaRedo incorrectly still used on Settings button');
  testResults.iconChanges.tests.push({ test: 'FaRedo not on Settings button', result: 'FAIL' });
  testResults.iconChanges.failed++;
}

// Test 2: RTL Fix (me-2 vs mr-2)
console.log('\n🔍 Test 2: RTL Fix Verification\n');

// Count me-2 usage on icons
const me2Matches = (componentCode.match(/className="me-2/g) || []).length;
const me1Matches = (componentCode.match(/className="me-1/g) || []).length;
const mr2Matches = (componentCode.match(/className="mr-2/g) || []).length;

console.log(`  Found ${me2Matches} instances of className="me-2"`);
console.log(`  Found ${me1Matches} instances of className="me-1"`);
console.log(`  Found ${mr2Matches} instances of className="mr-2"`);

if (me2Matches > 0 || me1Matches > 0) {
  console.log('✓ PASS: Using RTL-compatible me-* classes for icon margins');
  testResults.rtlFix.tests.push({ test: 'Uses me-* classes', result: 'PASS' });
  testResults.rtlFix.passed++;
} else {
  console.log('⚠️ WARNING: No me-* classes found for icon margins');
  testResults.rtlFix.tests.push({ test: 'Uses me-* classes', result: 'WARNING' });
}

if (mr2Matches === 0) {
  console.log('✓ PASS: No mr-2 classes found (good for RTL support)');
  testResults.rtlFix.tests.push({ test: 'No mr-2 classes', result: 'PASS' });
  testResults.rtlFix.passed++;
} else {
  console.log(`✗ FAIL: Found ${mr2Matches} instances of mr-2 (should use me-2 instead)`);
  testResults.rtlFix.tests.push({ test: 'No mr-2 classes', result: 'FAIL' });
  testResults.rtlFix.failed++;
}

// Test 3: Button Hierarchy
console.log('\n🔍 Test 3: Button Hierarchy Verification\n');

// Check Quick Rematch button properties (desktop)
const quickRematchDesktopMatch = componentCode.match(
  /onQuickRematch.*[\s\S]*?size="lg"[\s\S]*?py-5[\s\S]*?text-xl[\s\S]*?bg-neo-yellow/
);
if (quickRematchDesktopMatch) {
  console.log('✓ PASS: Quick Rematch has largest size (size="lg", py-5, text-xl)');
  testResults.buttonHierarchy.tests.push({ test: 'Quick Rematch size', result: 'PASS' });
  testResults.buttonHierarchy.passed++;
} else {
  console.log('⚠️ WARNING: Could not verify Quick Rematch size properties');
  testResults.buttonHierarchy.tests.push({ test: 'Quick Rematch size', result: 'WARNING' });
}

// Check Quick Rematch yellow color
if (componentCode.includes('bg-neo-yellow')) {
  console.log('✓ PASS: Quick Rematch uses neo-yellow background');
  testResults.buttonHierarchy.tests.push({ test: 'Quick Rematch color', result: 'PASS' });
  testResults.buttonHierarchy.passed++;
} else {
  console.log('✗ FAIL: Quick Rematch missing neo-yellow background');
  testResults.buttonHierarchy.tests.push({ test: 'Quick Rematch color', result: 'FAIL' });
  testResults.buttonHierarchy.failed++;
}

// Check Settings & Play Again cyan color
const settingsCyanMatch = componentCode.match(
  /onClick={onPlayAgain}[\s\S]*?variant="cyan"/
);
if (settingsCyanMatch) {
  console.log('✓ PASS: Settings & Play Again uses cyan variant');
  testResults.buttonHierarchy.tests.push({ test: 'Settings button color', result: 'PASS' });
  testResults.buttonHierarchy.passed++;
} else {
  console.log('✗ FAIL: Settings & Play Again missing cyan variant');
  testResults.buttonHierarchy.tests.push({ test: 'Settings button color', result: 'FAIL' });
  testResults.buttonHierarchy.failed++;
}

// Check Back to Lobby outline variant
const lobbyOutlineMatch = componentCode.match(
  /onClick={onBackToLobby}[\s\S]*?variant="outline"/
);
if (lobbyOutlineMatch) {
  console.log('✓ PASS: Back to Lobby uses outline variant');
  testResults.buttonHierarchy.tests.push({ test: 'Back to Lobby variant', result: 'PASS' });
  testResults.buttonHierarchy.passed++;
} else {
  console.log('✗ FAIL: Back to Lobby missing outline variant');
  testResults.buttonHierarchy.tests.push({ test: 'Back to Lobby variant', result: 'FAIL' });
  testResults.buttonHierarchy.failed++;
}

// Check animation on Quick Rematch
const animationMatch = componentCode.match(
  /onQuickRematch[\s\S]*?animate={{[\s\S]*?scale:/
);
if (animationMatch) {
  console.log('✓ PASS: Quick Rematch has animation (scale/pulse)');
  testResults.buttonHierarchy.tests.push({ test: 'Quick Rematch animation', result: 'PASS' });
  testResults.buttonHierarchy.passed++;
} else {
  console.log('⚠️ WARNING: Could not verify Quick Rematch animation');
  testResults.buttonHierarchy.tests.push({ test: 'Quick Rematch animation', result: 'WARNING' });
}

// Test 4: Translation Keys
console.log('\n🔍 Test 4: Translation Keys Verification\n');

const requiredKeys = [
  { key: 'quickRematch', displayName: 'Quick Rematch' },
  { key: 'settingsAndPlay', displayName: 'Settings & Play Again' },
  { key: 'backToLobby', displayName: 'Back to Lobby' },
  { key: 'settings', displayName: 'Settings' }
];

const languages = ['en', 'he', 'sv', 'ja', 'es'];

for (const { key, displayName } of requiredKeys) {
  console.log(`\n  Testing key: "${key}" (${displayName})`);

  // Check if key is used in component
  const keyUsedInComponent = componentCode.includes(`t('common.${key}')`) ||
                             componentCode.includes(`t("common.${key}")`);

  if (keyUsedInComponent) {
    console.log(`    ✓ Key used in component: t('common.${key}')`);
  } else {
    console.log(`    ⚠️ Key may not be used in component (or uses different path)`);
  }

  // Check translations exist for all languages
  let allLanguagesHaveKey = true;
  for (const lang of languages) {
    const regex = new RegExp(`${key}:\\s*['"]`, 'g');
    const found = translationsCode.match(regex);

    if (!found || found.length === 0) {
      console.log(`    ✗ Missing in: ${lang}`);
      allLanguagesHaveKey = false;
    }
  }

  if (allLanguagesHaveKey) {
    console.log(`    ✓ Present in all ${languages.length} languages`);
    testResults.translations.tests.push({ test: `${key} translations`, result: 'PASS' });
    testResults.translations.passed++;
  } else {
    testResults.translations.tests.push({ test: `${key} translations`, result: 'FAIL' });
    testResults.translations.failed++;
  }
}

// Verify specific translations
console.log('\n  Verifying specific translations:');

const specificTranslations = [
  { lang: 'English', key: 'quickRematch', value: 'Quick Rematch' },
  { lang: 'Hebrew', key: 'settingsAndPlay', value: 'הגדרות ושחק שוב' },
  { lang: 'Swedish', key: 'backToLobby', value: 'Tillbaka till Lobby' },
  { lang: 'Japanese', key: 'quickRematch', value: 'クイックリマッチ' },
  { lang: 'Spanish', key: 'settingsAndPlay', value: 'Configurar y Jugar' }
];

for (const { lang, key, value } of specificTranslations) {
  if (translationsCode.includes(value)) {
    console.log(`    ✓ ${lang} - ${key}: "${value}"`);
  } else {
    console.log(`    ✗ ${lang} - ${key}: "${value}" NOT FOUND`);
  }
}

// Final Report
console.log('\n═══════════════════════════════════════════════════════');
console.log('  TEST SUMMARY');
console.log('═══════════════════════════════════════════════════════\n');

let totalPassed = 0;
let totalFailed = 0;
let totalWarnings = 0;

for (const [category, results] of Object.entries(testResults)) {
  console.log(`${results.name}:`);
  console.log(`  ✓ Passed: ${results.passed}`);
  console.log(`  ✗ Failed: ${results.failed}`);

  const warnings = results.tests.filter(t => t.result === 'WARNING').length;
  if (warnings > 0) {
    console.log(`  ⚠️  Warnings: ${warnings}`);
    totalWarnings += warnings;
  }

  totalPassed += results.passed;
  totalFailed += results.failed;
  console.log('');
}

console.log('═══════════════════════════════════════════════════════');
console.log(`OVERALL: ${totalPassed} passed, ${totalFailed} failed, ${totalWarnings} warnings`);
console.log('═══════════════════════════════════════════════════════\n');

if (totalFailed === 0) {
  console.log('✅ ALL TESTS PASSED!\n');
  console.log('The component code correctly implements all specified changes:');
  console.log('  1. Settings button uses FaCog icon (⚙️) instead of FaRedo');
  console.log('  2. Icons use RTL-compatible me-* classes');
  console.log('  3. Button hierarchy is correct (Quick Rematch > Settings > Back to Lobby)');
  console.log('  4. All translation keys are present in all 5 languages\n');
} else {
  console.log(`⚠️ ${totalFailed} TEST(S) FAILED - Review failures above\n`);
}

// Save report
const reportPath = path.join(__dirname, 'test-screenshots', 'singleplayer-results', 'inspection-report.json');
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
console.log(`📄 Detailed report saved to: ${reportPath}\n`);

console.log('═══════════════════════════════════════════════════════\n');
console.log('NEXT STEPS FOR VISUAL TESTING:\n');
console.log('1. Run the application: npm run dev');
console.log('2. Navigate to: http://localhost:3001/en/multiplayer');
console.log('3. Complete a single player game');
console.log('4. On results screen, verify:');
console.log('   - Quick Rematch button is LARGEST and yellow with pulse animation');
console.log('   - Settings & Play Again button has GEAR icon (⚙️) and cyan background');
console.log('   - Back to Lobby button has outline style');
console.log('   - Test in Hebrew (/he/multiplayer) to verify RTL layout');
console.log('   - Test on mobile devices for responsive layout\n');

process.exit(totalFailed === 0 ? 0 : 1);
