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
const htmlPath = path.join(root, "mockups-v10", "index.html");
const outDir = path.join(root, "mockups-v10", "images");
const views = [
  ["login", "00-login.png", "theme=letter"],
  ["global", "01-global-shell-personalization.png", "theme=love&personalize=skins&sidebar=compact"],
  ["dashboard", "02-dashboard.png", "theme=letter"],
  ["project-list", "03-project-list.png", "theme=love"],
  ["workspace", "04-project-workspace.png", "theme=letter"],
  ["files", "05-project-files.png", "theme=letter&sidebar=compact"],
  ["messages", "06-message-sync.png", "theme=windbell"],
  ["permissions", "07-permissions.png", "theme=letter"],
  ["support", "08-system-support.png", "theme=love"],
  ["profile", "09-user-settings.png", "theme=love&sidebar=compact"],
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
    viewport: { width: 1440, height: 1120 },
    deviceScaleFactor: 1,
  });

  for (const [view, fileName, query = ""] of views) {
    const url = new URL(pathToFileURL(htmlPath).href);
    url.searchParams.set("view", view);
    for (const [key, value] of new URLSearchParams(query)) {
      url.searchParams.set(key, value);
    }
    await page.goto(url.href, { waitUntil: "networkidle" });
    await page.waitForTimeout(450);
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
