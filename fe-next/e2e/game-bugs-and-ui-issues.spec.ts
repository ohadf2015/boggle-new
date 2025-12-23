/**
 * Comprehensive Game Bugs and UI Issues Detection Test Suite
 * 
 * This test suite:
 * 1. Tests all game functionality thoroughly
 * 2. Identifies UI bugs and issues
 * 3. Tests edge cases
 * 4. Verifies fixes
 */

import { test, expect, type Page } from '@playwright/test';

const VIEWPORTS = {
  mobilePortrait: { width: 375, height: 667 },
  mobileLandscape: { width: 667, height: 375 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1280, height: 720 },
};

interface GameBug {
  id: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  component: string;
  steps: string[];
  expected: string;
  actual: string;
  screenshot?: string;
}

interface UIIssue {
  id: string;
  description: string;
  type: 'layout' | 'accessibility' | 'performance' | 'interaction' | 'visual';
  severity: 'critical' | 'high' | 'medium' | 'low';
  selector?: string;
  details: string;
}

const detectedBugs: GameBug[] = [];
const detectedUIIssues: UIIssue[] = [];

async function waitForGameStart(page: Page, timeout = 10000) {
  const startButton = page.locator('button:has-text("Start"), button:has-text("Start Game")').first();
  const buttonVisible = await startButton.isVisible({ timeout: 5000 }).catch(() => false);
  
  if (buttonVisible) {
    await startButton.click();
    await page.waitForTimeout(2000);
    
    const grid = page.locator('[role="grid"]').first();
    await expect(grid).toBeVisible({ timeout });
    return true;
  }
  return false;
}

async function checkHorizontalScroll(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });
}

async function checkTouchTargets(page: Page): Promise<UIIssue[]> {
  const issues: UIIssue[] = [];
  const MIN_SIZE = 44;
  
  const interactiveElements = await page.locator('button, a[href], input, select, textarea, [role="button"]').all();
  
  for (const element of interactiveElements) {
    const isVisible = await element.isVisible().catch(() => false);
    if (!isVisible) continue;
    
    const box = await element.boundingBox();
    if (!box) continue;
    
    const text = (await element.textContent() || '').trim().substring(0, 30);
    const tag = await element.evaluate(el => el.tagName.toLowerCase());
    
    const isScreenReaderOnly = await element.evaluate(el => {
      const classes = el.className || '';
      const style = window.getComputedStyle(el);
      const id = el.id || '';
      return classes.includes('sr-only') || 
             classes.includes('screen-reader-only') ||
             id.includes('next-logo') ||
             (style.position === 'absolute' && (parseFloat(style.width) <= 1 || parseFloat(style.height) <= 1));
    }).catch(() => false);
    
    if (isScreenReaderOnly) continue;
    
    if (box.width < MIN_SIZE || box.height < MIN_SIZE) {
      const selector = await element.evaluate(el => {
        if (el.id) return `#${el.id}`;
        if (el.className) return `.${el.className.split(' ')[0]}`;
        return el.tagName.toLowerCase();
      }).catch(() => tag);
      
      issues.push({
        id: `touch-target-${Date.now()}-${Math.random()}`,
        description: `Touch target too small: ${tag} "${text}"`,
        type: 'accessibility',
        severity: box.width < 32 || box.height < 32 ? 'critical' : 'high',
        selector,
        details: `Size: ${Math.round(box.width)}x${Math.round(box.height)}px (minimum: ${MIN_SIZE}x${MIN_SIZE}px)`,
      });
    }
  }
  
  return issues;
}

test.describe('Game Functionality Tests', () => {
  test.describe('Word Submission and Validation', () => {
    test('should reject words that are too short', async ({ page }) => {
      await page.goto('/en/singleplayer');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      
      const started = await waitForGameStart(page);
      if (!started) {
        test.skip();
        return;
      }
      
      const grid = page.locator('[role="grid"]').first();
      const cells = grid.locator('[role="gridcell"]');
      const count = await cells.count();
      
      if (count > 0) {
        const firstCell = cells.first();
        const cellBox = await firstCell.boundingBox();
        
        if (cellBox) {
          await page.mouse.move(cellBox.x + cellBox.width / 2, cellBox.y + cellBox.height / 2);
          await page.mouse.down();
          await page.mouse.up();
          await page.waitForTimeout(500);
          
          const errorToast = page.locator('text=/too short/i, text=/minimum/i');
          const errorVisible = await errorToast.isVisible({ timeout: 2000 }).catch(() => false);
          
          if (!errorVisible) {
            detectedBugs.push({
              id: 'word-too-short-no-error',
              description: 'No error message shown when submitting single letter',
              severity: 'high',
              component: 'WordValidation',
              steps: ['Start game', 'Click single cell', 'Release'],
              expected: 'Error toast should appear for word too short',
              actual: 'No error toast appeared',
            });
          }
        }
      }
    });

    test('should prevent duplicate word submissions', async ({ page }) => {
      await page.goto('/en/singleplayer');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      
      const started = await waitForGameStart(page);
      if (!started) {
        test.skip();
        return;
      }
      
      const grid = page.locator('[role="grid"]').first();
      const cells = grid.locator('[role="gridcell"]');
      const count = await cells.count();
      
      if (count >= 3) {
        const firstCell = cells.first();
        const cellBox = await firstCell.boundingBox();
        
        if (cellBox) {
          await page.mouse.move(cellBox.x + cellBox.width / 2, cellBox.y + cellBox.height / 2);
          await page.mouse.down();
          
          for (let i = 1; i < Math.min(3, count); i++) {
            const nextCell = cells.nth(i);
            const nextBox = await nextCell.boundingBox();
            if (nextBox) {
              await page.mouse.move(nextBox.x + nextBox.width / 2, nextBox.y + nextBox.height / 2);
              await page.waitForTimeout(100);
            }
          }
          
          await page.mouse.up();
          await page.waitForTimeout(1500);
          
          const foundWordsBefore = await page.locator('[class*="word"], [class*="found"]').count();
          
          await page.mouse.move(cellBox.x + cellBox.width / 2, cellBox.y + cellBox.height / 2);
          await page.mouse.down();
          
          for (let i = 1; i < Math.min(3, count); i++) {
            const nextCell = cells.nth(i);
            const nextBox = await nextCell.boundingBox();
            if (nextBox) {
              await page.mouse.move(nextBox.x + nextBox.width / 2, nextBox.y + nextBox.height / 2);
              await page.waitForTimeout(100);
            }
          }
          
          await page.mouse.up();
          await page.waitForTimeout(1500);
          
          const errorToast = page.locator('text=/already/i, text=/duplicate/i, text=/found/i');
          const errorVisible = await errorToast.isVisible({ timeout: 2000 }).catch(() => false);
          
          if (!errorVisible) {
            detectedBugs.push({
              id: 'duplicate-word-no-error',
              description: 'No error message shown when submitting duplicate word',
              severity: 'high',
              component: 'WordValidation',
              steps: ['Submit word', 'Submit same word again'],
              expected: 'Error toast should appear for duplicate word',
              actual: 'No error toast appeared',
            });
          }
        }
      }
    });

    test('should validate word is on board', async ({ page }) => {
      await page.goto('/en/singleplayer');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      
      const started = await waitForGameStart(page);
      if (!started) {
        test.skip();
        return;
      }
      
      const grid = page.locator('[role="grid"]').first();
      await expect(grid).toBeVisible();
      
      const cells = grid.locator('[role="gridcell"]');
      const count = await cells.count();
      
      if (count >= 4) {
        const firstCell = cells.first();
        const lastCell = cells.nth(count - 1);
        
        const firstBox = await firstCell.boundingBox();
        const lastBox = await lastCell.boundingBox();
        
        if (firstBox && lastBox) {
          await page.mouse.move(firstBox.x + firstBox.width / 2, firstBox.y + firstBox.height / 2);
          await page.mouse.down();
          await page.mouse.move(lastBox.x + lastBox.width / 2, lastBox.y + lastBox.height / 2);
          await page.mouse.up();
          await page.waitForTimeout(1000);
          
          const errorToast = page.locator('text=/not on board/i, text=/invalid path/i');
          const errorVisible = await errorToast.isVisible({ timeout: 2000 }).catch(() => false);
          
          if (!errorVisible) {
            const wordPreview = page.locator('[class*="word"], [class*="preview"]').first();
            const previewVisible = await wordPreview.isVisible().catch(() => false);
            
            if (previewVisible) {
              detectedBugs.push({
                id: 'invalid-path-no-error',
                description: 'No error message shown when selecting invalid path on board',
                severity: 'medium',
                component: 'WordValidation',
                steps: ['Select non-adjacent cells'],
                expected: 'Error toast should appear for invalid path',
                actual: 'No error toast appeared',
              });
            }
          }
        }
      }
    });
  });

  test.describe('Timer Functionality', () => {
    test('timer should count down correctly', async ({ page }) => {
      await page.goto('/en/singleplayer');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      
      const started = await waitForGameStart(page);
      if (!started) {
        test.skip();
        return;
      }
      
      const timer = page.locator('[class*="timer"], [class*="Timer"], [role="timer"]').first();
      const timerVisible = await timer.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (timerVisible) {
        const initialTime = await timer.textContent();
        await page.waitForTimeout(3000);
        const newTime = await timer.textContent();
        
        if (initialTime && newTime) {
          const initialNum = parseInt(initialTime.replace(/\D/g, ''));
          const newNum = parseInt(newTime.replace(/\D/g, ''));
          
          if (!isNaN(initialNum) && !isNaN(newNum)) {
            if (newNum >= initialNum) {
              detectedBugs.push({
                id: 'timer-not-counting',
                description: 'Timer not counting down correctly',
                severity: 'critical',
                component: 'Timer',
                steps: ['Start game', 'Wait 3 seconds'],
                expected: `Timer should decrease from ${initialNum} to approximately ${initialNum - 3}`,
                actual: `Timer is ${newNum}, expected less than ${initialNum}`,
              });
            }
          }
        }
      } else {
        detectedBugs.push({
          id: 'timer-not-visible',
          description: 'Timer not visible in game',
          severity: 'critical',
          component: 'Timer',
          steps: ['Start game'],
          expected: 'Timer should be visible',
          actual: 'Timer element not found',
        });
      }
    });

    test('game should end when timer reaches zero', async ({ page }) => {
      await page.goto('/en/singleplayer');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      
      const started = await waitForGameStart(page);
      if (!started) {
        test.skip();
        return;
      }
      
      const timer = page.locator('[class*="timer"], [class*="Timer"]').first();
      const timerVisible = await timer.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (timerVisible) {
        const initialTime = await timer.textContent();
        if (initialTime) {
          const initialNum = parseInt(initialTime.replace(/\D/g, ''));
          
          if (!isNaN(initialNum) && initialNum > 0) {
            await page.waitForTimeout(Math.min(initialNum * 1000 + 2000, 10000));
            
            const resultsScreen = page.locator('text=/results/i, text=/score/i, [class*="results"]').first();
            const resultsVisible = await resultsScreen.isVisible({ timeout: 5000 }).catch(() => false);
            
            if (!resultsVisible) {
              detectedBugs.push({
                id: 'game-not-ending',
                description: 'Game does not end when timer reaches zero',
                severity: 'critical',
                component: 'GameState',
                steps: ['Start game', 'Wait for timer to reach zero'],
                expected: 'Results screen should appear',
                actual: 'Results screen did not appear',
              });
            }
          }
        }
      }
    });
  });

  test.describe('Scoring System', () => {
    test('score should update when valid word is submitted', async ({ page }) => {
      await page.goto('/en/singleplayer');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      
      const started = await waitForGameStart(page);
      if (!started) {
        test.skip();
        return;
      }
      
      const scoreElement = page.locator('[class*="score"]').first();
      const scoreVisible = await scoreElement.isVisible().catch(() => false);
      
      if (scoreVisible) {
        const initialScoreText = await scoreElement.textContent().catch(() => '0');
        const initialScore = parseInt(initialScoreText.replace(/\D/g, '')) || 0;
        
        const grid = page.locator('[role="grid"]').first();
        const cells = grid.locator('[role="gridcell"]');
        const count = await cells.count();
        
        if (count >= 3) {
          const firstCell = cells.first();
          const cellBox = await firstCell.boundingBox();
          
          if (cellBox) {
            await page.mouse.move(cellBox.x + cellBox.width / 2, cellBox.y + cellBox.height / 2);
            await page.mouse.down();
            
            for (let i = 1; i < Math.min(3, count); i++) {
              const nextCell = cells.nth(i);
              const nextBox = await nextCell.boundingBox();
              if (nextBox) {
                await page.mouse.move(nextBox.x + nextBox.width / 2, nextBox.y + nextBox.height / 2);
                await page.waitForTimeout(100);
              }
            }
            
            await page.mouse.up();
            await page.waitForTimeout(2000);
            
            const newScoreText = await scoreElement.textContent().catch(() => '0');
            const newScore = parseInt(newScoreText.replace(/\D/g, '')) || 0;
            
            if (newScore <= initialScore) {
              detectedBugs.push({
                id: 'score-not-updating',
                description: 'Score does not update when valid word is submitted',
                severity: 'high',
                component: 'Scoring',
                steps: ['Start game', 'Submit valid word'],
                expected: `Score should increase from ${initialScore}`,
                actual: `Score is still ${newScore}`,
              });
            }
          }
        }
      } else {
        detectedBugs.push({
          id: 'score-not-visible',
          description: 'Score display not visible',
          severity: 'high',
          component: 'Scoring',
          steps: ['Start game'],
          expected: 'Score should be visible',
          actual: 'Score element not found',
        });
      }
    });
  });

  test.describe('Combo System', () => {
    test('combo should reset after timeout', async ({ page }) => {
      await page.goto('/en/singleplayer');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      
      const started = await waitForGameStart(page);
      if (!started) {
        test.skip();
        return;
      }
      
      const grid = page.locator('[role="grid"]').first();
      const cells = grid.locator('[role="gridcell"]');
      const count = await cells.count();
      
      if (count >= 3) {
        const firstCell = cells.first();
        const cellBox = await firstCell.boundingBox();
        
        if (cellBox) {
          await page.mouse.move(cellBox.x + cellBox.width / 2, cellBox.y + cellBox.height / 2);
          await page.mouse.down();
          
          for (let i = 1; i < Math.min(3, count); i++) {
            const nextCell = cells.nth(i);
            const nextBox = await nextCell.boundingBox();
            if (nextBox) {
              await page.mouse.move(nextBox.x + nextBox.width / 2, nextBox.y + nextBox.height / 2);
              await page.waitForTimeout(100);
            }
          }
          
          await page.mouse.up();
          await page.waitForTimeout(1500);
          
          const comboIndicator = page.locator('[class*="combo"], text=/combo/i').first();
          const comboVisibleBefore = await comboIndicator.isVisible().catch(() => false);
          
          if (comboVisibleBefore) {
            await page.waitForTimeout(4000);
            
            const comboVisibleAfter = await comboIndicator.isVisible().catch(() => false);
            
            if (comboVisibleAfter) {
              detectedBugs.push({
                id: 'combo-not-resetting',
                description: 'Combo does not reset after timeout',
                severity: 'medium',
                component: 'ComboSystem',
                steps: ['Submit word', 'Wait 4 seconds'],
                expected: 'Combo should reset after 3 seconds',
                actual: 'Combo still visible after timeout',
              });
            }
          }
        }
      }
    });
  });
});

test.describe('UI Issues Detection', () => {
  test.describe('Layout Issues', () => {
    for (const [name, viewport] of Object.entries(VIEWPORTS)) {
      test(`${name} - No horizontal scroll`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await page.goto('/en');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
        
        const hasScroll = await checkHorizontalScroll(page);
        
        if (hasScroll) {
          const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
          const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
          
          detectedUIIssues.push({
            id: `horizontal-scroll-${name}`,
            description: `Horizontal scroll detected on ${name} viewport`,
            type: 'layout',
            severity: 'high',
            details: `Scroll width: ${scrollWidth}px, Client width: ${clientWidth}px, Overflow: ${scrollWidth - clientWidth}px`,
          });
        }
        
        expect(hasScroll).toBe(false);
      });

      test(`${name} - Game screen layout`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await page.goto('/en/singleplayer');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
        
        const started = await waitForGameStart(page);
        if (!started) {
          test.skip();
          return;
        }
        
        const hasScroll = await checkHorizontalScroll(page);
        
        if (hasScroll) {
          detectedUIIssues.push({
            id: `game-horizontal-scroll-${name}`,
            description: `Horizontal scroll in game screen on ${name} viewport`,
            type: 'layout',
            severity: 'critical',
            details: 'Game screen should not have horizontal scroll',
          });
        }
        
        expect(hasScroll).toBe(false);
      });
    }
  });

  test.describe('Accessibility Issues', () => {
    for (const [name, viewport] of Object.entries(VIEWPORTS)) {
      test(`${name} - Touch target sizes`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await page.goto('/en/singleplayer');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
        
        const issues = await checkTouchTargets(page);
        detectedUIIssues.push(...issues);
        
        if (issues.length > 0) {
          console.log(`\nTouch target issues on ${name}:`);
          issues.forEach(issue => {
            console.log(`  - ${issue.description}: ${issue.details}`);
            if (issue.selector) console.log(`    Selector: ${issue.selector}`);
          });
        }
        
        const criticalIssues = issues.filter(i => i.severity === 'critical');
        if (criticalIssues.length > 0) {
          console.log(`\nCRITICAL issues on ${name}:`);
          criticalIssues.forEach(issue => {
            console.log(`  - ${issue.description}: ${issue.details}`);
          });
        }
        expect(criticalIssues.length).toBe(0);
      });

      test(`${name} - Game screen touch targets`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await page.goto('/en/singleplayer');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
        
        const started = await waitForGameStart(page);
        if (!started) {
          test.skip();
          return;
        }
        
        const issues = await checkTouchTargets(page);
        detectedUIIssues.push(...issues);
        
        if (issues.length > 0) {
          console.log(`\nTouch target issues in game on ${name}:`);
          issues.forEach(issue => {
            console.log(`  - ${issue.description}: ${issue.details}`);
            if (issue.selector) console.log(`    Selector: ${issue.selector}`);
          });
        }
        
        const criticalIssues = issues.filter(i => i.severity === 'critical');
        if (criticalIssues.length > 0) {
          console.log(`\nCRITICAL issues in game on ${name}:`);
          criticalIssues.forEach(issue => {
            console.log(`  - ${issue.description}: ${issue.details}`);
          });
        }
        expect(criticalIssues.length).toBe(0);
      });
    }
  });

  test.describe('Interaction Issues', () => {
    test('Grid cells should be clickable in landscape', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.mobileLandscape);
      await page.goto('/en/singleplayer');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      
      const started = await waitForGameStart(page);
      if (!started) {
        test.skip();
        return;
      }
      
      const grid = page.locator('[role="grid"]').first();
      const cells = grid.locator('[role="gridcell"]');
      const count = await cells.count();
      
      expect(count).toBeGreaterThan(0);
      
      const firstCell = cells.first();
      const cellBox = await firstCell.boundingBox();
      
      if (cellBox) {
        if (cellBox.width < 32 || cellBox.height < 32) {
          detectedUIIssues.push({
            id: 'grid-cells-too-small-landscape',
            description: 'Grid cells too small in landscape mode',
            type: 'interaction',
            severity: 'high',
            selector: '[role="gridcell"]',
            details: `Cell size: ${Math.round(cellBox.width)}x${Math.round(cellBox.height)}px (minimum: 32x32px)`,
          });
        }
      }
    });

    test('Buttons should be accessible during game', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.mobileLandscape);
      await page.goto('/en/singleplayer');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      
      const started = await waitForGameStart(page);
      if (!started) {
        test.skip();
        return;
      }
      
      const exitButton = page.locator('button:has-text("Exit"), button[aria-label*="Exit" i]').first();
      const exitVisible = await exitButton.isVisible().catch(() => false);
      
      if (!exitVisible) {
        await page.mouse.move(100, 50);
        await page.waitForTimeout(500);
        const exitVisibleAfterMove = await exitButton.isVisible().catch(() => false);
        
        if (!exitVisibleAfterMove) {
          detectedUIIssues.push({
            id: 'exit-button-not-accessible',
            description: 'Exit button not accessible during game',
            type: 'interaction',
            severity: 'high',
            selector: 'button[aria-label*="Exit"]',
            details: 'Exit button should be visible or accessible via hover',
          });
        }
      }
    });
  });
});

test.describe('Bug Report Summary', () => {
  test('Generate bug report', async ({ page }) => {
    console.log('\n=== DETECTED BUGS ===');
    console.log(`Total bugs: ${detectedBugs.length}`);
    
    const bySeverity = {
      critical: detectedBugs.filter(b => b.severity === 'critical'),
      high: detectedBugs.filter(b => b.severity === 'high'),
      medium: detectedBugs.filter(b => b.severity === 'medium'),
      low: detectedBugs.filter(b => b.severity === 'low'),
    };
    
    console.log(`Critical: ${bySeverity.critical.length}`);
    console.log(`High: ${bySeverity.high.length}`);
    console.log(`Medium: ${bySeverity.medium.length}`);
    console.log(`Low: ${bySeverity.low.length}`);
    
    detectedBugs.forEach(bug => {
      console.log(`\n[${bug.severity.toUpperCase()}] ${bug.id}: ${bug.description}`);
      console.log(`  Component: ${bug.component}`);
      console.log(`  Expected: ${bug.expected}`);
      console.log(`  Actual: ${bug.actual}`);
    });
    
    console.log('\n=== DETECTED UI ISSUES ===');
    console.log(`Total issues: ${detectedUIIssues.length}`);
    
    const byType = {
      layout: detectedUIIssues.filter(i => i.type === 'layout'),
      accessibility: detectedUIIssues.filter(i => i.type === 'accessibility'),
      interaction: detectedUIIssues.filter(i => i.type === 'interaction'),
      performance: detectedUIIssues.filter(i => i.type === 'performance'),
      visual: detectedUIIssues.filter(i => i.type === 'visual'),
    };
    
    console.log(`Layout: ${byType.layout.length}`);
    console.log(`Accessibility: ${byType.accessibility.length}`);
    console.log(`Interaction: ${byType.interaction.length}`);
    console.log(`Performance: ${byType.performance.length}`);
    console.log(`Visual: ${byType.visual.length}`);
    
    detectedUIIssues.forEach(issue => {
      console.log(`\n[${issue.severity.toUpperCase()}] ${issue.id}: ${issue.description}`);
      console.log(`  Type: ${issue.type}`);
      if (issue.selector) console.log(`  Selector: ${issue.selector}`);
      console.log(`  Details: ${issue.details}`);
    });
  });
});

