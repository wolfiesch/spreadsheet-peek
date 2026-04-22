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

    await page.setViewportSize({ width: 640, height: 140 });
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollHeight >= 600),
      true,
      "viewer should report a useful content height even when the host iframe starts collapsed",
    );
    await page.close();

    const hostPage = await browser.newPage({ viewport: { width: 760, height: 760 } });
    await hostPage.setContent(`
      <!doctype html>
      <html>
        <body style="margin:0;background:#181818">
          <iframe
            id="viewer"
            src="${url}"
            style="display:block;width:640px;height:140px;border:0"
          ></iframe>
          <script>
            const iframe = document.getElementById("viewer");
            window.addEventListener("message", (event) => {
              const message = event.data;
              if (!message || message.jsonrpc !== "2.0") return;
              if (message.method === "ui/initialize") {
                event.source.postMessage({
                  jsonrpc: "2.0",
                  id: message.id,
                  result: {
                    protocolVersion: message.params.protocolVersion,
                    hostInfo: { name: "test-host", version: "1.0.0" },
                    hostCapabilities: {},
                    hostContext: {
                      displayMode: "inline",
                      platform: "desktop",
                      containerDimensions: { width: 640, height: 140 }
                    }
                  }
                }, "*");
              }
              if (message.method === "ui/notifications/size-changed") {
                iframe.style.height = Math.max(140, Math.ceil(message.params.height || 0)) + "px";
              }
            });
          </script>
        </body>
      </html>
    `);

    await hostPage.waitForFunction(() => {
      const iframe = document.querySelector<HTMLIFrameElement>("#viewer");
      return iframe ? iframe.getBoundingClientRect().height >= 600 : false;
    });
    assert.equal(
      await hostPage.locator("#viewer").evaluate((iframe) => Math.round(iframe.getBoundingClientRect().height)),
      620,
      "viewer should ask an MCP Apps host to expand from a collapsed initial iframe",
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
