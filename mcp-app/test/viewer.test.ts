import assert from "node:assert/strict";
import test from "node:test";

import { chromium } from "playwright";
import type { Browser, Locator } from "playwright";
import { createServer } from "vite";

test("viewer renders workbook chrome, search, and range selection", async () => {
  const server = await createServer({
    root: process.cwd(),
    logLevel: "silent",
    server: {
      host: "127.0.0.1",
      port: 0,
    },
  });
  await server.listen();

  let browser: Browser | null = null;
  try {
    browser = await chromium.launch();
    const url = server.resolvedUrls?.local[0];
    assert.ok(url, "Vite did not report a local URL");

    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await page.goto(url);

    await page.locator(".grid td").first().waitFor();
    assert.equal(await page.locator(".sheet-tab").count(), 3);
    await assertText(page.locator("h1"), /sample-financials\.xlsx/);

    await page.locator("#search").fill("gross");
    await assertText(page.locator(".status-row"), /search matches/);

    await page.locator('td[data-row="3"][data-column="2"]').click();
    await assertText(page.locator("#status"), /B3:B3/);
    assert.equal(await page.locator("#summarize").isEnabled(), true);

    await page.setViewportSize({ width: 640, height: 680 });
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      true,
      "viewer chrome should fit narrow Claude embeds without document-level horizontal overflow",
    );
    assert.equal(
      await page.evaluate(() => {
        const grid = document.querySelector(".grid-wrap");
        return grid ? grid.scrollWidth > grid.clientWidth : false;
      }),
      true,
      "wide spreadsheet columns should scroll inside the grid region",
    );
  } finally {
    await browser?.close();
    await server.close();
  }
});

async function assertText(locator: Locator, pattern: RegExp) {
  const text = await locator.textContent();
  assert.match(text ?? "", pattern);
}
