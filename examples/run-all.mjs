#!/usr/bin/env node
/**
 * run-all.mjs
 * ---------------------------------------------------------------------------
 * Runs every check in this repository in order and reports a single verdict.
 * This is the one command to run if you only want to know whether the claims
 * still hold.
 *
 *   node examples/run-all.mjs
 *
 * Read-only. GET only. Zero dependencies (Node 18+).
 * ---------------------------------------------------------------------------
 */

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const STEPS = [
  ["check-links.mjs", [], "every relative link resolves from its own file"],
  ["xdr-header.mjs", [], "the raw header decodes and matches the API's JSON"],
  ["supply-check.mjs", ["--samples", "30"], "total_coins is the cap on every sampled ledger"],
  ["op-check.mjs", ["--ledgers", "10", "--per", "20"], "no issuance-looking operation type exists"],
  ["self-test.mjs", [], "the suite's own tests"],
];

const here = fileURLToPath(new URL(".", import.meta.url));

console.log("");
console.log("═".repeat(74));
console.log("  pi-fixed-supply — full check suite");
console.log("═".repeat(74));

const results = [];
for (const [file, args, what] of STEPS) {
  process.stdout.write(`\n▶ ${file}  —  ${what}\n`);
  const r = spawnSync(process.execPath, [fileURLToPath(new URL(file, import.meta.url)), ...args], {
    cwd: here,
    encoding: "utf8",
  });
  const out = `${r.stdout ?? ""}${r.stderr ?? ""}`;
  const tail = out.trim().split("\n").slice(-3).join("\n");
  console.log(
    tail
      .split("\n")
      .map((l) => `   ${l}`)
      .join("\n")
  );
  results.push({ file, ok: r.status === 0 });
}

console.log("");
console.log("═".repeat(74));
const failed = results.filter((r) => !r.ok);
for (const r of results) console.log(`  ${r.ok ? "✅" : "❌"}  ${r.file}`);
console.log("═".repeat(74));

if (failed.length) {
  console.log(`\n❌  ${failed.length} of ${results.length} checks FAILED.\n`);
  process.exit(1);
}
console.log(`\n✅  All ${results.length} checks passed. Supply is fixed as claimed.\n`);
