#!/usr/bin/env node
/**
 * xdr-header.mjs
 * ---------------------------------------------------------------------------
 * Reads the total supply **out of the raw ledger header bytes**
 * instead of trusting the API's JSON summary.
 *
 * The API returns both `total_coins` (a convenience string) and `header_xdr`
 * (the real header, base64). This script decodes the XDR and then CHECKS the
 * two against each other. If they disagree it exits non-zero — a disagreement
 * would itself be a finding, because it would mean the API's summary does not
 * match the ledger it is reporting.
 *
 * It also surfaces `inflationSeq`, the counter of how many times the (now
 * removed) issuance operation ever ran. The JSON does not expose this field.
 *
 * Zero dependencies (uses built-in fetch and Buffer). Read-only. GET only.
 *
 * Usage:
 *   node examples/xdr-header.mjs                 # the current head ledger
 *   node examples/xdr-header.mjs <LEDGER_SEQ>
 *   node examples/xdr-header.mjs --help
 * ---------------------------------------------------------------------------
 */

import { api, rule, isLedgerSeq, usageAndExit, formatPi, CAP_STRING } from "./lib.mjs";
import { decodeLedgerHeader } from "./xdr.mjs";

const HELP = [
  "xdr-header.mjs — read the total supply from the raw ledger header (no trust in the API's JSON)",
  "",
  "Usage:",
  "  node examples/xdr-header.mjs                # the current head ledger",
  "  node examples/xdr-header.mjs <LEDGER_SEQ>   # e.g. 2, 100000, 29284154",
  "  node examples/xdr-header.mjs --help",
  "",
  "Decodes `header_xdr` and cross-checks it against the API's JSON fields.",
  "Exits non-zero if the XDR and the JSON disagree.",
  "",
  "Read-only. Node 18+.",
];

const argv = process.argv.slice(2);
if (argv.includes("--help") || argv.includes("-h")) usageAndExit(HELP, 0);

const want = argv[0];
if (want && !isLedgerSeq(want)) usageAndExit([`✗ not a ledger sequence number: ${want}`, "", ...HELP]);

async function fetchLedger(seq) {
  if (seq) return api(`/ledgers/${seq}`);
  const page = await api("/ledgers?order=desc&limit=1");
  const rec = page?._embedded?.records?.[0];
  if (!rec) throw new Error("the API returned no ledgers");
  return rec;
}

async function main() {
  const l = await fetchLedger(want);

  console.log("\n🔎  Ledger header — decoded from the raw XDR");
  rule();
  console.log(`  ledger            : ${l.sequence}`);
  console.log(`  closed_at         : ${l.closed_at}`);
  console.log(`  header hash       : ${l.hash}`);

  const h = decodeLedgerHeader(l.header_xdr);

  console.log("\n  raw header (decoded, not the API's summary)");
  console.log(`    ledgerVersion   : ${h.ledgerVersion}`);
  console.log(`    ledgerSeq       : ${h.ledgerSeq}`);
  console.log(`    totalCoins      : ${h.totalCoins} stroops  =  ${formatPi(h.totalCoins)} π`);
  console.log(`    feePool         : ${h.feePool} stroops  =  ${formatPi(h.feePool)} π`);
  console.log(`    inflationSeq    : ${h.inflationSeq}   (issuance counter — JSON does not expose this)`);
  console.log(`    idPool          : ${h.idPool}`);
  console.log(`    baseFee         : ${h.baseFee}   baseReserve: ${h.baseReserve}   maxTxSetSize: ${h.maxTxSetSize}`);
  console.log(`    XDR consumed    : ${h.bytesConsumed} of ${h.totalBytes} bytes`);

  // ---- cross-check the decoded header against the API's JSON ----
  console.log("\n  cross-check: raw XDR  vs  the API's JSON");
  const checks = [
    ["ledgerSeq", String(h.ledgerSeq), String(l.sequence)],
    ["totalCoins", formatPi(h.totalCoins), l.total_coins],
    ["feePool", formatPi(h.feePool), l.fee_pool],
    ["maxTxSetSize", String(h.maxTxSetSize), String(l.max_tx_set_size)],
    ["baseFee", String(h.baseFee), String(l.base_fee_in_stroops)],
    ["baseReserve", String(h.baseReserve), String(l.base_reserve_in_stroops)],
  ];
  let mismatches = 0;
  for (const [field, fromXdr, fromJson] of checks) {
    const same = fromXdr === fromJson;
    if (!same) mismatches++;
    console.log(`    ${same ? "✓" : "✗"} ${field.padEnd(14)} xdr=${fromXdr}  json=${fromJson}`);
  }
  const protoSame = String(h.ledgerVersion) === String(l.protocol_version);
  console.log(
    `    ${protoSame ? "✓" : "✗"} ${"ledgerVersion".padEnd(14)} xdr=${h.ledgerVersion}  json=${l.protocol_version}`
  );
  if (!protoSame) mismatches++;

  rule();
  if (mismatches > 0) {
    console.log(`❌  ${mismatches} mismatch(es) — the API's JSON does not match the raw header.`);
    console.log("    That is a finding, not a footnote. See docs/FALSIFICATION.md.");
    process.exit(1);
  }

  console.log("✅  The API's JSON matches the raw header bytes exactly.");
  const supplyOk = formatPi(h.totalCoins) === CAP_STRING;
  console.log(
    supplyOk
      ? `    totalCoins = ${CAP_STRING} π — exactly the documented maximum supply.`
      : `    ⚠️  totalCoins = ${formatPi(h.totalCoins)} π — NOT the documented maximum supply of ${CAP_STRING} π.`
  );
  const infOk = h.inflationSeq === 0;
  console.log(
    infOk
      ? "    inflationSeq = 0 — the issuance operation has never run on this ledger."
      : `    inflationSeq = ${h.inflationSeq} — see docs/FAQ-INFINITE-MINT.md.`
  );
  rule();
  console.log("");
  if (!supplyOk) process.exit(1);
}

main().catch((err) => {
  console.error("\n❌ ERROR:", err.message);
  process.exit(1);
});
