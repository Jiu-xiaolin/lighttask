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
const htmlPath = path.join(root, "mockups-v8", "index.html");
const outDir = path.join(root, "mockups-v8", "images");
const views = [
  ["dashboard", "01-dashboard.png"],
  ["projects", "02-project-workspace.png"],
  ["docs", "03-online-doc-editor.png"],
  ["sheet", "04-online-sheet-editor.png"],
  ["messages", "05-message-sync.png"],
  ["permissions", "06-permissions.png"],
  ["docs", "07-theme-letter-doc.png", "theme=letter"],
  ["docs", "08-theme-love-letter-doc.png", "theme=love"],
  ["docs", "09-theme-windbell-doc.png", "theme=windbell"],
  ["docs", "10-theme-custom-doc.png", "theme=custom&blur=18px"],
  ["sheet", "11-theme-custom-sheet.png", "theme=custom&blur=18px"],
  ["dashboard", "12-theme-letter-dashboard.png", "theme=letter"],
  ["projects", "13-theme-love-projects.png", "theme=love"],
  ["messages", "14-theme-windbell-messages.png", "theme=windbell"],
  ["permissions", "15-theme-custom-permissions.png", "theme=custom&blur=18px"],
  ["dashboard", "16-personalization-menu.png", "personalize=menu"],
  ["dashboard", "17-personalization-skin-carousel.png", "personalize=skins&skinCard=love"],
  ["dashboard", "18-personalization-custom-card.png", "personalize=skins&skinCard=custom&blur=18px"],
  ["dashboard", "19-sidebar-compact-dashboard.png", "sidebar=compact"],
  ["projects", "20-sidebar-compact-projects-love.png", "sidebar=compact&theme=love"],
  ["messages", "21-sidebar-compact-icons-windbell.png", "sidebar=compact&theme=windbell"],
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

  for (const [view, fileName, query = ""] of views) {
    const url = new URL(pathToFileURL(htmlPath).href);
    url.searchParams.set("view", view);
    for (const [key, value] of new URLSearchParams(query)) {
      url.searchParams.set(key, value);
    }
    await page.goto(url.href, { waitUntil: "networkidle" });
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
