if (!process.env.PLAYWRIGHT_BROWSERS_PATH) {
  process.env.PLAYWRIGHT_BROWSERS_PATH = '0';
}
const { chromium } = require('playwright');
const { parsePrice, parseStock } = require('./priceParser');
const logger = require('../utils/logger');
const { SCRAPER } = require('../config/constants');

/**
 * Measures the clock skew between the client machine and the target server.
 * The mock store strictly rejects attestation if client telemetry timestamps
 * are in the future relative to the challenge creation time (hoverAt > chal.ts).
 *
 * @param {string} storeOrigin - Target origin (e.g. https://demo.inelabteamdev.com)
 * @returns {Promise<number>} - Clock skew in ms (positive if client is ahead of server)
 */
async function getClockSkew(storeOrigin) {
  try {
    const start = Date.now();
    const res = await fetch(`${storeOrigin}/api/challenge`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      },
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.ts) {
        const localNow = Date.now();
        const latency = Math.round((localNow - start) / 2);
        const serverTime = data.ts;
        const skew = localNow - latency - serverTime;
        logger.info(`Clock sync: local is ${skew}ms ahead of server (latency ~${latency}ms)`);
        return skew;
      }
    }
  } catch (err) {
    logger.warn(`Could not measure clock skew against server: ${err.message}`);
  }
  return 0;
}

/**
 * Scrapes a single product page using Playwright Chromium.
 * Handles the INE mock store's interactive mouse-movement challenge,
 * clock synchronization, delayed cookie modals, simulated click drops, and retries.
 *
 * @param {string} productUrl - Full URL to product details page
 * @param {object} options - Options { headless: boolean, slowMo: number, timeoutMs: number, productName?: string }
 * @returns {Promise<{ success: boolean, productName: string, price: number, rawPrice: string, stock: string, durationMs: number, error?: string }>}
 */
async function scrapeProductPage(productUrl, options = {}) {
  const startTime = Date.now();
  const headless = options.headless !== undefined ? options.headless : true;
  const slowMo = options.slowMo || 0;
  const timeoutMs = options.timeoutMs || SCRAPER.DEFAULT_TIMEOUT_MS;

  let browser = null;
  let context = null;
  let page = null;

  // Helper to remove delayed cookie modal from DOM
  const clearCookieOverlay = async (p) => {
    try {
      await p.evaluate(() => {
        const overlay = document.querySelector('.cookie-overlay');
        if (overlay) {
          overlay.remove();
          document.body.style.overflow = '';
        }
      });
    } catch (_) {}
  };

  // Helper to simulate smooth human mouse movement for telemetry challenges
  const moveMouseSmoothly = async (p, targetX, targetY, opts = {}) => {
    const steps = opts.minMoves || 15;
    for (let i = 0; i < steps; i++) {
      const x = targetX - 40 + i * (40 / steps) + (i % 2 === 0 ? 3 : -3);
      const y = targetY - 20 + i * (20 / steps) + (i % 2 === 0 ? -2 : 2);
      await p.mouse.move(x, y);
      await p.waitForTimeout(35);
    }
    await p.mouse.move(targetX, targetY);
    if (opts.dwellMs) await p.waitForTimeout(opts.dwellMs);
  };

  try {
    logger.info(`Starting scrape for URL: ${productUrl} (headless: ${headless})`);

    // 1. Measure clock skew and determine time offset
    let targetOrigin = 'https://demo.inelabteamdev.com';
    try {
      targetOrigin = new URL(productUrl).origin;
    } catch (_) {}

    const clockSkew = await getClockSkew(targetOrigin);
    // If local clock is running ahead of the server, offset Date.now() in browser context
    // Adding 1500ms safety margin ensures hoverAt is strictly before challenge ts
    const timeOffset = clockSkew > 500 ? clockSkew + 1500 : 0;

    const launchArgs = [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
    ];

    try {
      browser = await chromium.launch({
        headless,
        slowMo,
        args: launchArgs,
      });
    } catch (launchErr) {
      if (launchErr.message.includes("doesn't exist") || launchErr.message.includes('playwright install')) {
        logger.warn('Playwright browser binary not found at launch path. Attempting auto-installation...');
        const { execSync } = require('child_process');
        execSync('npx playwright install chromium', {
          stdio: 'inherit',
          env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: process.env.PLAYWRIGHT_BROWSERS_PATH || '0' },
        });
        browser = await chromium.launch({
          headless,
          slowMo,
          args: launchArgs,
        });
      } else {
        throw launchErr;
      }
    }

    context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      viewport: { width: 1440, height: 900 },
    });

    // Inject clock synchronization init script if needed
    if (timeOffset > 0) {
      await context.addInitScript(`
        (function() {
          const offset = ${timeOffset};
          const origDateNow = Date.now;
          Date.now = function() {
            return origDateNow() - offset;
          };
        })();
      `);
    }

    page = await context.newPage();
    page.setDefaultTimeout(timeoutMs);

    // 2. Navigate to the product page
    await page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: SCRAPER.PAGE_LOAD_TIMEOUT_MS });
    await page.waitForTimeout(1000);
    await clearCookieOverlay(page);

    // 3. Wait for price block container
    const priceBlockLocator = page.locator('.price-block').first();
    await priceBlockLocator.waitFor({ state: 'visible', timeout: 15000 });

    await clearCookieOverlay(page);

    // 4. Perform natural mouse movements to satisfy minMoves (8) and minDwellMs (600ms)
    const box = await priceBlockLocator.boundingBox();
    if (!box) {
      throw new Error('Price block bounding box could not be determined');
    }

    for (let i = 0; i < 20; i++) {
      await clearCookieOverlay(page);
      const currentX = box.x + 30 + i * 15;
      const currentY = box.y + 35 + (i % 3) * 6;
      await page.mouse.move(currentX, currentY);
      await page.waitForTimeout(50);
    }

    // Dwell time for hover accumulation
    await page.waitForTimeout(800);
    await clearCookieOverlay(page);

    // 5. Click reveal price button
    const revealButton = priceBlockLocator.locator('button').first();
    const btnBox = await revealButton.boundingBox();

    if (!btnBox) {
      throw new Error('Reveal button coordinates not found');
    }

    const clickX = btnBox.x + btnBox.width / 2;
    const clickY = btnBox.y + btnBox.height / 2;

    await clearCookieOverlay(page);
    await page.mouse.click(clickX, clickY);

    // 6. Handle simulated dropped click (Xn wrapper)
    for (let check = 0; check < 4; check++) {
      await page.waitForTimeout(800);
      await clearCookieOverlay(page);
      const isIdle = await page.evaluate(() => {
        const el = document.querySelector('.price-block');
        return el && el.classList.contains('price-idle');
      });
      if (!isIdle) break;
      logger.info('Button remained idle (click may have been dropped by mock store latency simulation). Retrying click...');
      await page.mouse.click(clickX, clickY);
    }

    // 7. Wait for price & stock to resolve or handle simulated retry/error
    let resolved = false;
    let lastStatusText = '';
    let tryAgainClicks = 0;

    for (let poll = 0; poll < 35; poll++) {
      await page.waitForTimeout(800);
      await clearCookieOverlay(page);

      const status = await page.evaluate(() => {
        const block = document.querySelector('.price-block');
        if (!block) return { text: '', hasPrice: false, hasError: false, hasTryAgain: false, isIdle: false };

        const text = block.innerText;
        const hasPrice = text.includes('₹') || /Rs\./i.test(text);
        const hasError = block.classList.contains('price-error') || text.includes('Couldn’t load');
        const hasTryAgain = block.querySelector('button') && text.toUpperCase().includes('TRY AGAIN');
        const isIdle = block.classList.contains('price-idle');

        return { text, hasPrice, hasError, hasTryAgain, isIdle };
      });

      lastStatusText = status.text;

      if (status.hasPrice) {
        resolved = true;
        break;
      }

      // If button reverted to or stayed idle, retry click
      if (status.isIdle && poll % 3 === 0) {
        logger.info('Price block returned to idle state. Retrying click on Reveal button...');
        await page.mouse.click(clickX, clickY);
        continue;
      }

      // If store challenge failed internally, click "TRY AGAIN" with mouse motion
      if (status.hasTryAgain && tryAgainClicks < 3) {
        tryAgainClicks++;
        logger.warn(`Mock store transient challenge failure. Clicking "TRY AGAIN" (attempt ${tryAgainClicks}/3)...`);
        await clearCookieOverlay(page);
        const tryBtn = page.locator('.price-block button');
        const tBox = await tryBtn.boundingBox().catch(() => null);
        if (tBox) {
          await moveMouseSmoothly(page, tBox.x + tBox.width / 2, tBox.y + tBox.height / 2, { minMoves: 6, dwellMs: 400 });
          await page.mouse.click(tBox.x + tBox.width / 2, tBox.y + tBox.height / 2);
        } else {
          await page.evaluate(() => {
            const btn = document.querySelector('.price-block button');
            if (btn) btn.click();
          });
        }
        await page.waitForTimeout(1500);
      } else if (status.hasError && tryAgainClicks >= 3) {
        // Fast fail to let outer retry load a fresh session token
        throw new Error(`Transient store challenge error: ${status.text.replace(/\n/g, ' ').slice(0, 100)}`);
      }
    }

    if (!resolved) {
      throw new Error(`Failed to resolve price: ${lastStatusText.replace(/\n/g, ' ').slice(0, 150) || 'Timeout'}`);
    }

    // 8. Extract price, stock, and title
    const extracted = await page.evaluate(() => {
      const block = document.querySelector('.price-block');
      if (!block) return null;

      const titleEl = document.querySelector('h1');
      const titleText = titleEl ? titleEl.innerText.trim() : '';

      // Extract specific price element (prefer actual shown price value class over MRP)
      const priceValEl = block.querySelector('[class*="pv-"], [class*="priceValue"], .price-value');
      let priceText = priceValEl ? priceValEl.innerText.trim() : '';

      if (!priceText) {
        const spans = Array.from(block.querySelectorAll('span, p, div'));
        for (const s of spans) {
          if (s.innerText.includes('₹') || /Rs\./i.test(s.innerText)) {
            priceText = s.innerText.trim();
            break;
          }
        }
      }

      // Extract stock element
      const stockEl = block.querySelector('.stock, .stock-badge, [class*="st-"]');
      const stockText = stockEl ? stockEl.innerText.trim() : '';

      return {
        titleText,
        priceText: priceText || block.innerText,
        stockText: stockText || block.innerText,
        fullText: block.innerText,
      };
    });

    const parsedPrice = parsePrice(extracted.priceText || extracted.fullText);
    if (!parsedPrice.isValid) {
      throw new Error(`Price validation failed: ${parsedPrice.error}`);
    }

    const parsedStock = parseStock(extracted.stockText || extracted.fullText);
    if (!parsedStock.isValid) {
      throw new Error(`Stock validation failed: ${parsedStock.error}`);
    }

    const durationMs = Date.now() - startTime;
    const productName = options.productName || extracted.titleText || 'Tracked Product';
    logger.info(`Successfully scraped "${productName}": ₹${parsedPrice.price}, "${parsedStock.stock}" (${durationMs}ms)`);

    return {
      success: true,
      productName,
      price: parsedPrice.price,
      rawPrice: parsedPrice.raw,
      stock: parsedStock.stock,
      durationMs,
    };
  } catch (err) {
    const durationMs = Date.now() - startTime;
    logger.error(`Scrape failed for ${productUrl}: ${err.message} (${durationMs}ms)`);
    return {
      success: false,
      productName: options.productName || 'Tracked Product',
      price: null,
      rawPrice: null,
      stock: null,
      durationMs,
      error: err.message,
    };
  } finally {
    if (context) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
  }
}

module.exports = {
  scrapeProductPage,
};
