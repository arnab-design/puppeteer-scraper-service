const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
app.use(express.json());

app.get('/scrape', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).send('Missing ?url param');

  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2' });

  const links = await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll('a'));
    return anchors.map(a => a.href).filter(h => h.includes(location.hostname));
  });

  const uniqueLinks = [...new Set([url, ...links])].slice(0, 20);
  const results = [];

  for (let link of uniqueLinks) {
    try {
      const p = await browser.newPage();
      await p.goto(link, { waitUntil: 'domcontentloaded', timeout: 20000 });
      const text = await p.evaluate(() => document.body.innerText.trim());
      const title = await p.title();
      results.push({ url: link, title, text });
      await p.close();
    } catch (e) {
      results.push({ url: link, error: true });
    }
  }

  await browser.close();
  res.json({ pages: results });
});

app.listen(3000, () => console.log('Scraper running on port 3000'));