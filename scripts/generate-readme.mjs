import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const CATALOG_API_BASE = (process.env.CATALOG_API_BASE || "https://api.apideposu.com").replace(/\/+$/, "");
const SITE_BASE_URL = (process.env.SITE_BASE_URL || "https://apideposu.com").replace(/\/+$/, "");
const SITE_LOCALE = (process.env.SITE_LOCALE || "en").trim() || "en";
const REPO_URL = (process.env.REPO_URL || "https://github.com/MertMURAT/public-api-deposu").replace(/\/+$/, "");
const ISSUES_URL = `${REPO_URL}/issues`;
const DONATE_URL = "https://buymeacoffee.com/apideposu";
const APP_ICON_PATH = "./assets/app-icon.png";
const README_PATH = path.join(repoRoot, "README.md");

const CATEGORY_ORDER = [
  "public",
  "sports",
  "gaming",
  "entertainment",
  "finance",
  "logistics",
  "ecommerce",
  "communication",
  "maps",
  "identity",
  "business",
  "ai",
  "monitoring",
  "infrastructure",
  "developer-tools",
];

const CATEGORY_LABELS = {
  public: "Public Data",
  sports: "Sports",
  gaming: "Gaming",
  entertainment: "Entertainment",
  finance: "Finance",
  logistics: "Logistics",
  ecommerce: "Ecommerce",
  communication: "Communication",
  maps: "Maps",
  identity: "Identity",
  business: "Business",
  ai: "AI",
  monitoring: "Monitoring",
  infrastructure: "Infrastructure",
  "developer-tools": "Developer Tools",
};

const FREE_TIER_LABELS = {
  free: "Free",
  sandbox: "Sandbox",
  trial: "Trial",
  limited: "Limited",
  paid: "Paid",
  unknown: "Unknown",
};

function escapeTableCell(value) {
  return String(value || "")
    .replace(/\r?\n/g, " ")
    .replace(/\|/g, "\\|")
    .replace(/\s+/g, " ")
    .trim();
}

function shorten(value, maxLength = 110) {
  const clean = escapeTableCell(value);
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength - 3).trimEnd()}...`;
}

function toOfficialMark(value) {
  return value ? "&#10003;" : "-";
}

function foldText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[ıİ]/g, "i")
    .toLowerCase();
}

function normalizeAuth(value) {
  const raw = escapeTableCell(value || "Unknown");
  const lower = foldText(raw);

  if (
    lower === "yok" ||
    lower.startsWith("yok ") ||
    lower.startsWith("yok(") ||
    lower.startsWith("yok (") ||
    lower === "none" ||
    lower === "no" ||
    lower.includes("api key gerekmez")
  ) {
    return "No";
  }

  if (lower === "acik" || lower.startsWith("acik ") || lower === "open") {
    return "Open";
  }

  if (lower === "apikey" || lower === "api key" || lower.startsWith("api key ")) {
    return "API Key";
  }

  if (lower.includes("oauth")) {
    return "OAuth 2.0";
  }

  if (lower.includes("bearer")) {
    return "Bearer";
  }

  if (lower.includes("basic")) {
    return "Basic";
  }

  return raw;
}

function categoryAnchor(category) {
  return category.toLowerCase();
}

function siteUrl(pathname) {
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${SITE_BASE_URL}/${SITE_LOCALE}${normalizedPath}`;
}

function detailUrl(apiId) {
  return siteUrl(`/catalog/${encodeURIComponent(apiId)}`);
}

function testUrl(apiId) {
  return siteUrl(`/playground?api=${encodeURIComponent(apiId)}`);
}

function buildBadge(label, message, color) {
  return `https://img.shields.io/badge/${encodeURIComponent(label)}-${encodeURIComponent(message)}-${encodeURIComponent(color)}`;
}

async function getJson(url) {
  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText} (${url})`);
  }

  return response.json();
}

function sortApis(apis) {
  return [...apis].sort((left, right) => left.name.localeCompare(right.name, "en"));
}

function buildLinks(api, playgroundApiIds) {
  const parts = [];

  if (api.docsUrl) {
    parts.push(`[Docs](${api.docsUrl})`);
  }

  if (playgroundApiIds.has(api.id)) {
    parts.push(`[Test](${testUrl(api.id)})`);
  }

  parts.push(`[Detail](${detailUrl(api.id)})`);
  return parts.join(" &middot; ");
}

function buildApiCell(api, playgroundApiIds) {
  const title = `**${escapeTableCell(api.name)}**`;
  const links = buildLinks(api, playgroundApiIds);
  return `${title}<br><sub>${links}</sub>`;
}

function buildCategorySection(category, apis, playgroundApiIds) {
  const lines = [
    `## ${CATEGORY_LABELS[category] || category}`,
    "",
    "| API | Description | Auth | Free | Official |",
    "|:---|:---|:---|:---|:---:|",
  ];

  for (const api of sortApis(apis)) {
    const apiCell = buildApiCell(api, playgroundApiIds);
    const description = shorten(api.summary?.en || api.summary?.tr || api.name);
    const auth = normalizeAuth(api.auth);
    const freeTier = FREE_TIER_LABELS[api.freeTier] || "Unknown";
    const official = toOfficialMark(api.official);

    lines.push(
      `| ${apiCell} | ${description} | ${auth} | ${freeTier} | ${official} |`,
    );
  }

  lines.push("");
  return lines.join("\n");
}

function buildReadme(apis, playgroundApiIds) {
  const categoriesWithApis = CATEGORY_ORDER.filter((category) =>
    apis.some((api) => api.category === category),
  );
  const donateUrl = DONATE_URL;

  const lines = [
    "<!-- This file is generated by scripts/generate-readme.mjs. Do not edit by hand. -->",
    "",
    `<p align="center">`,
    `  <a href="${siteUrl("/catalog")}">`,
    `    <img src="${APP_ICON_PATH}" width="92" alt="API Deposu icon" />`,
    "  </a>",
    "</p>",
    "",
    "# API Deposu Public Catalog",
    "",
    "A public API catalog for developers.",
    "",
    "Browse public APIs with direct links to docs, Test Lab, and API Deposu detail pages.",
    "",
    `[![Catalog APIs](${buildBadge("catalog", `${apis.length} APIs`, "0a7ea4")})](${siteUrl("/catalog")})`,
    `[![Playground Links](${buildBadge("playground", `${playgroundApiIds.size} links`, "1f8f5f")})](${siteUrl("/playground")})`,
    `[![Support](${buildBadge("donate", "buy me a coffee", "ffdd00")})](${donateUrl})`,
    `[![Sync](${buildBadge("sync", "daily", "555555")})](${REPO_URL}/actions/workflows/sync-readme.yml)`,
    `[![Issues](${buildBadge("issues", "feedback", "d97706")})](${ISSUES_URL})`,
    "",
    "## Quick Links",
    "",
    `- [Open live catalog](${siteUrl("/catalog")})`,
    `- [Open playground](${siteUrl("/playground")})`,
    `- [Donate / Buy Me a Coffee](${donateUrl})`,
    `- [Submit an API](${siteUrl("/submit")})`,
    `- [Support](${siteUrl("/support")})`,
    `- [Report an issue](${ISSUES_URL})`,
    "- [Contributing Guide](./CONTRIBUTING.md)",
    "- [License](./LICENSE)",
    "",
    "## How To Use",
    "",
    "1. Find an API in the category tables below.",
    "2. Use the inline `Docs`, `Test`, and `Detail` links under each API name.",
    "3. Use `Test` when a public playground config exists.",
    "",
    "## What You Get",
    "",
    `- ${apis.length} live catalog entries`,
    `- ${playgroundApiIds.size} public test/playground links`,
    "- Category-based discovery",
    "- Official documentation links",
    "- Detail pages on API Deposu",
    "",
    "## Contribute",
    "",
    "- Read the repository contribution rules in [CONTRIBUTING.md](./CONTRIBUTING.md).",
    `- Use [Submit an API](${siteUrl("/submit")}) to send a new source for review.`,
    `- Use [GitHub issues](${ISSUES_URL}) for table bugs, broken links, and README feedback.`,
    `- Use [Support](${siteUrl("/support")}) for product-side questions.`,
    "",
    "## Support The Project",
    "",
    "If this catalog saves you time, you can support maintenance and new curation work with a donation.",
    "",
    `- [Buy Me a Coffee](${donateUrl})`,
    `- [API Deposu support page](${siteUrl("/support")})`,
    "",
    "## Categories",
    "",
  ];

  for (const category of categoriesWithApis) {
    const count = apis.filter((api) => api.category === category).length;
    lines.push(`- [${CATEGORY_LABELS[category] || category} (${count})](#${categoryAnchor(category)})`);
  }

  lines.push("");

  for (const category of categoriesWithApis) {
    const categoryApis = apis.filter((api) => api.category === category);
    lines.push(buildCategorySection(category, categoryApis, playgroundApiIds));
  }

  lines.push("## Notes", "");
  lines.push("- This README is generated from `GET /catalog/apis` and `GET /catalog/playground`.");
  lines.push("- Long-form descriptions, release history, and docs content stay on API Deposu detail pages.");
  lines.push("- The README intentionally excludes internal analytics, ranking, moderation, and verification notes.");
  lines.push("");

  return lines.join("\n");
}

async function main() {
  const [apis, playground] = await Promise.all([
    getJson(`${CATALOG_API_BASE}/catalog/apis?limit=500`),
    getJson(`${CATALOG_API_BASE}/catalog/playground`),
  ]);

  if (!Array.isArray(apis)) {
    throw new Error("Catalog API response is not an array.");
  }

  if (!Array.isArray(playground)) {
    throw new Error("Playground API response is not an array.");
  }

  const playgroundApiIds = new Set(
    playground
      .map((entry) => entry?.apiId)
      .filter((apiId) => typeof apiId === "string" && apiId.trim()),
  );

  const readme = buildReadme(apis, playgroundApiIds);
  await writeFile(README_PATH, `${readme}\n`, "utf8");

  console.log(
    `[generate:readme] README updated with ${apis.length} APIs and ${playgroundApiIds.size} playground links.`,
  );
}

main().catch((error) => {
  console.error(`[generate:readme] FAILED: ${error.message}`);
  process.exit(1);
});
