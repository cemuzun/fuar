const puppeteer = require('puppeteer');

async function run() {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  
  await page.goto("https://www.orbus.com", { waitUntil: 'domcontentloaded', timeout: 10000 });
  const html = await page.content();
  console.log(html.substring(0, 500));
  await browser.close();
}

run().catch(console.error);
