#!/usr/bin/env node
/**
 * hash-chain.mjs
 * ---------------------------------------------------------------------------
 * Proves, with `node:crypto` alone, that the raw ledger headers this repository
 * reads are the bytes the network's hash chain commits to — instead of trusting
 * the API's own summary of them.
 *
 * Every Stellar ledger hash is defined as sha256(serialised LedgerHeader), and
 * every header stores the previous ledger's hash. So two things must hold, and
 * both are checked here locally:
 *
 *   1. sha256(header_xdr bytes)  ==  the `hash` the API reports
 *   2. previousLedgerHash(header[i])  ==  sha256(header[i-1] bytes)
 *
 * It also re-asserts that `totalCoins` in those same bytes is the cap, so the
 * link is: raw bytes -> hash -> chain -> the supply claim, with no step that
 * trusts the API's JSON.
 *
 * A break in either check is a finding (see docs/FALSIFICATION.md, F6) and the
 * tool exits non-zero.
 *
 * Read-only. GET only. Zero dependencies (Node 18+).
 *
 * Usage:
 *   node examples/hash-chain.mjs                  # head + the previous 15 ledgers
 *   node examples/hash-chain.mjs --count 32
 *   node examples/hash-chain.mjs --to 2
 *   node examples/hash-chain.mjs --help
 * ---------------------------------------------------------------------------
 */

import { api, rule, usageAndExit, isLedgerSeq, mapLimit, formatPi, CAP_STRING } from "./lib.mjs";
import { decodeLedgerHeader } from "./xdr.mjs";
import { sha256Hex, headerBytes, headerHashMatches, previousHashOf, verifyChain } from "./chain.mjs";

const HELP = [
  "hash-chain.mjs — verify the raw ledger headers against the SHA-256 hash chain",
  "",
  "Usage:",
  "  node examples/hash-chain.mjs                  # head + the previous 15 ledgers",
  "  node examples/hash-chain.mjs --count 32       # how many contiguous ledgers to walk",
  "  node examples/hash-chain.mjs --from 100 --to 120",
  "  node examples/hash-chain.mjs --to 2           # end at ledger 2 (the anchor)",
  "  node examples/hash-chain.mjs --help",
  "",
  "Checks sha256(header_xdr) against the reported ledger hash, and each header's",
  "previousLedgerHash against the previous header's bytes. Exits non-zero on any",
  "break, or if totalCoins in those bytes is not the cap.",
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
  if (!Number.isInteger(v) || v < min) {
    usageAndExit([`✗ --${name} must be an integer >= ${min} (got ${raw})`, "", ...HELP]);
  }
  return v;
}

for (const bad of argv.filter((a) => !a.startsWith("--"))) {
  if (!isLedgerSeq(bad)) usageAndExit([`✗ not a ledger sequence number: ${bad}`, "", ...HELP]);
}

const COUNT = intOpt("count", 16, 2);
const fromArg = opt("from", null);
const toArg = opt("to", null);

async function ledger(seq) {
  const l = await api(`/ledgers/${seq}`);
  return {
    sequence: Number(l.sequence),
    hash: l.hash,
    header_xdr: l.header_xdr,
    total_coins: l.total_coins,
    closed_at: l.closed_at,
  };
}

async function main() {
  let to;
  if (toArg != null) {
    if (!isLedgerSeq(String(toArg))) usageAndExit([`✗ --to must be a ledger sequence (got ${toArg})`, "", ...HELP]);
    to = Number(toArg);
  } else {
    const head = await api("/ledgers?order=desc&limit=1");
    to = Number(head._embedded.records[0].sequence);
  }

  let from;
  if (fromArg != null) {
    if (!isLedgerSeq(String(fromArg))) usageAndExit([`✗ --from must be a ledger sequence (got ${fromArg})`, "", ...HELP]);
    from = Number(fromArg);
  } else {
    from = to - (COUNT - 1);
  }
  from = Math.max(2, from);
  if (from > to) usageAndExit([`✗ --from (${from}) is after --to (${to})`, "", ...HELP]);

  console.log("\n🔗  Ledger hash chain — verified locally with SHA-256");
  rule();
  console.log(`  walking ledgers ${from} … ${to}  (${to - from + 1} contiguous)`);

  const seqs = [];
  for (let s = from; s <= to; s++) seqs.push(s);
  const records = await mapLimit(seqs, 4, ledger);

  // ---- per-ledger: sha256(header) == reported hash, and totalCoins == cap ----
  console.log("\n  per-ledger checks");
  console.log("    ledger      sha256(header)==hash   totalCoins");
  let selfBad = 0;
  let supplyBad = 0;
  for (const r of records) {
    const selfOk = headerHashMatches(r.header_xdr, r.hash);
    if (!selfOk) selfBad++;
    const h = decodeLedgerHeader(r.header_xdr);
    const capOk = formatPi(h.totalCoins) === CAP_STRING;
    if (!capOk) supplyBad++;
    console.log(
      `    ${String(r.sequence).padEnd(11)} ${(selfOk ? "✓" : "✗").padEnd(21)}` +
        `${capOk ? "✓ " + CAP_STRING : "✗ " + formatPi(h.totalCoins)}`
    );
  }

  // ---- links: previousLedgerHash(i) == sha256(header(i-1)) ----
  console.log("\n  consecutive links (previousLedgerHash == sha256 of the previous header)");
  let linksOk = 0;
  let linksBad = 0;
  for (let i = 1; i < records.length; i++) {
    const prev = records[i - 1];
    const cur = records[i];
    const ok = previousHashOf(cur.header_xdr) === sha256Hex(headerBytes(prev.header_xdr));
    if (ok) linksOk++;
    else {
      linksBad++;
      console.log(`    ✗ ledger ${cur.sequence} does not commit to ledger ${prev.sequence}`);
    }
  }
  console.log(`    ${linksOk}/${linksOk + linksBad} links verified`);

  // ---- anchor: the earliest ledger we walked is self-consistent too ----
  const anchor = records[0];
  console.log(
    `\n  anchor: ledger ${anchor.sequence}  hash ${anchor.hash.slice(0, 16)}…  (${anchor.closed_at})`
  );
  console.log(
    "  Any ledger hash you already trust anchors every link behind it; nothing below the anchor is re-derived."
  );

  const chain = verifyChain(records);

  rule();
  if (selfBad || supplyBad || linksBad || !chain.ok) {
    console.log(`❌  ${selfBad} hash mismatch(es), ${supplyBad} supply deviation(s), ${linksBad} broken link(s).`);
    for (const f of chain.findings) console.log(`    - ${f}`);
    console.log("    This is a finding, not a footnote. See docs/FALSIFICATION.md.");
    process.exit(1);
  }

  console.log(`✅  All ${records.length} headers hash to the ledger hashes the API reports.`);
  console.log(`✅  All ${linksOk} consecutive links verified by SHA-256.`);
  console.log(`✅  totalCoins is ${CAP_STRING} π in every header walked.`);
  console.log("");
  console.log("    The bytes were checked locally, with node:crypto only — the API's");
  console.log("    JSON summary was not used to derive any hash or link.");
  rule();
  console.log("");
}

main().catch((err) => {
  console.error("\n❌ ERROR:", err.message);
  process.exit(1);
});
