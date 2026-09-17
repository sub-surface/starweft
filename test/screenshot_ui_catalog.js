const path = require('path');
const fs = require('fs');
const { chromium } = require('C:/Users/Leon/node_modules/playwright');

(async () => {
  const artifactDir = 'C:/Users/Leon/.gemini/antigravity-cli/brain/85319694-7da3-4946-baa1-1f3ecc210dd2';
  const outDir = path.join(artifactDir, 'shots');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    args: ['--allow-file-access-from-files']
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 1100 },
    deviceScaleFactor: 2
  });

  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') console.log('PAGE ERROR:', msg.text());
  });

  const catalogPath = 'file:///' + path.resolve(__dirname, 'ui_catalog.html').replace(/\\/g, '/');
  console.log('Navigating to UI Catalog:', catalogPath);
  await page.goto(catalogPath);
  await page.waitForTimeout(600);

  const shotCatalog = path.join(outDir, '04_ui_catalog.png');
  try { if (fs.existsSync(shotCatalog)) fs.unlinkSync(shotCatalog); } catch (e) {}
  await page.screenshot({ path: shotCatalog, fullPage: true });
  console.log('Captured full catalog:', shotCatalog);

  // Capture close-up of orbital ring section
  const ring1El = await page.$('#stageFullRing');
  if (ring1El) {
    const shotRing = path.join(outDir, '05_orbital_ring_closeup.png');
    try { if (fs.existsSync(shotRing)) fs.unlinkSync(shotRing); } catch (e) {}
    await ring1El.screenshot({ path: shotRing });
    console.log('Captured orbital ring closeup:', shotRing);
  }

  await browser.close();
  console.log('UI catalog capture complete');
})();
