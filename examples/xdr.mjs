/**
 * xdr.mjs
 * ---------------------------------------------------------------------------
 * A tiny, dependency-free XDR reader for the **LedgerHeader** structure.
 *
 * Why this exists: the API hands you `total_coins` as a JSON string, which
 * means you are trusting the API's summary of the ledger. The same response
 * also carries `header_xdr` — the ledger header as raw bytes — and this module
 * decodes it. Reading the number straight out of those bytes makes the JSON
 * summary a cross-check rather than a source: if the two disagree, this
 * repository says so and fails.
 *
 * A note on the word "signed", because it is easy to over-claim. The SCP
 * signature lives inside `scpValue.ext` and covers the **StellarValue**
 * (txSetHash, closeTime, upgrades) — it does **not** cover `totalCoins`,
 * `feePool` or `inflationSeq`. Those are derived state that every honest node
 * computes identically from the previous header and the applied transaction
 * set. So this decoder does not, and cannot, "verify a signature over the
 * supply". What binds the bytes to the network is the SHA-256 hash chain in
 * `examples/chain.mjs`: the ledger hash *is* sha256(header bytes), and each
 * header commits to the previous one. See `docs/VERIFICATION.md` §2.
 *
 * Only the fields before `LedgerHeader.ext` are parsed, which is everything we
 * need. The reader is deliberately strict: a short or malformed buffer throws
 * with the exact offset, never silently returns a wrong number.
 *
 * Reference structures (Stellar protocol):
 *
 *   struct LedgerHeader {
 *       uint32 ledgerVersion;
 *       Hash previousLedgerHash;              // 32 bytes
 *       StellarValue scpValue;                // variable
 *       Hash txSetResultHash;                 // 32
 *       Hash bucketListHash;                  // 32
 *       uint32 ledgerSeq;
 *       int64 totalCoins;                     // <-- the supply
 *       int64 feePool;                        // <-- fees paid
 *       uint32 inflationSeq;                  // <-- issuance counter
 *       uint64 idPool;
 *       uint32 baseFee;
 *       uint32 baseReserve;
 *       uint32 maxTxSetSize;
 *       Hash skipList[4];                     // 128
 *       union switch (int v) { case 0: void; } ext;
 *   };
 *
 *   struct StellarValue {
 *       Hash txSetHash;                       // 32
 *       TimePoint closeTime;                  // uint64
 *       UpgradeType upgrades<>;               // var array of opaque<128>
 *       union switch (int v) {                // ext
 *           case 0: void;
 *           case 1: struct { NodeID nodeID; Signature signature<64>; } signedData;
 *       } ext;
 *   };
 *
 * ---------------------------------------------------------------------------
 */

/** XDR pads variable-length data to a 4-byte boundary. */
export const xdrPad = (n) => (4 - (n % 4)) % 4;

/** Reads big-endian XDR primitives from a Buffer, tracking the offset. */
export class XdrReader {
  constructor(buf) {
    if (!Buffer.isBuffer(buf)) throw new Error("XdrReader needs a Buffer");
    this.buf = buf;
    this.offset = 0;
  }

  get remaining() {
    return this.buf.length - this.offset;
  }

  need(n, what) {
    if (this.offset + n > this.buf.length) {
      throw new Error(
        `truncated XDR: need ${n} byte(s) for ${what} at offset ${this.offset}, ` +
          `but only ${this.remaining} remain`
      );
    }
  }

  u32(what = "uint32") {
    this.need(4, what);
    const v = this.buf.readUInt32BE(this.offset);
    this.offset += 4;
    return v;
  }

  i64(what = "int64") {
    this.need(8, what);
    const v = this.buf.readBigInt64BE(this.offset);
    this.offset += 8;
    return v;
  }

  u64(what = "uint64") {
    this.need(8, what);
    const v = this.buf.readBigUInt64BE(this.offset);
    this.offset += 8;
    return v;
  }

  fixed(n, what = "fixed") {
    this.need(n, what);
    const v = this.buf.subarray(this.offset, this.offset + n);
    this.offset += n;
    return v;
  }

  /** XDR variable-length opaque: uint32 length + bytes + zero padding. */
  varOpaque(max, what = "opaque") {
    const n = this.u32(`${what} length`);
    if (n > max) throw new Error(`XDR ${what}: length ${n} exceeds the declared max ${max}`);
    this.need(n + xdrPad(n), what);
    const v = this.buf.subarray(this.offset, this.offset + n);
    this.offset += n + xdrPad(n);
    return v;
  }
}

/**
 * Decode a base64 `header_xdr` into the fields this repository cares about.
 *
 * @param {string} base64 the ledger's `header_xdr`
 * @returns {{
 *   ledgerVersion:number, previousLedgerHash:string, ledgerSeq:number,
 *   totalCoins:bigint, feePool:bigint,
 *   inflationSeq:number, idPool:bigint, baseFee:number, baseReserve:number,
 *   maxTxSetSize:number, scpCloseTime:bigint, scpUpgradeCount:number,
 *   bytesConsumed:number, totalBytes:number
 * }}
 */
export function decodeLedgerHeader(base64) {
  if (typeof base64 !== "string" || base64.length === 0) {
    throw new Error("header_xdr is missing or empty");
  }
  const buf = Buffer.from(base64, "base64");
  if (buf.length === 0) throw new Error("header_xdr did not decode to any bytes");

  const r = new XdrReader(buf);

  const ledgerVersion = r.u32("ledgerVersion");
  const previousLedgerHash = r.fixed(32, "previousLedgerHash").toString("hex");

  // ---- StellarValue scpValue (variable length) ----
  r.fixed(32, "scpValue.txSetHash");
  const scpCloseTime = r.u64("scpValue.closeTime");
  const scpUpgradeCount = r.u32("scpValue.upgrades length");
  if (scpUpgradeCount > 128) {
    throw new Error(`implausible scpValue upgrade count ${scpUpgradeCount} — not a LedgerHeader?`);
  }
  for (let i = 0; i < scpUpgradeCount; i++) r.varOpaque(128, `scpValue.upgrades[${i}]`);
  const scpExt = r.u32("scpValue.ext discriminant");
  if (scpExt === 1) {
    // LedgerCloseValueSignature { NodeID nodeID; Signature signature<64>; }
    // NodeID is a PublicKey union: a 4-byte type discriminant, then the key.
    const pkType = r.u32("scpValue.ext.nodeID.type");
    if (pkType !== 0) {
      throw new Error(
        `unexpected scpValue nodeID PublicKey type ${pkType} (expected 0 = ed25519) — not a LedgerHeader?`
      );
    }
    r.fixed(32, "scpValue.ext.nodeID.ed25519");
    r.varOpaque(64, "scpValue.ext.signature");
  } else if (scpExt !== 0) {
    throw new Error(`unknown StellarValue.ext discriminant ${scpExt}`);
  }

  // ---- the fixed tail, where the supply lives ----
  r.fixed(32, "txSetResultHash");
  r.fixed(32, "bucketListHash");

  const ledgerSeq = r.u32("ledgerSeq");
  const totalCoins = r.i64("totalCoins");
  const feePool = r.i64("feePool");
  const inflationSeq = r.u32("inflationSeq");
  const idPool = r.u64("idPool");
  const baseFee = r.u32("baseFee");
  const baseReserve = r.u32("baseReserve");
  const maxTxSetSize = r.u32("maxTxSetSize");
  for (let i = 0; i < 4; i++) r.fixed(32, `skipList[${i}]`);

  const extVersion = r.u32("LedgerHeader.ext discriminant");

  return {
    ledgerVersion,
    previousLedgerHash,
    ledgerSeq,
    totalCoins,
    feePool,
    inflationSeq,
    idPool,
    baseFee,
    baseReserve,
    maxTxSetSize,
    scpCloseTime,
    scpUpgradeCount,
    extVersion,
    bytesConsumed: r.offset,
    totalBytes: buf.length,
  };
}
