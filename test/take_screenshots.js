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
    deviceScaleFactor: 1
  });
  // Skip boot sequence and initialize clean state
  await context.addInitScript(() => {
    localStorage.setItem('sw_boot_seen', '1');
    localStorage.setItem('starweft_prefs', JSON.stringify({ skipBoot: true }));
  });

  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') console.log('PAGE ERROR:', msg.text());
  });

  const indexPath = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');
  console.log('Navigating to:', indexPath);
  await page.goto(indexPath);
  await page.waitForTimeout(1000);

  // Start new game cleanly if at title
  await page.evaluate(() => {
    if (globalThis.SW && globalThis.SW.game) {
      if (!globalThis.SW.game.state) {
        globalThis.SW.game.newGame({ seed: 'shot-verify', difficulty: 'standard' });
      }
      globalThis.SW.ui.hideModals();
      globalThis.SW.render.cam.dist = 180;
      globalThis.SW.render.cam.distTarget = 180;
      globalThis.SW.ui.refresh();
    }
  });
  await page.waitForTimeout(800);

  // Take screenshot 1: Galaxy Map & UI
  const shot1 = path.join(outDir, '01_galaxy_map.png');
  await page.screenshot({ path: shot1 });
  console.log('Captured:', shot1);

  // Open the Tech Tree with researched and available nodes
  try {
    await page.evaluate(() => {
      if (globalThis.SW && globalThis.SW.game && globalThis.SW.game.state) {
        const s = globalThis.SW.game.state;
        s.research = 240;
        if (!s.tech.unlocked.includes('cargopods')) s.tech.unlocked.push('cargopods');
        if (!s.tech.unlocked.includes('couriers')) s.tech.unlocked.push('couriers');
        if (!s.tech.unlocked.includes('depots')) s.tech.unlocked.push('depots');
      }
      if (globalThis.SW && globalThis.SW.uiTech) {
        globalThis.SW.ui.techView.selected = 'freighters';
        globalThis.SW.uiTech.open();
      }
    });
    await page.waitForTimeout(800);

    const shot2 = path.join(outDir, '02_radial_tech_tree.png');
    try {
      if (fs.existsSync(shot2)) { fs.unlinkSync(shot2); }
      await page.screenshot({ path: shot2 });
      console.log('Captured:', shot2);
    } catch (err1) {
      const shot2v2 = path.join(outDir, '02_radial_tech_tree_v2.png');
      await page.screenshot({ path: shot2v2 });
      console.log('Captured:', shot2v2);
    }
  } catch (e) {
    console.error('Error capturing tech tree:', e);
  }

  // Open the Pledges tab to inspect the Unified Logistics Exchange
  try {
    await page.evaluate(() => {
      if (globalThis.SW && globalThis.SW.uiTech) globalThis.SW.uiTech.close();
      if (globalThis.SW && globalThis.SW.ui) {
        globalThis.SW.ui.setTab('pledges');
        globalThis.SW.ui.refresh();
      }
    });
    await page.waitForTimeout(600);

    const shot3 = path.join(outDir, '03_logistics_exchange.png');
    await page.screenshot({ path: shot3 });
    console.log('Captured:', shot3);
  } catch (e) {
    console.error('Error capturing logistics exchange:', e);
  }

  await browser.close();
  console.log('All screenshots complete');
})();
