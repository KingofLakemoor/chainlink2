const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();
  await page.goto('https://www.espn.com/soccer/standings/_/league/fifa.world', { waitUntil: 'networkidle' });
  const content = await page.content();

  if (content.includes('verify that you\'re not a robot')) {
      console.log('Got anti-bot page');
  }

  const groups = await page.evaluate(() => {
    const data = {};
    const tables = document.querySelectorAll('.Table__Title');
    tables.forEach((titleEl) => {
        let title = titleEl.innerText;
        let tbody = titleEl.nextElementSibling?.querySelector('tbody');
        if(tbody) {
            data[title] = [];
            tbody.querySelectorAll('tr').forEach(tr => {
                let teamName = tr.querySelector('.hide-mobile')?.innerText || tr.innerText;
                data[title].push(teamName);
            });
        }
    });
    return data;
  });
  console.log(JSON.stringify(groups, null, 2));

  await browser.close();
})();
