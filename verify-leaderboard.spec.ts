import React from 'react';
import { test, expect } from '@playwright/test';

test('LeaderboardsPage shows Next Pick', async ({ page }) => {
  await page.goto('http://localhost:3000/');
  await page.waitForTimeout(2000);

  // Dispatch mock login
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

  await page.waitForTimeout(2000);

  // It redirects to /play, let's just assert that
  console.log("Current URL after mock login:", page.url());

  // Navigate to leaderboards manually
  await page.goto('http://localhost:3000/leaderboards');
  await page.waitForTimeout(5000);

  console.log("BODY text:", await page.locator('body').innerText());

  // Check for the "Next Pick" column header
  await expect(page.locator('th', { hasText: 'Next Pick' })).toBeVisible();
});
