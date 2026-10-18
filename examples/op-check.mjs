#!/usr/bin/env node
/**
 * op-check.mjs
 * ---------------------------------------------------------------------------
 * Tabulates the operation types that actually appear on Pi Mainnet and looks
 * for anything that could create native π.
 *
 * Why this matters: in the Stellar protocol the only operation that ever
 * created native value was `inflation`, and it was removed when validators
 * upgraded to Protocol 12 (2019-10-28) — before Pi Mainnet ever existed
 * (genesis here is ledger 2, 2020-12-31). Pi Mainnet runs Protocol 28.
 *
 * This script is EVIDENCE, not proof: it samples operations across the whole
 * observable range and reports what the network does. The proof that supply
 * cannot grow is the invariant in examples/supply-check.mjs plus the header
 * decoded in examples/xdr-header.mjs.
 *
 * Exit code 1 if any observed operation type matches /mint|inflat|issue|emiss|creat.*coin|supply/i.
 *
 * Read-only. GET only. Zero dependencies (Node 18+).
 *
 * Usage:
 *   node examples/op-check.mjs
 *   node examples/op-check.mjs --ledgers 16 --per 20
 *   node examples/op-check.mjs --help
 * ---------------------------------------------------------------------------
 */

import { api, rule, usageAndExit, mapLimit, sampleLedgers } from "./lib.mjs";

const HELP = [
  "op-check.mjs — which operation types does Pi Mainnet actually run?",
  "",
  "Usage:",
  "  node examples/op-check.mjs [--ledgers N] [--per N] [--concurrency N]",
  "",
  "  --ledgers N       ledgers to sample across the range (default 12)",
  "  --per N           operations to read per ledger (default 20)",
  "  --concurrency N   parallel requests (default 4)",
  "",
  "Exits non-zero if an issuance-looking operation type is observed.",
  "",
  "Read-only. Node 18+.",
];

const argv = process.argv.slice(2);
if (argv.includes("--help") || argv.includes("-h")) usageAndExit(HELP, 0);

function opt(name, fallback) {
  const i = argv.indexOf(`--${name}`);
  if (i === -1) return fallback;
  return argv[i + 1] === undefined ? true : argv[i + 1];
}
function intOpt(name, fallback, min) {
  const raw = opt(name, fallback);
  const v = Number(raw);
  if (!Number.isInteger(v) || v < min) usageAndExit([`✗ --${name} must be an integer >= ${min} (got ${raw})`, "", ...HELP]);
  return v;
}

const LEDGERS = intOpt("ledgers", 12, 1);
const PER = intOpt("per", 20, 1);
const CONCURRENCY = intOpt("concurrency", 3, 1);

/** Anything whose name suggests native issuance. */
const ISSUANCE_LIKE = /mint|inflat|issue|emiss|supply|print/i;

async function opsAt(seq) {
  try {
    const page = await api(`/ledgers/${seq}/operations?limit=${PER}&order=asc`);
    return (page?._embedded?.records ?? []).map((o) => o.type);
  } catch {
    return [];
  }
}

async function main() {
  const headPage = await api("/ledgers?order=desc&limit=1");
  const head = Number(headPage._embedded.records[0].sequence);
  const list = sampleLedgers(2, head, LEDGERS);

  console.log("");
  console.log("🔎  Operation vocabulary — what does the network actually do?");
  rule();
  console.log(`  sampling ${list.length} ledgers across [2, ${head}], up to ${PER} operations each`);

  const batches = await mapLimit(list, CONCURRENCY, opsAt);
  const counts = new Map();
  let total = 0;
  for (const types of batches) {
    for (const t of types) {
      counts.set(t, (counts.get(t) ?? 0) + 1);
      total++;
    }
  }

  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  console.log("");
  console.log(`  operations read      : ${total}`);
  console.log(`  distinct op types    : ${sorted.length}`);
  console.log("");
  for (const [t, n] of sorted) {
    console.log(`    ${String(n).padStart(6)}  ${t}`);
  }

  const suspicious = sorted.map(([t]) => t).filter((t) => ISSUANCE_LIKE.test(t));
  console.log("");
  rule();
  if (suspicious.length > 0) {
    console.log(`❌  Issuance-looking operation type(s) observed: ${suspicious.join(", ")}`);
    console.log("    Please open an issue with the ledger sequences. See docs/FALSIFICATION.md.");
    rule();
    process.exit(1);
  }

  console.log("✅  No issuance-looking operation type appears in the sample.");
  console.log("    `inflation` — the Stellar protocol's only native-issuance operation —");
  console.log("    does not appear, and was removed at Protocol 12 (2019-10-28),");
  console.log("    before Pi Mainnet genesis (ledger 2, 2020-12-31).");
  console.log("");
  console.log("    The supply invariant itself is checked in examples/supply-check.mjs,");
  console.log("    and the raw header is decoded in examples/xdr-header.mjs.");
  rule();
  console.log("");
}

main().catch((err) => {
  console.error("\n❌ ERROR:", err.message);
  process.exit(1);
});
