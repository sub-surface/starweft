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
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2
  });

  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') console.log('PAGE ERROR:', msg.text());
  });

  const indexPath = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');
  console.log('Navigating to Game:', indexPath);
  await page.goto(indexPath);
  await page.waitForTimeout(600);

  // Skip boot crawl
  await page.keyboard.press('Space');
  await page.waitForTimeout(400);
  await page.keyboard.press('Space');
  await page.waitForTimeout(400);

  // Initialize and ensure we are in galaxy mode with title closed
  await page.evaluate(() => {
    const b = document.getElementById('bootOverlay');
    if (b) b.remove();
    const title = document.getElementById('titleModal');
    if (title) title.classList.add('hidden');

    if (window.SW && window.SW.game) {
      if (!window.SW.game.state) {
        window.SW.game.newGame({ seed: 'cam-demo', difficulty: 'relaxed' });
      }
      if (window.SW.render) {
        window.SW.render.mode = 'galaxy';
        window.SW.render.selectedSys = null;
      }
      if (window.SW.ui && window.SW.ui.refresh) {
        window.SW.ui.refresh();
      }
    }
  });
  await page.waitForTimeout(600);

  // 1. Sector scale: Orion Spur & The Severed Gulf
  await page.evaluate(() => {
    if (window.SW && window.SW.render) {
      const R = window.SW.render;
      R.cam.tx = 2800;
      R.cam.ty = 1200;
      R.cam.tz = 0;
      R.cam.dist = 5800;
      R.cam.distTarget = 5800;
      R.cam.yaw = 0.54;
      R.cam.pitch = 0.46;
    }
  });
  await page.waitForTimeout(800);
  const shot1 = path.join(outDir, '06_galaxy_orion_spur.png');
  await page.screenshot({ path: shot1 });
  console.log('Captured Orion Spur sector view:', shot1);

  // 2. Full Galactic scale: Milky Way spiral disk & arms
  await page.evaluate(() => {
    if (window.SW && window.SW.render) {
      const R = window.SW.render;
      R.cam.tx = 26600;
      R.cam.ty = 0;
      R.cam.tz = 0;
      R.cam.dist = 56000;
      R.cam.distTarget = 56000;
      R.cam.yaw = 0.58;
      R.cam.pitch = 0.52;
    }
  });
  await page.waitForTimeout(800);
  const shot2 = path.join(outDir, '07_galaxy_milky_way.png');
  await page.screenshot({ path: shot2 });
  console.log('Captured Full Milky Way view:', shot2);

  // 3. Intergalactic scale: Local Group, Andromeda M31 & Precursor Starbridge
  await page.evaluate(() => {
    if (window.SW && window.SW.render) {
      const R = window.SW.render;
      R.cam.tx = 35000;
      R.cam.ty = 18000;
      R.cam.tz = -10000;
      R.cam.dist = 150000;
      R.cam.distTarget = 150000;
      R.cam.yaw = 0.55;
      R.cam.pitch = 0.48;
    }
  });
  await page.waitForTimeout(800);
  const shot3 = path.join(outDir, '08_intergalactic_loom.png');
  await page.screenshot({ path: shot3 });
  console.log('Captured Intergalactic Loom view:', shot3);

  await browser.close();
  console.log('Galaxy scale screenshots complete');
})();
