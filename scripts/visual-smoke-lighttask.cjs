const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const { createLightTaskServer } = require("../app/server.cjs");

const bundledNodeModules =
  process.env.CODEX_NODE_MODULES ||
  "C:\\Users\\22760\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules";

process.env.NODE_PATH = [
  bundledNodeModules,
  path.join(bundledNodeModules, ".pnpm", "node_modules"),
  process.env.NODE_PATH
]
  .filter(Boolean)
  .join(path.delimiter);
Module._initPaths();

const { chromium } = require("playwright");

const outDir = path.join(process.cwd(), "app", ".visual-smoke");

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const dataDir = path.join("app", ".visual-smoke-data");
  fs.rmSync(dataDir, { recursive: true, force: true });
  const server = createLightTaskServer({ dataDir });
  await server.start(4190);

  const chromeCandidates = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
  ];
  const executablePath = chromeCandidates.find((candidate) => fs.existsSync(candidate));
  const browser = await chromium.launch({ headless: true, executablePath });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1120 }, deviceScaleFactor: 1 });

  try {
    await page.goto(server.url, { waitUntil: "networkidle" });
    await page.locator("#loginForm").waitFor();
    assert.equal(await page.locator(".login-card h2").textContent(), "欢迎回来");
    await page.screenshot({ path: path.join(outDir, "login.png"), fullPage: false });

    await page.locator("input[name='username']").fill("admin");
    await page.locator("input[name='password']").fill("admin123");
    await page.locator("#loginForm button[type='submit']").click();
    await page.waitForFunction(() => document.body.dataset.view === "dashboard");
    assert.equal(await page.locator("#page-title").textContent(), "行动仪表盘");
    await page.screenshot({ path: path.join(outDir, "dashboard.png"), fullPage: false });

    await page.locator(".account-trigger").click();
    await page.waitForFunction(() => document.body.dataset.personalize === "skins");
    await page.locator(".skin-card.windbell").click();
    assert.equal(await page.evaluate(() => document.body.dataset.theme), "windbell");

    await page.locator('[data-nav="workspace"]').click();
    await page.waitForFunction(() => document.body.dataset.view === "workspace");
    await page.locator("#quickTaskTitle").fill("UI smoke 动态任务");
    await page.locator(".quick-task-row button").click();
    await page.locator(".task", { hasText: "UI smoke 动态任务" }).waitFor();
    await page.screenshot({ path: path.join(outDir, "workspace-dynamic-task.png"), fullPage: false });

    await page.locator('[data-nav="files"]').click();
    await page.waitForFunction(() => document.body.dataset.view === "files");
    await page.screenshot({ path: path.join(outDir, "project-files-doc.png"), fullPage: false });

    await page.locator("#files .file-item").nth(1).click();
    await page.locator(".sheet-main .grid-sheet").waitFor();
    assert.equal(await page.locator(".sheet-main .editor-title strong").textContent(), "预算排期.xlsx");
    await page.screenshot({ path: path.join(outDir, "project-files-sheet.png"), fullPage: false });

    console.log(JSON.stringify({
      url: server.url,
      checked: ["login", "dashboard", "avatar personalization", "workspace dynamic task", "project files doc", "project files sheet"],
      screenshots: [
        path.join(outDir, "login.png"),
        path.join(outDir, "dashboard.png"),
        path.join(outDir, "workspace-dynamic-task.png"),
        path.join(outDir, "project-files-doc.png"),
        path.join(outDir, "project-files-sheet.png")
      ]
    }, null, 2));
  } finally {
    await browser.close();
    await server.stop();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
