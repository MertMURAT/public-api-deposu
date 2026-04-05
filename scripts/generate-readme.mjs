import { mkdir, readFile, writeFile } from "node:fs/promises";
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
const DOCS_DIR = path.join(repoRoot, "docs");
const TURKEY_FOCUSED_DOCS_PATH = path.join(DOCS_DIR, "turkey-focused-apis.md");
const TURKEY_FOCUSED_DOCS_LINK = "./docs/turkey-focused-apis.md";
const TURKEY_FOCUSED_IDS_PATH = path.join(repoRoot, "scripts", "data", "turkey-focused-api-ids.json");

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

async function loadTurkeyFocusedApiIds() {
  const raw = await readFile(TURKEY_FOCUSED_IDS_PATH, "utf8");
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error("Turkey-focused API ID file must be a JSON array.");
  }

  return [...new Set(
    parsed
      .map((value) => (typeof value === "string" ? value.trim() : ""))
      .filter(Boolean),
  )];
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

function buildApiCell(api, playgroundApiIds, options = {}) {
  const isTurkeyFocused = options.turkeyFocusedApiIds?.has(api.id);
  const title = isTurkeyFocused
    ? `**${escapeTableCell(api.name)}** <sup>🇹🇷 TR</sup>`
    : `**${escapeTableCell(api.name)}**`;
  const links = buildLinks(api, playgroundApiIds);
  return `${title}<br><sub>${links}</sub>`;
}

function buildCategorySection(category, apis, playgroundApiIds, options = {}) {
  const lines = [
    `## ${CATEGORY_LABELS[category] || category}`,
    "",
    "| API | Description | Auth | Free | Official |",
    "|:---|:---|:---|:---|:---:|",
  ];

  for (const api of sortApis(apis)) {
    const apiCell = buildApiCell(api, playgroundApiIds, options);
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

function buildReadme(apis, playgroundApiIds, turkeyFocusedApiIds) {
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
    "Browse public APIs with direct links to docs, Test Lab, and API Deposu detail pages.",
    "",
    `[![Catalog APIs](${buildBadge("catalog", `${apis.length} APIs`, "0a7ea4")})](${siteUrl("/catalog")})`,
    `[![Turkey-focused APIs](${buildBadge("turkey-focused", `${turkeyFocusedApiIds.size} APIs`, "dc2626")})](${TURKEY_FOCUSED_DOCS_LINK})`,
    `[![Playground Links](${buildBadge("playground", `${playgroundApiIds.size} links`, "1f8f5f")})](${siteUrl("/playground")})`,
    `[![Support](${buildBadge("donate", "buy me a coffee", "ffdd00")})](${donateUrl})`,
    `[![Issues](${buildBadge("issues", "feedback", "d97706")})](${ISSUES_URL})`,
    "",
    "## Quick Links",
    "",
    `- [Open live catalog](${siteUrl("/catalog")})`,
    `- [🇹🇷 Browse Turkey-focused APIs](${TURKEY_FOCUSED_DOCS_LINK})`,
    `- [Open playground](${siteUrl("/playground")})`,
    `- [Submit an API](${siteUrl("/submit")})`,
    `- [Report an issue](${ISSUES_URL})`,
    `- [Buy Me a Coffee](${donateUrl})`,
    "",
    "APIs marked with <sup>🇹🇷 TR</sup> belong to the curated Turkey-focused subset.",
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
    lines.push(buildCategorySection(category, categoryApis, playgroundApiIds, { turkeyFocusedApiIds }));
  }

  lines.push("## Contribute", "");
  lines.push("- Read the repository contribution rules in [CONTRIBUTING.md](./CONTRIBUTING.md).");
  lines.push(`- Use [Submit an API](${siteUrl("/submit")}) to send a new source for review.`);
  lines.push(`- Use [GitHub issues](${ISSUES_URL}) for table bugs, broken links, and README feedback.`);
  lines.push(`- Use [API Deposu support page](${siteUrl("/support")}) for product-side questions.`);
  lines.push("");

  lines.push("## Support The Project", "");
  lines.push("If this catalog saves you time, you can support maintenance and new curation work with a donation.");
  lines.push("");
  lines.push(`- [Buy Me a Coffee](${donateUrl})`);
  lines.push("");

  lines.push("## Project Files", "");
  lines.push("- [Contributing Guide](./CONTRIBUTING.md)");
  lines.push("- [License](./LICENSE)");
  lines.push("");

  lines.push("## Notes", "");
  lines.push("- This README is generated from `GET /catalog/apis` and `GET /catalog/playground`.");
  lines.push("- Long-form descriptions, release history, and docs content stay on API Deposu detail pages.");
  lines.push("- The README intentionally excludes internal analytics, ranking, moderation, and verification notes.");
  lines.push("");

  return lines.join("\n");
}

function buildTurkeyFocusedDocs(apis, playgroundApiIds, turkeyFocusedApiIds) {
  const turkeyFocusedApis = apis.filter((api) => turkeyFocusedApiIds.has(api.id));
  const categoriesWithApis = CATEGORY_ORDER.filter((category) =>
    turkeyFocusedApis.some((api) => api.category === category),
  );

  const lines = [
    "<!-- This file is generated by scripts/generate-readme.mjs. Do not edit by hand. -->",
    "",
    "# Turkey-focused APIs",
    "",
    "A curated list of APIs from the main catalog that directly target Turkish institutions, companies, or Turkey-specific data and products.",
    "",
    `[![Turkey-focused APIs](${buildBadge("turkey-focused", `${turkeyFocusedApis.length} APIs`, "dc2626")})](./turkey-focused-apis.md)`,
    `[![Main Catalog](${buildBadge("catalog", `${apis.length} APIs`, "0a7ea4")})](../README.md)`,
    `[![Playground Links](${buildBadge("playground", `${playgroundApiIds.size} links`, "1f8f5f")})](${siteUrl("/playground")})`,
    "",
    "## Quick Links",
    "",
    "- [Back to main README](../README.md)",
    `- [Open live catalog](${siteUrl("/catalog")})`,
    `- [Open playground](${siteUrl("/playground")})`,
    `- [Submit an API](${siteUrl("/submit")})`,
    "",
    "## Categories",
    "",
  ];

  for (const category of categoriesWithApis) {
    const count = turkeyFocusedApis.filter((api) => api.category === category).length;
    lines.push(`- [${CATEGORY_LABELS[category] || category} (${count})](#${categoryAnchor(category)})`);
  }

  lines.push("");

  for (const category of categoriesWithApis) {
    const categoryApis = turkeyFocusedApis.filter((api) => api.category === category);
    lines.push(buildCategorySection(category, categoryApis, playgroundApiIds));
  }

  lines.push("## Notes", "");
  lines.push("- This page is a curated subset of the public catalog.");
  lines.push("- The main README keeps all categories in one place; this page highlights the Turkey-focused slice only.");
  lines.push("- Descriptions stay short here. Use the detail pages for full notes and context.");
  lines.push("");

  return lines.join("\n");
}

async function main() {
  const turkeyFocusedApiIds = await loadTurkeyFocusedApiIds();
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

  const apiIds = new Set(
    apis
      .map((api) => api?.id)
      .filter((apiId) => typeof apiId === "string" && apiId.trim()),
  );
  const missingTurkeyFocusedApiIds = turkeyFocusedApiIds.filter((apiId) => !apiIds.has(apiId));

  if (missingTurkeyFocusedApiIds.length > 0) {
    throw new Error(
      `Turkey-focused API IDs not found in live catalog: ${missingTurkeyFocusedApiIds.join(", ")}`,
    );
  }

  const turkeyFocusedApiIdSet = new Set(turkeyFocusedApiIds);
  const readme = buildReadme(apis, playgroundApiIds, turkeyFocusedApiIdSet);
  const turkeyFocusedDocs = buildTurkeyFocusedDocs(apis, playgroundApiIds, turkeyFocusedApiIdSet);

  await mkdir(DOCS_DIR, { recursive: true });
  await writeFile(README_PATH, `${readme}\n`, "utf8");
  await writeFile(TURKEY_FOCUSED_DOCS_PATH, `${turkeyFocusedDocs}\n`, "utf8");

  console.log(
    `[generate:readme] README updated with ${apis.length} APIs, ${playgroundApiIds.size} playground links, and ${turkeyFocusedApiIdSet.size} Turkey-focused APIs.`,
  );
}

main().catch((error) => {
  console.error(`[generate:readme] FAILED: ${error.message}`);
  process.exit(1);
});
