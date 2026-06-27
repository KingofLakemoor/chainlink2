import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Set window size for desktop
  await page.setViewportSize({ width: 1280, height: 720 });

  await page.goto('http://localhost:3000/brackets/world-cup-2026', { waitUntil: 'load' });

  // Wait a bit for bracket data to potentially load/render if any fetch delay
  await page.waitForTimeout(4000);

  await page.screenshot({ path: 'brackets-update.png', fullPage: true });
  await browser.close();
})();
