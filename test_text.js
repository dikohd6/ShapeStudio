const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('file:///Users/aryanmalhotra/Documents/CS 4474/Project/shape-studio-wireframe/index.html');
  await page.click('#tool-text');
  await page.click('.canvas', { offset: { x: 300, y: 300 } });
  
  // Try double clicking the text box
  await page.mouse.click(350, 310, { clickCount: 2, delay: 50 });
  await page.waitForTimeout(500);
  
  await page.keyboard.type('Hello', {delay: 50});
  
  const textContent = await page.evaluate(() => {
    return document.querySelector('#s_1').innerText;
  });
  console.log("Text Content after typing:", textContent);
  
  await browser.close();
})();
