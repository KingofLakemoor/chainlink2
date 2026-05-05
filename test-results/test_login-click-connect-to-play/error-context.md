# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: test_login.spec.ts >> click connect to play
- Location: test_login.spec.ts:3:1

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/
Call log:
  - navigating to "http://localhost:3000/", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  |
  3  | test('click connect to play', async ({ page }) => {
> 4  |   await page.goto('http://localhost:3000/');
     |              ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/
  5  |   page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  6  |   await page.waitForTimeout(2000);
  7  |
  8  |   // Instead of clicking the Connect to Play button which triggers popup Auth in headless,
  9  |   // we dispatch the mock-login event for local testing as per memory instructions.
  10 |   await page.evaluate(() => {
  11 |     window.dispatchEvent(new CustomEvent('mock-login', {
  12 |       detail: {
  13 |         user: { uid: 'mock-test-user-123', email: 'test@example.com' },
  14 |         profile: {
  15 |            id: 'mock-test-user-123',
  16 |            name: 'Mock User',
  17 |            coins: 100,
  18 |            stats: { wins: 0, losses: 0, pushes: 0 }
  19 |         }
  20 |       }
  21 |     }));
  22 |   });
  23 |
  24 |   await page.waitForTimeout(4000);
  25 | });
  26 |
```