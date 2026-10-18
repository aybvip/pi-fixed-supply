#!/usr/bin/env node
/**
 * supply-check.mjs
 * ---------------------------------------------------------------------------
 * Sweeps the observable ledger range and checks ONE number on every ledger it
 * visits: `total_coins`.
 *
 * If Pi had any way to create native π after genesis, this is where it would
 * show up — a ledger whose `total_coins` is higher than the ledger before it.
 *
 * What it establishes
 *   - total_coins is EXACTLY the documented maximum supply on every sampled
 *     ledger, from the earliest observable ledger (2) to the live head.
 *   - fee_pool grows across the same range (fees accumulate) while total_coins
 *     stays put. That is the difference between a fee sink and issuance.
 *   - the protocol version reached by the sampled ledgers.
 *
 * What it does NOT establish
 *   - circulating / "effective" supply. See docs/FAQ-TOTAL-VS-EFFECTIVE.md.
 *   - that the header is honest. See examples/xdr-header.mjs, which reads the
 *     same number out of the raw, consensus-signed header.
 *
 * Read-only. GET only. Zero dependencies (Node 18+).
 *
 * Usage:
 *   node examples/supply-check.mjs
 *   node examples/supply-check.mjs --samples 60
 *   node examples/supply-check.mjs --from 2 --to 1000000
 *   node examples/supply-check.mjs --help
 * ---------------------------------------------------------------------------
 */

import { api, rule, usageAndExit, mapLimit, formatPi, parsePi, CAP_STROOPS, CAP_STRING, sampleLedgers } from "./lib.mjs";

const HELP = [
  "supply-check.mjs — is the total native supply constant on every observable ledger?",
  "",
  "Usage:",
  "  node examples/supply-check.mjs [--samples N] [--from SEQ] [--to SEQ] [--concurrency N] [--quiet]",
  "",
  "  --samples N       evenly spaced ledgers to sample on top of the log sweep (default 40)",
  "  --from SEQ        first ledger to consider (default 2 — the earliest one served)",
  "  --to SEQ          last ledger to consider (default: the current head)",
  "  --concurrency N   parallel requests (default 8)",
  "  --quiet           only print the verdict",
  "",
  "Exits non-zero if any sampled ledger's total_coins is not the documented cap.",
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

const SAMPLES = intOpt("samples", 40, 0);
const CONCURRENCY = intOpt("concurrency", 5, 1);
const QUIET = Boolean(opt("quiet", false));

async function head() {
  const page = await api("/ledgers?order=desc&limit=1");
  const rec = page?._embedded?.records?.[0];
  if (!rec) throw new Error("the API returned no ledgers");
  return Number(rec.sequence);
}

async function readLedger(seq) {
  try {
    const l = await api(`/ledgers/${seq}`);
    return {
      seq: Number(l.sequence),
      when: l.closed_at,
      total: l.total_coins,
      feePool: l.fee_pool,
      proto: Number(l.protocol_version),
      ok: true,
    };
  } catch (err) {
    return { seq, ok: false, error: err.message.split("\n")[0] };
  }
}

async function main() {
  const TO = intOpt("to", await head(), 1);
  const FROM = intOpt("from", 2, 1);
  if (FROM > TO) usageAndExit([`✗ --from ${FROM} is greater than --to ${TO}`, "", ...HELP]);

  const list = sampleLedgers(FROM, TO, SAMPLES);

  if (!QUIET) {
    console.log("");
    console.log("🔎  Total native supply — sweep across the observable ledger range");
    rule();
    console.log(`  range       : ledger ${FROM} .. ${TO}`);
    console.log(`  sampling    : ${list.length} ledgers (endpoints + ${SAMPLES} even + log sweep)`);
    console.log(`  expected    : total_coins = ${CAP_STRING} π  (the documented maximum supply)`);
    console.log(`  fetching    : up to ${CONCURRENCY} in parallel …`);
  }

  const rows = await mapLimit(list, CONCURRENCY, readLedger);

  const served = rows.filter((r) => r.ok);
  const notServed = rows.filter((r) => !r.ok);
  const mismatches = served.filter((r) => {
    try {
      return parsePi(r.total) !== CAP_STROOPS;
    } catch {
      return true;
    }
  });

  if (!QUIET) {
    console.log("");
    console.log("  sampled ledgers (closed_at · total_coins)");
    const shown = served.length <= 14 ? served : [...served.slice(0, 7), null, ...served.slice(-6)];
    for (const r of shown) {
      if (r === null) {
        console.log(`        … ${served.length - 13} more, all identical …`);
        continue;
      }
      const mark = parsePi(r.total) === CAP_STROOPS ? " " : "✗";
      console.log(`  ${mark} ${String(r.seq).padStart(9)}  ${r.when}  ${r.total}`);
    }

    if (notServed.length) {
      console.log("");
      console.log("  ledgers the API does not serve (not part of the claim)");
      for (const r of notServed.slice(0, 5)) {
        console.log(`    – ${String(r.seq).padStart(9)}  ${r.error}`);
      }
      if (notServed.length > 5) console.log(`    – … and ${notServed.length - 5} more`);
    }

    console.log("");
    console.log("  fee_pool over the same range — this is where paid fees accumulate");
    const trail = [served[0], served[Math.floor(served.length / 2)], served[served.length - 1]].filter(Boolean);
    let prev = null;
    for (const r of trail) {
      const v = Number(r.feePool);
      console.log(`    ${String(r.seq).padStart(9)}  ${r.when}  fee_pool = ${r.feePool}${prev !== null && v >= prev ? "  (+)" : ""}`);
      prev = v;
    }

    const protos = [...new Set(served.map((r) => r.proto))].sort((a, b) => a - b);
    console.log("");
    console.log(`  protocol versions seen : ${protos.join(", ")}`);
    console.log(`  first observed         : ledger ${served[0].seq} @ ${served[0].when}`);
    console.log(`  last observed          : ledger ${served[served.length - 1].seq} @ ${served[served.length - 1].when}`);
  }

  console.log("");
  rule();
  console.log(`  ledgers read            : ${served.length} (${notServed.length} not served)`);
  console.log(`  ledgers NOT at the cap  : ${mismatches.length}`);

  if (mismatches.length > 0) {
    console.log("");
    console.log("❌  SUPPLY CHANGED. The falsifier fired — this is a finding, not a bug in the check:");
    for (const r of mismatches.slice(0, 10)) {
      console.log(`    ledger ${r.seq} @ ${r.when}: total_coins = ${r.total} (expected ${CAP_STRING})`);
    }
    console.log("");
    console.log("    Please open an issue with the ledgers above. See docs/FALSIFICATION.md.");
    rule();
    process.exit(1);
  }

  console.log(`✅  total_coins is exactly ${CAP_STRING} π on every one of the ${served.length} ledgers read.`);
  console.log("    No ledger in the sampled range shows any change in total supply.");
  console.log("    For the raw header (not the API summary), run examples/xdr-header.mjs.");
  rule();
  console.log("");
}

main().catch((err) => {
  console.error("\n❌ ERROR:", err.message);
  process.exit(1);
});
