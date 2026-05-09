import { test, expect } from '@playwright/test';

test('click connect to play', async ({ page }) => {
  await page.goto('http://localhost:3000/');
  page.on('pageerror', msg => console.log('BROWSER ERROR:', msg));
  await page.waitForTimeout(2000);

  console.log("HTML before:", await page.content());
});
