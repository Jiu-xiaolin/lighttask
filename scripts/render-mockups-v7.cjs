const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");
const Module = require("module");

const bundledNodeModules =
  process.env.CODEX_NODE_MODULES ||
  "C:\\Users\\22760\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules";

process.env.NODE_PATH = [
  bundledNodeModules,
  path.join(bundledNodeModules, ".pnpm", "node_modules"),
  process.env.NODE_PATH,
]
  .filter(Boolean)
  .join(path.delimiter);
Module._initPaths();

const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");
const htmlPath = path.join(root, "mockups-v7", "index.html");
const outDir = path.join(root, "mockups-v7", "images");
const views = [
  ["dashboard", "01-dashboard.png"],
  ["projects", "02-project-workspace.png"],
  ["docs", "03-online-doc-editor.png"],
  ["sheet", "04-online-sheet-editor.png"],
  ["messages", "05-message-sync.png"],
  ["permissions", "06-permissions.png"],
];

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const chromeCandidates = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  ];
  const executablePath = chromeCandidates.find((candidate) => fs.existsSync(candidate));
  const browser = await chromium.launch({ headless: true, executablePath });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1180 },
    deviceScaleFactor: 1,
  });

  for (const [view, fileName] of views) {
    const url = `${pathToFileURL(htmlPath).href}?view=${view}`;
    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForTimeout(400);
    await page.screenshot({
      path: path.join(outDir, fileName),
      fullPage: false,
    });
  }

  await browser.close();
  console.log(views.map(([, fileName]) => path.join(outDir, fileName)).join("\n"));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
