const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('requestfailed', request => console.log('REQ FAIL:', request.url(), request.failure()?.errorText));
  page.on('response', resp => {
    if (resp.url().includes('api/auth') || resp.status() >= 400) {
      console.log('RESPONSE:', resp.url(), resp.status());
    }
  });

  await page.goto('http://localhost:3000/login');
  await page.fill('input[name="email"]', 'test1@company.com');
  await page.fill('input[name="password"]', 'password');
  await page.click('button[type="submit"]');
  
  await page.waitForTimeout(3000);
  console.log('FINAL URL:', page.url());
  const errorText = await page.locator('p[style*="var(--danger)"]').textContent().catch(() => null);
  if (errorText) console.log('PAGE ERROR TEXT UI:', errorText);

  await browser.close();
})();
