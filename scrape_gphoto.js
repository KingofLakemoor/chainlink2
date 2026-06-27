import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://share.google/jBsjtBjiLbUqBr9c2', { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'gphoto.png' });
  await browser.close();
})();
