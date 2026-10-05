// Checks every Markdown file in knowledge/ has a valid metadata header.
// Fails (exit 1) on errors; prints warnings for stale files or broken "related" links.
// Run: node scripts/check-knowledge.mjs      (also runs in GitHub Actions on every push)
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, basename } from "node:path";

const ROOT = "knowledge";
const TYPES = ["standard", "decision", "process", "skill", "template"];
const STATUSES = ["draft", "accepted", "superseded"];
const REQUIRED = ["title", "type", "owner", "status", "updated"];
const STALE_DAYS = 180;

function walk(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith(".md") ? [p] : [];
  });
}

function parseHeader(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const h = {};
  for (const line of m[1].split(/\r?\n/)) {
    const i = line.indexOf(":");
    if (i > 0) h[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return h;
}

const files = walk(ROOT);
const names = new Set(files.map((f) => basename(f, ".md")));
const errors = [];
const warnings = [];

for (const file of files) {
  const h = parseHeader(readFileSync(file, "utf8"));
  if (!h) { errors.push(`${file}: missing the --- metadata header at the top`); continue; }
  for (const k of REQUIRED) if (!h[k]) errors.push(`${file}: header is missing "${k}"`);
  if (h.type && !TYPES.includes(h.type)) errors.push(`${file}: type "${h.type}" must be one of ${TYPES.join(", ")}`);
  if (h.status && !STATUSES.includes(h.status)) errors.push(`${file}: status "${h.status}" must be one of ${STATUSES.join(", ")}`);
  if (h.status === "superseded" && !h.superseded_by) errors.push(`${file}: superseded files must say superseded_by`);
  if (h.updated) {
    const d = new Date(h.updated);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(h.updated) || isNaN(d)) errors.push(`${file}: updated "${h.updated}" must be YYYY-MM-DD`);
    else if ((Date.now() - d) / 86400000 > STALE_DAYS) warnings.push(`${file}: not updated in over ${STALE_DAYS} days — still true?`);
  }
  for (const rel of (h.related || "").split(",").map((s) => s.trim()).filter(Boolean)) {
    if (!names.has(rel)) warnings.push(`${file}: related "${rel}" doesn't match any knowledge file`);
  }
}

warnings.forEach((w) => console.log("⚠️  " + w));
errors.forEach((e) => console.log("❌ " + e));
if (errors.length) { console.log(`\n${errors.length} problem(s) in knowledge/ — fix the headers above.`); process.exit(1); }
console.log(`✅ ${files.length} knowledge files checked — all headers valid.`);
