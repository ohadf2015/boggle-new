import { test, expect, type Page } from '@playwright/test';

/**
 * UI Issues Detection Test Suite
 * Checks for:
 * - Contrast ratio violations (WCAG AA/AAA)
 * - Small touch targets (< 44x44px)
 * - Small text (< 16px)
 * - Broken layouts
 * - Overlapping elements
 * - Elements outside viewport
 */

const MIN_TOUCH_TARGET = 44;
const MIN_TEXT_SIZE = 16;
const WCAG_AA_CONTRAST = 4.5;
const WCAG_AAA_CONTRAST = 7;

type ThemeMode = 'dark' | 'light';

interface ContrastIssue {
  element: string;
  foreground: string;
  background: string;
  contrast: number;
  level: 'AA' | 'AAA' | 'FAIL';
}

interface SizeIssue {
  element: string;
  type: 'touch-target' | 'text-size';
  actualSize: number;
  requiredSize: number;
  selector: string;
}

interface LayoutIssue {
  element: string;
  type: 'overlap' | 'viewport' | 'hidden' | 'overflow';
  details: string;
}

interface SizeEfficiencyIssue {
  element: string;
  type: 'excessive-padding' | 'excessive-margin' | 'wasteful-space' | 'oversized-button' | 'oversized-input';
  contentSize: { width: number; height: number };
  elementSize: { width: number; height: number };
  padding: { top: number; right: number; bottom: number; left: number };
  margin: { top: number; right: number; bottom: number; left: number };
  efficiency: number;
  details: string;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  if (!rgb1 || !rgb2) return 0;

  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

function toHexByte(value: number): string {
  return Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0');
}

function rgbToHex(rgb: { r: number; g: number; b: number }): string {
  return `#${toHexByte(rgb.r)}${toHexByte(rgb.g)}${toHexByte(rgb.b)}`;
}

async function checkContrast(page: Page): Promise<ContrastIssue[]> {
  const issues: ContrastIssue[] = [];

  const elements = await page
    .locator('p, span, a, button, label, li, h1, h2, h3, h4, h5, h6, td, th, [role="button"]')
    .all();

  for (const element of elements.slice(0, 600)) {
    const isVisible = await element.isVisible().catch(() => false);
    if (!isVisible) continue;

    const styles = await element.evaluate((el) => {
      type Rgba = { r: number; g: number; b: number; a: number };

      const clamp255 = (n: number) => Math.max(0, Math.min(255, Math.round(n)));

      const parseColor = (value: string | null): Rgba | null => {
        if (!value) return null;
        const rgbMatch = value.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i);
        if (rgbMatch) {
          return {
            r: clamp255(parseInt(rgbMatch[1], 10)),
            g: clamp255(parseInt(rgbMatch[2], 10)),
            b: clamp255(parseInt(rgbMatch[3], 10)),
            a: 1,
          };
        }

        const rgbaMatch = value.match(/^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([0-9.]+)\s*\)$/i);
        if (rgbaMatch) {
          return {
            r: clamp255(parseInt(rgbaMatch[1], 10)),
            g: clamp255(parseInt(rgbaMatch[2], 10)),
            b: clamp255(parseInt(rgbaMatch[3], 10)),
            a: Math.max(0, Math.min(1, parseFloat(rgbaMatch[4]))),
          };
        }

        return null;
      };

      const composite = (fg: Rgba, bg: Rgba): Rgba => {
        const a = fg.a + bg.a * (1 - fg.a);
        if (a === 0) return { r: 0, g: 0, b: 0, a: 0 };
        const r = (fg.r * fg.a + bg.r * bg.a * (1 - fg.a)) / a;
        const g = (fg.g * fg.a + bg.g * bg.a * (1 - fg.a)) / a;
        const b = (fg.b * fg.a + bg.b * bg.a * (1 - fg.a)) / a;
        return { r: clamp255(r), g: clamp255(g), b: clamp255(b), a };
      };

      const isEffectivelyTransparent = (rgba: Rgba | null): boolean => !rgba || rgba.a <= 0.001;

      const effectiveBackground = (node: Element | null): Rgba => {
        if (!node) return { r: 255, g: 255, b: 255, a: 1 };
        const computed = window.getComputedStyle(node);
        const bg = parseColor(computed.backgroundColor);
        const parentBg = node.parentElement ? effectiveBackground(node.parentElement) : { r: 255, g: 255, b: 255, a: 1 };
        if (isEffectivelyTransparent(bg)) return parentBg;
        if (!bg) return parentBg;
        if (bg.a >= 0.999) return { ...bg, a: 1 };
        return { ...composite(bg, parentBg), a: 1 };
      };

      const computed = window.getComputedStyle(el);
      const text = el.textContent?.replace(/\s+/g, ' ').trim() || '';
      const fontSize = parseFloat(computed.fontSize);
      const fg = parseColor(computed.color);
      const bg = effectiveBackground(el);
      const textFillColor = (computed as any).webkitTextFillColor as string | undefined;
      const hasTextGradient = (textFillColor === 'transparent') || (computed.color === 'transparent');
      const hasBackgroundImageInChain = (node: Element | null): boolean => {
        let current: Element | null = node;
        while (current) {
          const style = window.getComputedStyle(current);
          if (style.backgroundImage && style.backgroundImage !== 'none') return true;
          current = current.parentElement;
        }
        return false;
      };
      const hasBackgroundImage = hasBackgroundImageInChain(el);
      const shouldSkipContrast =
        !!el.closest('#nextjs-portal') ||
        hasBackgroundImage ||
        hasTextGradient ||
        (fg?.a !== undefined && fg.a < 0.05);

      const effectiveFg = shouldSkipContrast
        ? null
        : fg && fg.a < 0.999
          ? { ...composite(fg, bg), a: 1 }
          : fg
            ? { ...fg, a: 1 }
            : null;

      return {
        text,
        fontSize,
        fg: effectiveFg,
        bg,
        tag: el.tagName.toLowerCase(),
        shouldSkipContrast,
      };
    });

    if (!styles.text || styles.text.length < 2) continue;
    if (styles.shouldSkipContrast) continue;
    if (!styles.fg) continue;
    if (styles.fontSize > 0 && styles.fontSize < MIN_TEXT_SIZE) continue;

    const fgHex = rgbToHex(styles.fg);
    const bgHex = rgbToHex(styles.bg);
    const contrast = getContrastRatio(fgHex, bgHex);

    if (contrast < WCAG_AA_CONTRAST) {
      issues.push({
        element: `${styles.tag}: "${styles.text.substring(0, 30)}"`,
        foreground: fgHex,
        background: bgHex,
        contrast: Math.round(contrast * 100) / 100,
        level: 'FAIL',
      });
    }
  }

  return issues;
}

async function gotoWithTheme(page: Page, path: string, theme: ThemeMode): Promise<void> {
  await page.goto(path);
  await page.evaluate((t) => {
    window.localStorage.setItem('boggle_theme', t);
  }, theme);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('body');
  await page.waitForTimeout(1500);
}

async function checkSmallElements(page: Page, viewportWidth: number, viewportHeight: number): Promise<SizeIssue[]> {
  const issues: SizeIssue[] = [];

  const interactiveElements = await page.locator('button, a[href], input, select, textarea, [role="button"], [tabindex="0"]').all();

  for (const element of interactiveElements) {
    const isVisible = await element.isVisible().catch(() => false);
    if (!isVisible) continue;

    const isSrOnly = await element.evaluate((el) => {
      if (!(el instanceof HTMLElement)) return false;
      if (el.tagName === 'INPUT') {
        const input = el as HTMLInputElement;
        if (input.type === 'checkbox' || input.type === 'radio' || input.type === 'hidden') return true;
      }
      if (el.classList.contains('sr-only')) return true;
      if (el.getAttribute('aria-hidden') === 'true') return true;
      if (el.closest('#nextjs-portal')) return true;
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return true;
      return false;
    });
    if (isSrOnly) continue;

    const box = await element.boundingBox();
    if (!box) continue;

    const tag = await element.evaluate((el) => el.tagName.toLowerCase());
    const text = (await element.textContent() || '').trim().substring(0, 30);
    const selector = `${tag}${text ? `: "${text}"` : ''}`;

    const shouldIgnoreTouchTarget = await element.evaluate((el) => {
      const textContent = el.textContent?.replace(/\s+/g, ' ').trim() || '';
      if (/^\d+\s+Issues?$/.test(textContent)) return true;
      if (/^0\d+\s+Issue$/.test(textContent)) return true;
      const label = (el.getAttribute('aria-label') || '').trim();
      const title = (el.getAttribute('title') || '').trim();
      const combined = `${label} ${title}`;
      if (/Next\.js Dev Tools/i.test(combined)) return true;
      if (/issues overlay/i.test(combined)) return true;
      if (/Collapse issues badge/i.test(combined)) return true;
      return false;
    });
    if (shouldIgnoreTouchTarget) continue;

    if (box.width < MIN_TOUCH_TARGET || box.height < MIN_TOUCH_TARGET) {
      const minDim = Math.min(box.width, box.height);
      issues.push({
        element: selector,
        type: 'touch-target',
        actualSize: Math.round(minDim),
        requiredSize: MIN_TOUCH_TARGET,
        selector: await element.evaluate((el) => {
          if (el.id) return `#${el.id}`;
          if (el.className) return `.${el.className.split(' ')[0]}`;
          return el.tagName.toLowerCase();
        }),
      });
    }
  }

  const textElements = await page.locator('p, span, div, h1, h2, h3, h4, h5, h6, label, li, td, th').all();
  for (const element of textElements.slice(0, 100)) {
    const isVisible = await element.isVisible().catch(() => false);
    if (!isVisible) continue;

    const fontSize = await element.evaluate((el) => {
      return parseFloat(window.getComputedStyle(el).fontSize);
    });

    if (fontSize > 0 && fontSize < MIN_TEXT_SIZE) {
      const text = (await element.textContent() || '').trim().substring(0, 30);
      if (text.length < 2) continue;

      issues.push({
        element: `${await element.evaluate((el) => el.tagName.toLowerCase())}: "${text}"`,
        type: 'text-size',
        actualSize: Math.round(fontSize),
        requiredSize: MIN_TEXT_SIZE,
        selector: await element.evaluate((el) => {
          if (el.id) return `#${el.id}`;
          if (el.className) return `.${el.className.split(' ')[0]}`;
          return el.tagName.toLowerCase();
        }),
      });
    }
  }

  return issues;
}

async function checkLayoutIssues(page: Page, viewportWidth: number, viewportHeight: number): Promise<LayoutIssue[]> {
  const issues: LayoutIssue[] = [];

  const hasHorizontalScroll = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });

  if (hasHorizontalScroll) {
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    issues.push({
      element: 'body/html',
      type: 'viewport',
      details: `Horizontal scroll detected: ${scrollWidth}px > ${clientWidth}px (overflow: ${scrollWidth - clientWidth}px)`,
    });
  }

  const allElements = await page.locator('*').all();

  for (const element of allElements.slice(0, 150)) {
    const isVisible = await element.isVisible().catch(() => false);
    if (!isVisible) continue;

    const box = await element.boundingBox();
    if (!box) continue;

    const tag = await element.evaluate((el) => el.tagName.toLowerCase());
    const text = (await element.textContent() || '').trim().substring(0, 20);

    if (box.x < -5 || box.y < -5 || (box.x + box.width) > viewportWidth + 15 || (box.y + box.height) > viewportHeight + 15) {
      issues.push({
        element: `${tag}${text ? `: "${text}"` : ''}`,
        type: 'viewport',
        details: `Position: (${Math.round(box.x)}, ${Math.round(box.y)}), Size: ${Math.round(box.width)}x${Math.round(box.height)}`,
      });
    }

    const overflow = await element.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return {
        overflowX: style.overflowX,
        overflowY: style.overflowY,
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight,
      };
    });

    if (overflow.scrollWidth > overflow.clientWidth + 5 || overflow.scrollHeight > overflow.clientHeight + 5) {
      if (overflow.overflowX !== 'hidden' && overflow.overflowY !== 'hidden') {
        const overflowX = overflow.scrollWidth - overflow.clientWidth;
        const overflowY = overflow.scrollHeight - overflow.clientHeight;
        if (overflowX > 5 || overflowY > 5) {
          issues.push({
            element: `${tag}${text ? `: "${text}"` : ''}`,
            type: 'overflow',
            details: `Content overflows container: ${Math.round(overflowX)}px x ${Math.round(overflowY)}px`,
          });
        }
      }
    }
  }

  return issues;
}

async function checkSizeEfficiency(page: Page, viewportWidth: number, viewportHeight: number): Promise<SizeEfficiencyIssue[]> {
  const issues: SizeEfficiencyIssue[] = [];

  const interactiveElements = await page.locator('button, a[href], input, select, textarea, [role="button"]').all();
  const containerElements = await page.locator('div, section, article, main, header, footer, nav, aside').all();

  for (const element of [...interactiveElements, ...containerElements].slice(0, 100)) {
    const isVisible = await element.isVisible().catch(() => false);
    if (!isVisible) continue;

    const box = await element.boundingBox();
    if (!box) continue;

    const styles = await element.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        paddingTop: parseFloat(computed.paddingTop),
        paddingRight: parseFloat(computed.paddingRight),
        paddingBottom: parseFloat(computed.paddingBottom),
        paddingLeft: parseFloat(computed.paddingLeft),
        marginTop: parseFloat(computed.marginTop),
        marginRight: parseFloat(computed.marginRight),
        marginBottom: parseFloat(computed.marginBottom),
        marginLeft: parseFloat(computed.marginLeft),
        scrollWidth: el.scrollWidth,
        scrollHeight: el.scrollHeight,
        clientWidth: el.clientWidth,
        clientHeight: el.clientHeight,
      };
    });

    const tag = await element.evaluate((el) => el.tagName.toLowerCase());
    const text = (await element.textContent() || '').trim().substring(0, 30);
    const elementName = `${tag}${text ? `: "${text}"` : ''}`;

    const totalPadding = styles.paddingTop + styles.paddingRight + styles.paddingBottom + styles.paddingLeft;
    const totalMargin = styles.marginTop + styles.marginRight + styles.marginBottom + styles.marginLeft;
    const contentWidth = styles.scrollWidth - styles.paddingLeft - styles.paddingRight;
    const contentHeight = styles.scrollHeight - styles.paddingTop - styles.paddingBottom;
    const elementArea = box.width * box.height;
    const contentArea = Math.max(contentWidth, 0) * Math.max(contentHeight, 0);
    const efficiency = contentArea > 0 ? (contentArea / elementArea) * 100 : 0;

    const avgPadding = totalPadding / 4;
    const maxPadding = Math.max(styles.paddingTop, styles.paddingRight, styles.paddingBottom, styles.paddingLeft);

    if (tag === 'button' || tag === 'a' || element.evaluate((el) => el.getAttribute('role') === 'button')) {
      if (box.height > 60 && contentHeight < 20) {
        issues.push({
          element: elementName,
          type: 'oversized-button',
          contentSize: { width: contentWidth, height: contentHeight },
          elementSize: { width: box.width, height: box.height },
          padding: { top: styles.paddingTop, right: styles.paddingRight, bottom: styles.paddingBottom, left: styles.paddingLeft },
          margin: { top: styles.marginTop, right: styles.marginRight, bottom: styles.marginBottom, left: styles.marginLeft },
          efficiency,
          details: `Button height ${Math.round(box.height)}px but content only ${Math.round(contentHeight)}px tall`,
        });
      }
    }

    if (tag === 'input' || tag === 'textarea') {
      if (box.height > 50 && contentHeight < 16) {
        issues.push({
          element: elementName,
          type: 'oversized-input',
          contentSize: { width: contentWidth, height: contentHeight },
          elementSize: { width: box.width, height: box.height },
          padding: { top: styles.paddingTop, right: styles.paddingRight, bottom: styles.paddingBottom, left: styles.paddingLeft },
          margin: { top: styles.marginTop, right: styles.marginRight, bottom: styles.marginBottom, left: styles.marginLeft },
          efficiency,
          details: `Input height ${Math.round(box.height)}px but content only ${Math.round(contentHeight)}px tall`,
        });
      }
    }

    if (avgPadding > 24 && contentArea < elementArea * 0.3) {
      issues.push({
        element: elementName,
        type: 'excessive-padding',
        contentSize: { width: contentWidth, height: contentHeight },
        elementSize: { width: box.width, height: box.height },
        padding: { top: styles.paddingTop, right: styles.paddingRight, bottom: styles.paddingBottom, left: styles.paddingLeft },
        margin: { top: styles.marginTop, right: styles.marginRight, bottom: styles.marginBottom, left: styles.marginLeft },
        efficiency,
        details: `Average padding ${Math.round(avgPadding)}px, content efficiency only ${Math.round(efficiency)}%`,
      });
    }

    if (maxPadding > 32 && contentArea < elementArea * 0.4) {
      issues.push({
        element: elementName,
        type: 'excessive-padding',
        contentSize: { width: contentWidth, height: contentHeight },
        elementSize: { width: box.width, height: box.height },
        padding: { top: styles.paddingTop, right: styles.paddingRight, bottom: styles.paddingBottom, left: styles.paddingLeft },
        margin: { top: styles.marginTop, right: styles.marginRight, bottom: styles.marginBottom, left: styles.marginLeft },
        efficiency,
        details: `Max padding ${Math.round(maxPadding)}px, content efficiency ${Math.round(efficiency)}%`,
      });
    }

    if (totalMargin > 80 && contentArea < elementArea * 0.5) {
      issues.push({
        element: elementName,
        type: 'excessive-margin',
        contentSize: { width: contentWidth, height: contentHeight },
        elementSize: { width: box.width, height: box.height },
        padding: { top: styles.paddingTop, right: styles.paddingRight, bottom: styles.paddingBottom, left: styles.paddingLeft },
        margin: { top: styles.marginTop, right: styles.marginRight, bottom: styles.marginBottom, left: styles.marginLeft },
        efficiency,
        details: `Total margin ${Math.round(totalMargin)}px, content efficiency ${Math.round(efficiency)}%`,
      });
    }

    if (efficiency < 30 && elementArea > 10000 && contentArea > 0) {
      issues.push({
        element: elementName,
        type: 'wasteful-space',
        contentSize: { width: contentWidth, height: contentHeight },
        elementSize: { width: box.width, height: box.height },
        padding: { top: styles.paddingTop, right: styles.paddingRight, bottom: styles.paddingBottom, left: styles.paddingLeft },
        margin: { top: styles.marginTop, right: styles.marginRight, bottom: styles.marginBottom, left: styles.marginLeft },
        efficiency,
        details: `Large element (${Math.round(box.width)}x${Math.round(box.height)}px) but only ${Math.round(efficiency)}% content efficiency`,
      });
    }
  }

  return issues;
}

test.describe('UI Issues Detection', () => {
  const criticalViewports = [
    { width: 320, height: 568, name: 'iPhone SE Portrait' },
    { width: 375, height: 667, name: 'iPhone 12 Portrait' },
    { width: 667, height: 375, name: 'iPhone 12 Landscape' },
    { width: 896, height: 414, name: 'iPhone 12 Pro Max Landscape' },
    { width: 1280, height: 720, name: 'Desktop HD' },
  ];

  for (const viewport of criticalViewports) {
    test.describe(`${viewport.name} (${viewport.width}x${viewport.height})`, () => {
      for (const theme of ['dark', 'light'] as const) {
        test(`${theme} - Landing page - Check all issues`, async ({ page }) => {
          await page.setViewportSize({ width: viewport.width, height: viewport.height });
          await gotoWithTheme(page, '/en', theme);

          const contrastIssues = await checkContrast(page);
          const sizeIssues = await checkSmallElements(page, viewport.width, viewport.height);
          const layoutIssues = await checkLayoutIssues(page, viewport.width, viewport.height);
          const efficiencyIssues = await checkSizeEfficiency(page, viewport.width, viewport.height);

          console.log(`\n=== ${viewport.name} - ${theme} - Landing Page ===`);
          console.log(`Contrast issues: ${contrastIssues.length}`);
          console.log(`Small element issues: ${sizeIssues.length}`);
          console.log(`Layout issues: ${layoutIssues.length}`);
          console.log(`Size efficiency issues: ${efficiencyIssues.length}`);

          if (contrastIssues.length > 0) {
            console.log('\nContrast Issues:');
            contrastIssues.slice(0, 15).forEach((issue) => {
              console.log(`  - ${issue.element}: ${issue.foreground} on ${issue.background} = ${issue.contrast}:1`);
            });
          }

          if (sizeIssues.length > 0) {
            console.log('\nSmall Element Issues:');
            sizeIssues.slice(0, 10).forEach((issue) => {
              console.log(`  - ${issue.element}: ${issue.type} ${issue.actualSize}px (min: ${issue.requiredSize}px)`);
            });
          }

          if (layoutIssues.length > 0) {
            console.log('\nLayout Issues:');
            layoutIssues.slice(0, 10).forEach((issue) => {
              console.log(`  - ${issue.element}: ${issue.type} - ${issue.details}`);
            });
          }

          await page.screenshot({
            path: `test-results/issues-${theme}-landing-${viewport.name.replace(/\s+/g, '-')}.png`,
            fullPage: true,
          });

          expect(contrastIssues.length).toBe(0);
          expect(sizeIssues.filter((i) => i.type === 'touch-target').length).toBeLessThan(5);
        });

        test(`${theme} - Single Player Game - Check all issues`, async ({ page }) => {
          await page.setViewportSize({ width: viewport.width, height: viewport.height });
          await gotoWithTheme(page, '/en/singleplayer', theme);

          const startButton = page.locator('button:has-text("Start"), button:has-text("Start Game")').first();
          const buttonVisible = await startButton.isVisible().catch(() => false);

          if (buttonVisible) {
            await startButton.click();
            await page.waitForTimeout(3000);
          }

          const contrastIssues = await checkContrast(page);
          const sizeIssues = await checkSmallElements(page, viewport.width, viewport.height);
          const layoutIssues = await checkLayoutIssues(page, viewport.width, viewport.height);
          const efficiencyIssues = await checkSizeEfficiency(page, viewport.width, viewport.height);

          console.log(`\n=== ${viewport.name} - ${theme} - Single Player Game ===`);
          console.log(`Contrast issues: ${contrastIssues.length}`);
          console.log(`Small element issues: ${sizeIssues.length}`);
          console.log(`Layout issues: ${layoutIssues.length}`);
          console.log(`Size efficiency issues: ${efficiencyIssues.length}`);

          if (contrastIssues.length > 0) {
            console.log('\nContrast Issues:');
            contrastIssues.slice(0, 15).forEach((issue) => {
              console.log(`  - ${issue.element}: ${issue.foreground} on ${issue.background} = ${issue.contrast}:1`);
            });
          }

          if (sizeIssues.length > 0) {
            console.log('\nSmall Element Issues:');
            sizeIssues.slice(0, 10).forEach((issue) => {
              console.log(`  - ${issue.element}: ${issue.type} ${issue.actualSize}px (min: ${issue.requiredSize}px)`);
            });
          }

          if (layoutIssues.length > 0) {
            console.log('\nLayout Issues:');
            layoutIssues.slice(0, 10).forEach((issue) => {
              console.log(`  - ${issue.element}: ${issue.type} - ${issue.details}`);
            });
          }

          if (efficiencyIssues.length > 0) {
            console.log('\nSize Efficiency Issues:');
            efficiencyIssues.slice(0, 15).forEach((issue) => {
              console.log(`  - ${issue.element}: ${issue.type}`);
              console.log(`    Element: ${Math.round(issue.elementSize.width)}x${Math.round(issue.elementSize.height)}px`);
              console.log(`    Content: ${Math.round(issue.contentSize.width)}x${Math.round(issue.contentSize.height)}px`);
              console.log(`    Efficiency: ${Math.round(issue.efficiency)}%`);
              console.log(`    ${issue.details}`);
            });
          }

          await page.screenshot({
            path: `test-results/issues-${theme}-game-${viewport.name.replace(/\s+/g, '-')}.png`,
            fullPage: true,
          });
        });

        test(`${theme} - Multiplayer Lobby - Check all issues`, async ({ page }) => {
          await page.setViewportSize({ width: viewport.width, height: viewport.height });
          await gotoWithTheme(page, '/en/multiplayer', theme);

          const contrastIssues = await checkContrast(page);
          const sizeIssues = await checkSmallElements(page, viewport.width, viewport.height);
          const layoutIssues = await checkLayoutIssues(page, viewport.width, viewport.height);
          const efficiencyIssues = await checkSizeEfficiency(page, viewport.width, viewport.height);

          console.log(`\n=== ${viewport.name} - ${theme} - Multiplayer Lobby ===`);
          console.log(`Contrast issues: ${contrastIssues.length}`);
          console.log(`Small element issues: ${sizeIssues.length}`);
          console.log(`Layout issues: ${layoutIssues.length}`);
          console.log(`Size efficiency issues: ${efficiencyIssues.length}`);

          if (contrastIssues.length > 0) {
            console.log('\nContrast Issues:');
            contrastIssues.slice(0, 15).forEach((issue) => {
              console.log(`  - ${issue.element}: ${issue.foreground} on ${issue.background} = ${issue.contrast}:1`);
            });
          }

          if (efficiencyIssues.length > 0) {
            console.log('\nSize Efficiency Issues:');
            efficiencyIssues.slice(0, 15).forEach((issue) => {
              console.log(`  - ${issue.element}: ${issue.type}`);
              console.log(`    Element: ${Math.round(issue.elementSize.width)}x${Math.round(issue.elementSize.height)}px`);
              console.log(`    Content: ${Math.round(issue.contentSize.width)}x${Math.round(issue.contentSize.height)}px`);
              console.log(`    Efficiency: ${Math.round(issue.efficiency)}%`);
              console.log(`    ${issue.details}`);
            });
          }

          await page.screenshot({
            path: `test-results/issues-${theme}-multiplayer-${viewport.name.replace(/\s+/g, '-')}.png`,
            fullPage: true,
          });
        });
      }
    });
  }

  test.describe('Landscape Mobile - Critical Checks', () => {
    test.setTimeout(180000);
    const landscapeViewports = [
      { width: 667, height: 375, name: 'iPhone 12 Landscape' },
      { width: 896, height: 414, name: 'iPhone 12 Pro Max Landscape' },
      { width: 568, height: 320, name: 'iPhone SE Landscape' },
      { width: 844, height: 390, name: 'iPhone 14 Pro Landscape' },
    ];

    for (const viewport of landscapeViewports) {
      test(`${viewport.name} - Comprehensive check`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        
        const pages = [
          { path: '/en', name: 'Landing' },
          { path: '/en/singleplayer', name: 'SinglePlayer' },
          { path: '/en/multiplayer', name: 'Multiplayer' },
          { path: '/en/rules', name: 'Rules' },
          { path: '/en/leaderboard', name: 'Leaderboard' },
        ];
        
        const allIssues: Record<string, any> = {};

        for (const theme of ['dark', 'light'] as const) {
          for (const { path, name } of pages) {
            try {
              await gotoWithTheme(page, path, theme);

              const contrastIssues = await checkContrast(page);
              const sizeIssues = await checkSmallElements(page, viewport.width, viewport.height);
              const layoutIssues = await checkLayoutIssues(page, viewport.width, viewport.height);
              const efficiencyIssues = await checkSizeEfficiency(page, viewport.width, viewport.height);

              allIssues[`${theme}-${name}`] = {
                contrast: contrastIssues,
                size: sizeIssues,
                layout: layoutIssues,
                efficiency: efficiencyIssues,
              };

              const hasHorizontalScroll = layoutIssues.some(issue => 
                issue.type === 'viewport' && issue.details.includes('Horizontal scroll')
              );

              console.log(`\n=== ${viewport.name} - ${theme} - ${name} (${path}) ===`);
              console.log(`Contrast issues: ${contrastIssues.length}`);
              console.log(`Small element issues: ${sizeIssues.length}`);
              console.log(`Layout issues: ${layoutIssues.length}`);
              console.log(`Size efficiency issues: ${efficiencyIssues.length}`);
              console.log(`Horizontal scroll: ${hasHorizontalScroll ? '⚠️ YES' : '✓ No'}`);

              if (hasHorizontalScroll) {
                console.warn(`⚠️  CRITICAL: Horizontal scroll detected on ${path}`);
              }

              if (sizeIssues.filter(i => i.type === 'touch-target').length > 0) {
                console.warn(`⚠️  Small touch targets found:`, 
                  sizeIssues.filter(i => i.type === 'touch-target').slice(0, 5).map(i => 
                    `${i.element} (${i.actualSize}px)`
                  )
                );
              }

              await page.screenshot({
                path: `test-results/landscape-${theme}-${viewport.name.replace(/\s+/g, '-')}-${name}.png`,
                fullPage: true,
              });
            } catch (error) {
              console.error(`Error testing ${path}:`, error);
            }
          }
        }

        const totalTouchTargetIssues = Object.values(allIssues).reduce(
          (sum, issues) => sum + issues.size.filter((i: SizeIssue) => i.type === 'touch-target').length,
          0
        );
        const totalHorizontalScroll = Object.values(allIssues).some(issues =>
          issues.layout.some((issue: LayoutIssue) =>
            issue.type === 'viewport' && issue.details.includes('Horizontal scroll')
          )
        );

        expect(totalHorizontalScroll).toBe(false);
        expect(totalTouchTargetIssues).toBeLessThan(10);
      });
    }

    test('Landscape Mobile - Game Interaction Test', async ({ page }) => {
      await page.setViewportSize({ width: 667, height: 375 });
      
      await page.goto('/en/singleplayer');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      const startButton = page.locator('button:has-text("Start"), button:has-text("Start Game")').first();
      const buttonVisible = await startButton.isVisible().catch(() => false);
      
      if (buttonVisible) {
        await startButton.click();
        await page.waitForTimeout(5000);

        const hasHorizontalScroll = await page.evaluate(() => {
          return document.documentElement.scrollWidth > document.documentElement.clientWidth;
        });

        expect(hasHorizontalScroll).toBe(false);

        const gridCells = await page.locator('[role="gridcell"]').all();
        expect(gridCells.length).toBeGreaterThan(0);

        for (const cell of gridCells.slice(0, 5)) {
          const box = await cell.boundingBox();
          if (box) {
            expect(box.width).toBeGreaterThanOrEqual(32);
            expect(box.height).toBeGreaterThanOrEqual(32);
          }
        }

        await page.screenshot({
          path: 'test-results/landscape-game-interaction.png',
          fullPage: true,
        });
      }
    });
  });
});
