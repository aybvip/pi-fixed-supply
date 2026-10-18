#!/usr/bin/env node
/**
 * self-test.mjs
 * ---------------------------------------------------------------------------
 * The repository's own test suite. Two halves:
 *
 *   OFFLINE — pure functions, the XDR reader, and every documented failure path
 *             of the HTTP client, checked against injected fakes and synthetic
 *             buffers. No network. Deterministic.
 *   ONLINE  — a handful of live assertions against Pi Mainnet (GET only).
 *
 * Zero dependencies (Node 18+). Read-only.
 *
 * Usage:
 *   node examples/self-test.mjs
 *   node examples/self-test.mjs --offline     # skip the live checks
 *   node examples/self-test.mjs --help
 * ---------------------------------------------------------------------------
 */

import {
  api,
  formatPi,
  parsePi,
  isLedgerSeq,
  isGAddress,
  isHash,
  mapLimit,
  sampleLedgers,
  CAP_STROOPS,
  CAP_STRING,
  STROOPS_PER_PI,
  BASE,
} from "./lib.mjs";
import { XdrReader, xdrPad, decodeLedgerHeader } from "./xdr.mjs";
import { sha256Hex, headerBytes, headerHashMatches, previousHashOf, verifyChain } from "./chain.mjs";

const argv = process.argv.slice(2);
if (argv.includes("--help") || argv.includes("-h")) {
  console.log("self-test.mjs — run the repository's test suite (offline + online).");
  console.log("");
  console.log("  node examples/self-test.mjs");
  console.log("  node examples/self-test.mjs --offline");
  console.log("");
  process.exit(0);
}
const OFFLINE_ONLY = argv.includes("--offline");

// ---------------------------------------------------------------------------
// tiny harness
// ---------------------------------------------------------------------------
let pass = 0;
const failures = [];

function check(name, fn) {
  try {
    const r = fn();
    if (r === true || r === undefined) {
      pass++;
      process.stdout.write(".");
    } else {
      failures.push(`${name} — got ${JSON.stringify(r)}`);
      process.stdout.write("F");
    }
  } catch (err) {
    failures.push(`${name} — threw: ${err.message}`);
    process.stdout.write("F");
  }
}

async function acheck(name, fn) {
  try {
    const r = await fn();
    if (r === true || r === undefined) {
      pass++;
      process.stdout.write(".");
    } else {
      failures.push(`${name} — got ${JSON.stringify(r)}`);
      process.stdout.write("F");
    }
  } catch (err) {
    failures.push(`${name} — threw: ${err.message}`);
    process.stdout.write("F");
  }
}

const throws = (fn, re) => {
  try {
    fn();
  } catch (err) {
    return re.test(err.message) ? true : `wrong message: ${err.message}`;
  }
  return "did not throw";
};

async function rejects(fn, re) {
  try {
    await fn();
  } catch (err) {
    return re.test(err.message) ? true : `wrong message: ${err.message}`;
  }
  return "did not reject";
}

// ---------------------------------------------------------------------------
// synthetic LedgerHeader builder — mirrors the structure xdr.mjs parses
// ---------------------------------------------------------------------------
function beU32(n) {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(n >>> 0, 0);
  return b;
}
function beI64(n) {
  const b = Buffer.alloc(8);
  b.writeBigInt64BE(BigInt(n), 0);
  return b;
}
function beU64(n) {
  const b = Buffer.alloc(8);
  b.writeBigUInt64BE(BigInt(n), 0);
  return b;
}
const ZERO32 = () => Buffer.alloc(32);

function buildHeader({
  ledgerVersion = 28,
  seq = 42,
  prev = null,
  totalCoins = CAP_STROOPS,
  feePool = 123456789n,
  inflationSeq = 0,
  idPool = 0n,
  baseFee = 100000,
  baseReserve = 4900000,
  maxTxSetSize = 1000,
  upgrades = [],
  signed = false,
  extVersion = 0,
  truncate = 0,
} = {}) {
  const parts = [];
  parts.push(beU32(ledgerVersion));
  parts.push(prev ?? ZERO32()); // previousLedgerHash
  parts.push(ZERO32()); // scpValue.txSetHash
  parts.push(beU64(1792354230n)); // scpValue.closeTime
  parts.push(beU32(upgrades.length));
  for (const u of upgrades) {
    parts.push(beU32(u.length));
    parts.push(u);
    const pad = xdrPad(u.length);
    if (pad) parts.push(Buffer.alloc(pad));
  }
  parts.push(beU32(signed ? 1 : 0)); // scpValue.ext
  if (signed) {
    parts.push(beU32(0)); // PublicKey type = ed25519
    parts.push(ZERO32()); // nodeID
    parts.push(beU32(64)); // signature length
    parts.push(Buffer.alloc(64));
  }
  parts.push(ZERO32()); // txSetResultHash
  parts.push(ZERO32()); // bucketListHash
  parts.push(beU32(seq));
  parts.push(beI64(totalCoins));
  parts.push(beI64(feePool));
  parts.push(beU32(inflationSeq));
  parts.push(beU64(idPool));
  parts.push(beU32(baseFee));
  parts.push(beU32(baseReserve));
  parts.push(beU32(maxTxSetSize));
  for (let i = 0; i < 4; i++) parts.push(ZERO32()); // skipList
  parts.push(beU32(extVersion));
  let buf = Buffer.concat(parts);
  if (truncate) buf = buf.subarray(0, buf.length - truncate);
  return buf;
}

const b64 = (buf) => buf.toString("base64");

// ---------------------------------------------------------------------------
// OFFLINE
// ---------------------------------------------------------------------------
console.log("\nOFFLINE — pure functions, XDR reader, failure paths");

// --- formatting / units -----------------------------------------------------
check("CAP_STROOPS is exactly 1e18", () => CAP_STROOPS === 1000000000000000000n);
check("STROOPS_PER_PI is 10^7", () => STROOPS_PER_PI === 10000000n);
check("formatPi(cap) === the API's own string", () => formatPi(CAP_STROOPS) === CAP_STRING);
check("formatPi(1) === 0.0000001", () => formatPi(1n) === "0.0000001");
check("formatPi(-1) === -0.0000001", () => formatPi(-1n) === "-0.0000001");
check("formatPi(0) === 0.0000000", () => formatPi(0n) === "0.0000000");
check("formatPi pads to 7 decimals", () => formatPi(12300000n) === "1.2300000");
check("parsePi(formatPi(x)) round-trips", () => [0n, 1n, 7n, 123456789n, CAP_STROOPS].every((x) => parsePi(formatPi(x)) === x));
check("parsePi('0.8') === 8000000", () => parsePi("0.8") === 8000000n);
check("parsePi rejects junk", () => throws(() => parsePi("abc"), /not a/));
check("parsePi rejects >7 decimals", () => throws(() => parsePi("1.12345678"), /not a/));
check("parsePi rejects empty", () => throws(() => parsePi(""), /not a/));
check("parsePi rejects numbers", () => throws(() => parsePi(5), /not a/));

// --- validation -------------------------------------------------------------
check("isLedgerSeq accepts '2'", () => isLedgerSeq("2") === true);
check("isLedgerSeq accepts a 9-digit seq", () => isLedgerSeq("29284178") === true);
check("isLedgerSeq rejects '0'", () => isLedgerSeq("0") === false);
check("isLedgerSeq rejects '01'", () => isLedgerSeq("01") === false);
check("isLedgerSeq rejects ''", () => isLedgerSeq("") === false);
check("isLedgerSeq rejects non-numbers", () => isLedgerSeq("abc") === false);
check("isGAddress accepts a real account", () => isGAddress("GBWKGBVDEJO3JKRV7IUBHXMBE7A2JYHOGMUMKEO2XM5RFIRBRVSYHTZA") === true);
check("isGAddress rejects a short id", () => isGAddress("GBWKGBVDEJO3") === false);
check("isHash accepts 64 hex", () => isHash("e0916b2f64bef9da8ac6c2e784a98e48102637a77654a1a73055cb2b6927914c") === true);
check("isHash rejects 63 hex", () => isHash("e0916b2f64bef9da8ac6c2e784a98e48102637a77654a1a73055cb2b6927914") === false);

// --- sampling ---------------------------------------------------------------
check("sampleLedgers is ascending", () => {
  const s = sampleLedgers(2, 1000, 10);
  return s.every((v, i) => i === 0 || v > s[i - 1]);
});
check("sampleLedgers honours bounds", () => sampleLedgers(10, 50, 5).every((v) => v >= 10 && v <= 50));
check("sampleLedgers is deterministic", () => JSON.stringify(sampleLedgers(2, 999, 7)) === JSON.stringify(sampleLedgers(2, 999, 7)));
check("sampleLedgers includes both endpoints", () => {
  const s = sampleLedgers(2, 500, 5);
  return s[0] === 2 && s[s.length - 1] === 500;
});

// --- mapLimit ---------------------------------------------------------------
await acheck("mapLimit preserves order", async () => {
  const out = await mapLimit([50, 10, 30, 20, 40], 2, async (ms, i) => {
    await new Promise((r) => setTimeout(r, ms / 100));
    return i;
  });
  return JSON.stringify(out) === "[0,1,2,3,4]";
});
await acheck("mapLimit never exceeds the limit", async () => {
  let live = 0;
  let peak = 0;
  await mapLimit([1, 2, 3, 4, 5, 6, 7, 8], 3, async () => {
    live++;
    peak = Math.max(peak, live);
    await new Promise((r) => setTimeout(r, 5));
    live--;
  });
  return peak <= 3;
});
await acheck("mapLimit tolerates limit > length", async () => {
  const out = await mapLimit([1, 2], 50, async (x) => x * 2);
  return JSON.stringify(out) === "[2,4]";
});
await acheck("mapLimit rejects when a call rejects", () =>
  rejects(() => mapLimit([1, 2, 3], 2, async (x) => {
    if (x === 2) throw new Error("boom");
    return x;
  }), /boom/)
);

// --- XDR primitives ---------------------------------------------------------
check("xdrPad(0..4)", () => xdrPad(0) === 0 && xdrPad(1) === 3 && xdrPad(2) === 2 && xdrPad(3) === 1 && xdrPad(4) === 0);
check("XdrReader reads u32", () => new XdrReader(beU32(28)).u32() === 28);
check("XdrReader reads i64 as BigInt", () => new XdrReader(beI64(CAP_STROOPS)).i64() === CAP_STROOPS);
check("XdrReader reads u64 as BigInt", () => new XdrReader(beU64(0xffffffffffffffffn)).u64() === 0xffffffffffffffffn);
check("XdrReader.need throws with the offset", () => throws(() => new XdrReader(Buffer.alloc(2)).u32(), /offset 0/));
check("varOpaque enforces the declared max", () => throws(() => new XdrReader(Buffer.concat([beU32(99), Buffer.alloc(99)])).varOpaque(64), /exceeds the declared max 64/));
check("XdrReader needs a Buffer", () => throws(() => new XdrReader("nope"), /needs a Buffer/));

// --- decodeLedgerHeader -----------------------------------------------------
check("decode rejects an empty header_xdr", () => throws(() => decodeLedgerHeader(""), /missing or empty/));
check("decode rejects a truncated header", () => throws(() => decodeLedgerHeader(b64(buildHeader({ truncate: 20 }))), /truncated/));
check("decode reads totalCoins and feePool", () => {
  const h = decodeLedgerHeader(b64(buildHeader({ seq: 777, totalCoins: CAP_STROOPS, feePool: 42n })));
  return h.ledgerSeq === 777 && h.totalCoins === CAP_STROOPS && h.feePool === 42n;
});
check("decode reads inflationSeq (JSON does not expose it)", () => decodeLedgerHeader(b64(buildHeader({ inflationSeq: 0 }))).inflationSeq === 0);
check("decode consumes the whole buffer (ext v0)", () => {
  const buf = buildHeader({});
  const h = decodeLedgerHeader(b64(buf));
  return h.bytesConsumed === buf.length;
});
check("decode handles a SIGNED StellarValue (ext = 1)", () => {
  const h = decodeLedgerHeader(b64(buildHeader({ signed: true, seq: 9, totalCoins: CAP_STROOPS })));
  return h.ledgerSeq === 9 && h.totalCoins === CAP_STROOPS;
});
check("decode handles a non-empty upgrades list", () => {
  const h = decodeLedgerHeader(b64(buildHeader({ upgrades: [Buffer.alloc(1, 7), Buffer.alloc(5, 9)] , seq: 11 })));
  return h.scpUpgradeCount === 2 && h.ledgerSeq === 11;
});
check("decode surfaces the public fields", () => {
  const h = decodeLedgerHeader(b64(buildHeader({ baseFee: 100000, baseReserve: 4900000, maxTxSetSize: 1000 })));
  return h.baseFee === 100000 && h.baseReserve === 4900000 && h.maxTxSetSize === 1000;
});
check("decode returns previousLedgerHash as hex", () => {
  const h1 = buildHeader({ seq: 5 });
  const hash1 = sha256Hex(h1);
  const h2 = buildHeader({ seq: 6, prev: Buffer.from(hash1, "hex") });
  return decodeLedgerHeader(b64(h2)).previousLedgerHash === hash1;
});

// --- chain.mjs (SHA-256 binding) --------------------------------------------
check("sha256Hex matches the known SHA-256 of the empty string", () =>
  sha256Hex(Buffer.alloc(0)) === "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
);
check("sha256Hex matches the known SHA-256 of 'abc'", () =>
  sha256Hex(Buffer.from("abc")) === "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
);
check("headerHashMatches accepts the true hash and rejects a wrong one", () => {
  const h = buildHeader({});
  return headerHashMatches(b64(h), sha256Hex(h)) === true && headerHashMatches(b64(h), "0".repeat(64)) === false;
});
check("previousHashOf reads bytes 4..36", () =>
  previousHashOf(b64(buildHeader({ prev: Buffer.alloc(32, 7) }))) === "07".repeat(32)
);
check("verifyChain accepts a well-linked pair", () => {
  const h1 = buildHeader({ seq: 10 });
  const h2 = buildHeader({ seq: 11, prev: Buffer.from(sha256Hex(h1), "hex") });
  const r = verifyChain([
    { sequence: 10, hash: sha256Hex(h1), header_xdr: b64(h1) },
    { sequence: 11, hash: sha256Hex(h2), header_xdr: b64(h2) },
  ]);
  return r.ok === true && r.checks >= 3;
});
check("verifyChain rejects a tampered hash", () => {
  const h1 = buildHeader({ seq: 10 });
  const h2 = buildHeader({ seq: 11, prev: Buffer.from(sha256Hex(h1), "hex") });
  return verifyChain([
    { sequence: 10, hash: sha256Hex(h1), header_xdr: b64(h1) },
    { sequence: 11, hash: "f".repeat(64), header_xdr: b64(h2) },
  ]).ok === false;
});
check("verifyChain rejects a broken link", () => {
  const h1 = buildHeader({ seq: 10 });
  const h2 = buildHeader({ seq: 11, prev: ZERO32() }); // does not commit to h1
  return verifyChain([
    { sequence: 10, hash: sha256Hex(h1), header_xdr: b64(h1) },
    { sequence: 11, hash: sha256Hex(h2), header_xdr: b64(h2) },
  ]).ok === false;
});

// --- api() failure paths (injected transport, no network) --------------------
await acheck("api() surfaces a network error", () =>
  rejects(() => api("/ledgers/2", { fetch: async () => { throw new Error("ECONNREFUSED"); } }), /network error/)
);
await acheck("api() surfaces a timeout", () =>
  rejects(() => api("/ledgers/2", { fetch: async () => { const e = new Error("x"); e.name = "AbortError"; throw e; } }), /timeout after/)
);
await acheck("api() surfaces a non-2xx status", () =>
  rejects(() => api("/ledgers/1", { fetch: async () => ({ ok: false, status: 410, statusText: "Gone", text: async () => "gone" }) }), /410 Gone/)
);
await acheck("api() surfaces invalid JSON", () =>
  rejects(() => api("/x", { fetch: async () => ({ ok: true, json: async () => { throw new Error("bad"); } }) }), /invalid JSON/)
);
await acheck("api() retries a 429 and then succeeds", async () => {
  let calls = 0;
  const out = await api("/x", {
    fetch: async () => {
      calls++;
      if (calls === 1) {
        return { ok: false, status: 429, statusText: "Too Many Requests", headers: { get: () => "0" }, text: async () => "" };
      }
      return { ok: true, json: async () => ({ ok: true }) };
    },
  });
  return out.ok === true && calls === 2;
});
await acheck("api() gives up after `retries` on a persistent 429", async () => {
  let calls = 0;
  const r = await rejects(
    () =>
      api("/x", {
        retries: 2,
        fetch: async () => {
          calls++;
          return { ok: false, status: 429, statusText: "Too Many Requests", headers: { get: () => "0" }, text: async () => "slow down" };
        },
      }),
    /429 Too Many Requests/
  );
  return r === true && calls === 3;
});
await acheck("api() returns parsed JSON on success", async () => {
  const out = await api("/x", { fetch: async () => ({ ok: true, json: async () => ({ hi: 1 }) }) });
  return out.hi === 1;
});
await acheck("api() targets the public Mainnet API by default", async () => {
  let seen = null;
  await api("/probe", { fetch: async (url) => { seen = url; return { ok: true, json: async () => ({}) }; } });
  return seen === BASE + "/probe";
});

// ---------------------------------------------------------------------------
// ONLINE
// ---------------------------------------------------------------------------
let onlineRun = 0;
if (!OFFLINE_ONLY) {
  console.log("\n\nONLINE — live assertions against Pi Mainnet (GET only)");

  let head = null;
  await acheck("online: reach the head ledger", async () => {
    const p = await api("/ledgers?order=desc&limit=1");
    head = p?._embedded?.records?.[0] ?? null;
    return head != null;
  });
  await acheck("online: the head ledger reports the documented cap", () => head && head.total_coins === CAP_STRING);
  await acheck("online: the head ledger's protocol version is >= 12", () => head && Number(head.protocol_version) >= 12);
  await acheck("online: ledger 2 reports the documented cap (genesis)", async () => {
    const l = await api("/ledgers/2");
    return l.total_coins === CAP_STRING;
  });
  await acheck("online: ledger 1 is not served (the bound of the claim)", async () => {
    const r = await rejects(() => api("/ledgers/1", { retries: 0 }), /410|404/);
    return r === true;
  });
  await acheck("online: the raw header decodes and agrees with the JSON", () => {
    const h = decodeLedgerHeader(head.header_xdr);
    return formatPi(h.totalCoins) === head.total_coins && h.ledgerSeq === Number(head.sequence);
  });
  await acheck("online: inflationSeq is 0 on the head ledger", () => decodeLedgerHeader(head.header_xdr).inflationSeq === 0);
  await acheck("online: totalCoins in the header IS the cap, in stroops", () => decodeLedgerHeader(head.header_xdr).totalCoins === CAP_STROOPS);
  await acheck("online: sha256(raw header bytes) equals the ledger hash the API reports", () =>
    sha256Hex(Buffer.from(head.header_xdr, "base64")) === head.hash
  );
  await acheck("online: consecutive headers are linked by SHA-256", async () => {
    const prev = await api(`/ledgers/${Number(head.sequence) - 1}`);
    return previousHashOf(head.header_xdr) === sha256Hex(Buffer.from(prev.header_xdr, "base64"));
  });

  onlineRun = 10;
}

// ---------------------------------------------------------------------------
// report
// ---------------------------------------------------------------------------
const total = pass + failures.length;
console.log("\n");
console.log("─".repeat(74));
console.log(`  checks passed : ${pass}/${total}   (${total - onlineRun} offline, ${onlineRun} online)`);
if (failures.length) {
  console.log(`  checks FAILED : ${failures.length}`);
  for (const f of failures) console.log(`    ✗ ${f}`);
  console.log("─".repeat(74));
  process.exit(1);
}
console.log("  ✅ all checks passed");
console.log("─".repeat(74));
console.log("");
