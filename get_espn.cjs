const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('https://www.espn.com/soccer/table/_/league/fifa.world', { waitUntil: 'domcontentloaded' });
  const content = await page.content();
  console.log(content.substring(0, 500));

  // Extract groups
  const groups = await page.evaluate(() => {
    const data = {};
    document.querySelectorAll('.Table__Title').forEach(title => {
        data[title.innerText] = [];
    });
    // the teams are usually in tables. Let's get the text of tables
    return data;
  });
  console.log(groups);

  await browser.close();
})();
