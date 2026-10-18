#!/usr/bin/env node
/**
 * check-links.mjs
 * ---------------------------------------------------------------------------
 * Walks every Markdown file in the repository and resolves every relative link
 * against the file that contains it. A relative link that does not point at an
 * existing file (or directory) is a BUG, and this exits non-zero.
 *
 * External links (`http`, `https`, `mailto:`), pure anchors (`#...`) and
 * root-absolute paths are skipped — this tool checks internal consistency, not
 * whether the outside world is still up.
 *
 * Offline. Zero dependencies (Node 18+).
 *
 *   node examples/check-links.mjs
 *   node examples/check-links.mjs --verbose
 * ---------------------------------------------------------------------------
 */

import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const VERBOSE = process.argv.includes("--verbose");
const SKIP = new Set(["_site", "vendor", "node_modules", ".git", ".jekyll-cache"]);

/** Markdown file plus the front matter Jekyll controls — the link targets too. */
function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (/\.(md|html|yml|txt)$/.test(entry.name)) out.push(p);
  }
  return out;
}

const files = walk(ROOT);
let checked = 0;
const broken = [];
const seen = new Set();

for (const file of files) {
  const dir = path.dirname(file);
  const text = readFileSync(file, "utf8");

  // Strip fenced code blocks and inline code so shell examples are not mistaken
  // for links, and strip HTML comments.
  const scannable = text
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`\n]*`/g, " ");

  const re = /\]\(([^)\s]+)\)/g;
  let m;
  while ((m = re.exec(scannable)) !== null) {
    const target = m[1];
    if (/^(https?:|mailto:|#|\/)/.test(target)) continue;

    const [p0, anchor = ""] = target.split("#");
    if (!p0) continue;

    checked++;
    const abs = path.resolve(dir, p0);
    seen.add(abs);

    // A link may be written as a site URL (`X.html`) while the source file is
    // `X.md` — Jekyll's relative-links plugin converts one into the other. Both
    // spellings are valid, so accept either.
    const ok = existsSync(abs) || (abs.endsWith(".html") && existsSync(abs.replace(/\.html$/, ".md")));

    if (!ok) {
      const line = scannable.slice(0, m.index).split("\n").length;
      broken.push({
        from: path.relative(ROOT, file),
        line,
        target,
        hint: `expected ${path.relative(ROOT, abs)}`,
      });
    }
  }
}

console.log("");
console.log("🔎  Internal links");
console.log("-".repeat(74));
console.log(`  files scanned : ${files.length}`);
console.log(`  links checked : ${checked}`);
console.log(`  distinct targets: ${seen.size}`);

if (VERBOSE) {
  for (const [i, abs] of [...seen].sort().entries()) {
    if (i < 12) console.log(`    · ${path.relative(ROOT, abs)}`);
  }
  if (seen.size > 12) console.log(`    · … and ${seen.size - 12} more`);
}

console.log("-".repeat(74));
if (broken.length) {
  console.log(`❌  ${broken.length} BROKEN internal link(s):`);
  for (const b of broken) console.log(`    ${b.from}:${b.line}  ->  ${b.target}   (${b.hint})`);
  console.log("-".repeat(74));
  process.exit(1);
}
console.log("✅  Every relative link resolves from the file that contains it.");
console.log("-".repeat(74));
console.log("");
