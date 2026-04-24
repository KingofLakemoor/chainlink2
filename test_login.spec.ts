import { test, expect } from '@playwright/test';

test('click connect to play', async ({ page }) => {
  await page.goto('http://localhost:3000/');
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  await page.waitForTimeout(2000);

  const connectBtn = page.getByRole('button', { name: 'Connect to Play' });
  await connectBtn.click();
  await page.waitForTimeout(2000);
});
