import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const TEXT_EXTENSIONS = new Set([
  ".js",
  ".mjs",
  ".cjs",
  ".json",
  ".md",
  ".yml",
  ".yaml",
  ".gitignore",
  ".txt",
]);

const IGNORED_DIRS = new Set([".git", "node_modules"]);
const IGNORED_FILES = new Set(["README.md", "LICENSE"]);

const RULES = [
  { name: "OpenAI key", pattern: /\bsk-[A-Za-z0-9]{20,}\b/g },
  { name: "GitHub token", pattern: /\bghp_[A-Za-z0-9]{20,}\b/g },
  { name: "GitHub PAT", pattern: /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g },
  { name: "Slack token", pattern: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g },
  { name: "AWS access key", pattern: /\bAKIA[0-9A-Z]{16}\b/g },
  { name: "Google API key", pattern: /\bAIza[0-9A-Za-z_-]{20,}\b/g },
  { name: "JWT-like token", pattern: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g },
  { name: "Private key block", pattern: /BEGIN (?:RSA|OPENSSH|EC|DSA|PGP) PRIVATE KEY/g },
  {
    name: "Credentialed database URL",
    pattern: /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis):\/\/[^/\s:]+:[^@\s]+@/gi,
  },
  {
    name: "Inline secret assignment",
    pattern: /\b(?:token|secret|api[_-]?key|password)\b\s*[:=]\s*["'][^"'\n]{8,}["']/gi,
  },
];

function shouldScanFile(filePath) {
  const relative = path.relative(repoRoot, filePath).replaceAll("\\", "/");
  const baseName = path.basename(filePath);
  if (IGNORED_FILES.has(baseName)) return false;
  const ext = path.extname(filePath).toLowerCase();
  return TEXT_EXTENSIONS.has(ext) || baseName === ".gitignore";
}

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      files.push(...(await walk(fullPath)));
      continue;
    }
    if (shouldScanFile(fullPath)) {
      files.push(fullPath);
    }
  }

  return files;
}

async function main() {
  const files = await walk(repoRoot);
  const findings = [];

  for (const file of files) {
    const content = await readFile(file, "utf8");
    const relative = path.relative(repoRoot, file).replaceAll("\\", "/");
    const lines = content.split(/\r?\n/);

    for (const rule of RULES) {
      for (let index = 0; index < lines.length; index += 1) {
        rule.pattern.lastIndex = 0;
        if (!rule.pattern.test(lines[index])) continue;
        findings.push({
          file: relative,
          line: index + 1,
          rule: rule.name,
        });
      }
    }
  }

  if (findings.length > 0) {
    console.error("[verify:no-secrets] Potential secrets found:");
    for (const finding of findings) {
      console.error(`- ${finding.file}:${finding.line} -> ${finding.rule}`);
    }
    process.exit(1);
  }

  console.log(`[verify:no-secrets] OK (${files.length} files scanned)`);
}

main().catch((error) => {
  console.error(`[verify:no-secrets] FAILED: ${error.message}`);
  process.exit(1);
});
