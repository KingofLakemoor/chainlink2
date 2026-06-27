import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.setViewportSize({ width: 1280, height: 720 });

  await page.goto('http://localhost:3000/brackets/world-cup-2026', { waitUntil: 'load' });

  // Wait a bit to ensure UI loads
  await page.waitForTimeout(4000);

  // Click mock-login via console evaluation
  await page.evaluate(() => {
    window.dispatchEvent(new Event('mock-login'));
  });

  // Wait for login to process
  await page.waitForTimeout(2000);

  // Switch to leaderboard tab
  await page.getByRole('button', { name: 'Leaderboard' }).click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'brackets-leaderboard-pot-fixed.png', fullPage: true });

  await browser.close();
})();
