/**
 * chain.mjs
 * ---------------------------------------------------------------------------
 * Local, cryptographic checks that bind the bytes the API serves to the hash
 * chain they claim to be part of.
 *
 * This is a different — and stronger — kind of check than the cross-check in
 * `examples/xdr-header.mjs`. That one compares two things the *same server*
 * produced (`total_coins` and `header_xdr`). This one only uses `node:crypto`
 * and the raw bytes, and asks whether the bytes are internally consistent with
 * the ledger hash chain:
 *
 *   1. sha256(header_xdr bytes) === the API's `hash` for that ledger.
 *      In the Stellar protocol the ledger hash *is* the SHA-256 of the
 *      serialised LedgerHeader, so this must hold. It is checked on the bytes
 *      we decoded, not on any summary the API produced.
 *
 *   2. previousLedgerHash (bytes 4..36 of header[i]) === sha256(header[i-1]).
 *      Consecutive headers form a hash chain. To serve a fabricated header at
 *      sequence N, a server must also fabricate a header at N-1 whose bytes
 *      hash to what N commits to, and so on — back to any header whose hash you
 *      already trust. That trusted header is the *anchor*.
 *
 * What this does NOT do, stated so a green run is not read as more than it is:
 *
 *   - It does not verify the SCP signature, and it does not need to: that
 *     signature covers the StellarValue (txSetHash, closeTime, upgrades), not
 *     `totalCoins`/`feePool`/`inflationSeq`.
 *   - It does not prove the node is honest. A node can serve a *self-consistent*
 *     fabricated chain. The check converts "trust every byte" into "trust one
 *     anchor hash"; obtaining that anchor from a second, independent observer
 *     is the remaining step. See `docs/THREAT-MODEL.md` §4.
 *
 * Zero dependencies beyond the Node standard library. Read-only.
 * ---------------------------------------------------------------------------
 */

import { createHash } from "node:crypto";

/** Lowercase hex SHA-256 of a Buffer (or anything the hash accepts). */
export const sha256Hex = (buf) => createHash("sha256").update(buf).digest("hex");

/** The raw bytes of a base64 `header_xdr`. */
export const headerBytes = (headerXdr) => Buffer.from(headerXdr, "base64");

/** True when sha256(header bytes) equals the hash the API reported for it. */
export function headerHashMatches(headerXdr, apiHash) {
  return sha256Hex(headerBytes(headerXdr)) === String(apiHash).toLowerCase();
}

/**
 * `previousLedgerHash`, read straight from bytes 4..36 of the header.
 *
 * This is read at a fixed offset (uint32 ledgerVersion, then Hash), on purpose:
 * it is deliberately independent of the XDR decoder, so a decoder regression
 * cannot hide a broken link.
 */
export function previousHashOf(headerXdr) {
  return headerBytes(headerXdr).subarray(4, 36).toString("hex");
}

/**
 * Verify a contiguous, ascending list of ledger records.
 *
 * Each record needs `sequence`, `hash` and `header_xdr`. Non-adjacent records
 * are still checked for self-consistency (check 1) but not linked (check 2).
 *
 * @returns {{ok:boolean, checks:number, findings:string[]}}
 */
export function verifyChain(records) {
  const findings = [];
  let checks = 0;

  for (const r of records) {
    checks++;
    if (!headerHashMatches(r.header_xdr, r.hash)) {
      findings.push(`ledger ${r.sequence}: sha256(header) does not equal the reported ledger hash`);
    }
  }

  for (let i = 1; i < records.length; i++) {
    const prev = records[i - 1];
    const cur = records[i];
    if (Number(cur.sequence) !== Number(prev.sequence) + 1) continue; // not adjacent
    checks++;
    if (previousHashOf(cur.header_xdr) !== sha256Hex(headerBytes(prev.header_xdr))) {
      findings.push(
        `ledger ${cur.sequence}: previousLedgerHash does not equal sha256(ledger ${prev.sequence})`
      );
    }
  }

  return { ok: findings.length === 0, checks, findings };
}
