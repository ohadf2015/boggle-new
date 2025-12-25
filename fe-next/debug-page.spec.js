/**
 * Debug script to see what's on the page
 */

const { chromium } = require('playwright');

async function debugPage() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log('Navigating to page...');
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(3000);

  // Get page title
  const title = await page.title();
  console.log('Page title:', title);

  // Get all button texts
  const buttons = await page.locator('button').all();
  console.log(`\nFound ${buttons.length} buttons:`);
  for (let i = 0; i < Math.min(buttons.length, 20); i++) {
    const text = await buttons[i].textContent();
    const isVisible = await buttons[i].isVisible();
    console.log(`  ${i + 1}. "${text.trim()}" (visible: ${isVisible})`);
  }

  // Get all input fields
  const inputs = await page.locator('input').all();
  console.log(`\nFound ${inputs.length} input fields:`);
  for (let i = 0; i < inputs.length; i++) {
    const id = await inputs[i].getAttribute('id');
    const placeholder = await inputs[i].getAttribute('placeholder');
    const type = await inputs[i].getAttribute('type');
    const isVisible = await inputs[i].isVisible();
    console.log(`  ${i + 1}. id="${id}" type="${type}" placeholder="${placeholder}" (visible: ${isVisible})`);
  }

  // Take screenshot
  await page.screenshot({ path: '/Users/ohadfisher/git/boggle-new/fe-next/debug-screenshot.png', fullPage: true });
  console.log('\nScreenshot saved to debug-screenshot.png');

  // Get page HTML structure
  const bodyHTML = await page.evaluate(() => {
    const body = document.body;
    return body ? body.innerHTML.substring(0, 2000) : 'No body found';
  });
  console.log('\nPage HTML (first 2000 chars):', bodyHTML);

  await page.waitForTimeout(5000);
  await browser.close();
}

debugPage().catch(console.error);
