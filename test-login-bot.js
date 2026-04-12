const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  await page.goto('http://localhost:3000/login');
  
  // Wait for the inputs
  await page.waitForSelector('input[name="email"]');
  await page.waitForSelector('input[name="password"]');
  
  await page.fill('input[name="email"]', 'test1@company.com');
  await page.fill('input[name="password"]', 'password');
  
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {})
  ]);
  
  const url = page.url();
  console.log("Navigated to:", url);
  
  await browser.close();
})();
