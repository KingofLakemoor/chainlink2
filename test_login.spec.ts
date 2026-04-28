import { test, expect } from '@playwright/test';

test('click connect to play', async ({ page }) => {
  await page.goto('http://localhost:3000/');
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  await page.waitForTimeout(2000);

  // Instead of clicking the Connect to Play button which triggers popup Auth in headless,
  // we dispatch the mock-login event for local testing as per memory instructions.
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('mock-login', {
      detail: {
        user: { uid: 'mock-test-user-123', email: 'test@example.com' },
        profile: {
           id: 'mock-test-user-123',
           name: 'Mock User',
           coins: 100,
           stats: { wins: 0, losses: 0, pushes: 0 }
        }
      }
    }));
  });

  await page.waitForTimeout(4000);
});
