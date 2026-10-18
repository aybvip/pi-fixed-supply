#!/usr/bin/env node
/**
 * lib.mjs
 * ---------------------------------------------------------------------------
 * Small shared helpers for the example scripts. Nothing here talks to a
 * wallet, holds keys, or writes anything — it is a read-only HTTP client plus
 * input validation and integer formatting, so the CLIs fail loudly and
 * helpfully instead of throwing opaque `undefined` errors.
 *
 * Zero dependencies (Node 18+ built-in fetch).
 * ---------------------------------------------------------------------------
 */

export const BASE = "https://api.mainnet.minepi.com";

/** Default per-request timeout (ms). A hung socket can never hang the CLI. */
export const DEFAULT_TIMEOUT_MS = 15000;

/** 1 π = 10,000,000 stroops (the smallest unit). Exact — never a float. */
export const STROOPS_PER_PI = 10_000_000n;

/** The documented maximum supply: 100 billion π. */
export const CAP_PI = 100_000_000_000n;

/** The documented maximum supply in stroops: 1e18. */
export const CAP_STROOPS = CAP_PI * STROOPS_PER_PI;

/** The exact string the API reports for the cap. */
export const CAP_STRING = "100000000000.0000000";

/**
 * GET a JSON endpoint on the public Pi Mainnet API and surface *useful* errors:
 * network failure, timeout, HTTP status, an unreadable body, and invalid JSON.
 * Every failure path throws a plain `Error` with a human-readable message, so a
 * caller never sees an opaque `undefined` or an unhandled rejection.
 *
 * The `opts` bag exists so the failure paths can be unit-tested **offline**:
 * pass `{ fetch }` to inject a fake transport, and/or `{ base, timeoutMs,
 * retries }`. Real callers use the defaults (built-in fetch ->
 * api.mainnet.minepi.com). `timeoutMs: 0` disables the timeout.
 *
 * The public API rate-limits bursts, so a 429 (or 503) is retried with
 * exponential backoff — honouring `Retry-After` when the server sends it — up
 * to `retries` times. Every other status fails immediately.
 *
 * @param {string} path                       e.g. "/ledgers/29284154"
 * @param {{fetch?:Function, base?:string, timeoutMs?:number, retries?:number}} [opts]
 */
export async function api(path, opts = {}) {
  const base = opts.base ?? BASE;
  const url = base + path;
  const fetchImpl = opts.fetch ?? fetch;
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRetries = opts.retries ?? 4;

  for (let attempt = 0; ; attempt++) {
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    let timer = null;
    if (controller && timeoutMs > 0) {
      // NB: deliberately NOT unref()'d. The timer must keep the loop alive long
      // enough to fire, otherwise a hung request would let the process exit
      // before the timeout is reported. It is always cleared in the `finally`.
      timer = setTimeout(() => controller.abort(), timeoutMs);
    }

    let res;
    try {
      res = await fetchImpl(url, {
        headers: { Accept: "application/json" },
        ...(controller ? { signal: controller.signal } : {}),
      });
    } catch (err) {
      const aborted =
        (err && err.name === "AbortError") || /abort/i.test(String((err && err.message) || ""));
      throw new Error(
        aborted
          ? `timeout after ${timeoutMs}ms -> ${url}\n      no response from the API`
          : `network error -> ${url}\n      ${err && err.message ? err.message : err}`
      );
    } finally {
      if (timer) clearTimeout(timer);
    }

    if (res.ok) {
      try {
        return await res.json();
      } catch (err) {
        throw new Error(
          `invalid JSON -> ${path}\n      the response body could not be parsed as JSON (${err && err.message ? err.message : err})`
        );
      }
    }

    // 429 / 503 — the server asked us to slow down. Back off and try again.
    if ((res.status === 429 || res.status === 503) && attempt < maxRetries) {
      let retryAfter = NaN;
      try {
        retryAfter = Number(res.headers?.get?.("retry-after"));
      } catch {
        /* the injected fake has no Headers object — fall through to backoff */
      }
      const waitMs =
        Number.isFinite(retryAfter) && retryAfter > 0
          ? Math.min(retryAfter * 1000, 60000)
          : Math.min(600 * 2 ** attempt, 20000);
      await new Promise((r) => setTimeout(r, waitMs));
      continue;
    }

    let body = "";
    try {
      body = await res.text();
    } catch {
      /* body not readable — ignore */
    }
    const snippet = body ? `\n      ${String(body).replace(/\s+/g, " ").trim().slice(0, 300)}` : "";
    throw new Error(`${res.status} ${res.statusText} -> ${path}${snippet}`);
  }
}

/** A horizontal rule of `n` copies of `c` (default 74). */
export const rule = (c = "-", n = 74) => console.log(c.repeat(n));

// ---------------------------------------------------------------------------
// Integer / π formatting — exact, never floating point
// ---------------------------------------------------------------------------

/**
 * Render a BigInt number of stroops as a π string with exactly 7 decimals,
 * matching the API's own formatting (e.g. 100000000000.0000000).
 * @param {bigint} stroops
 */
export function formatPi(stroops) {
  const neg = stroops < 0n;
  const v = neg ? -stroops : stroops;
  const whole = v / STROOPS_PER_PI;
  const frac = v % STROOPS_PER_PI;
  return `${neg ? "-" : ""}${whole}.${frac.toString().padStart(7, "0")}`;
}

/** Parse the API's decimal π string into exact stroops (BigInt). Throws on junk. */
export function parsePi(s) {
  if (typeof s !== "string" || !/^-?\d+(\.\d{1,7})?$/.test(s)) {
    throw new Error(`not a π decimal: ${JSON.stringify(s)}`);
  }
  const neg = s.startsWith("-");
  const [w, f = ""] = (neg ? s.slice(1) : s).split(".");
  const stroops = BigInt(w) * STROOPS_PER_PI + BigInt((f + "0000000").slice(0, 7));
  return neg ? -stroops : stroops;
}

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------
const isStr = (s) => typeof s === "string";

/** A positive ledger sequence number. */
export const isLedgerSeq = (s) => isStr(s) && /^[1-9][0-9]{0,11}$/.test(s);

/** `G...` account id (public key): 1 + 55 base32 chars. */
export const isGAddress = (s) => isStr(s) && /^G[A-Z2-7]{55}$/.test(s);

/** 64-char hex hash (ledger or transaction). */
export const isHash = (s) => isStr(s) && /^[0-9a-fA-F]{64}$/.test(s);

/**
 * Print a message plus usage lines to stderr and exit with a non-zero code.
 * Keeps every CLI honest about *why* it refused to run.
 */
export function usageAndExit(lines, code = 2) {
  for (const line of lines) console.error(line);
  console.error("");
  process.exit(code);
}

/**
 * Run `fn` over `items` with at most `limit` calls in flight, preserving order.
 * Used to sweep many ledgers without hammering the API or waiting serially.
 * Rejects if any call rejects.
 *
 * @template T,R
 * @param {T[]} items
 * @param {number} limit
 * @param {(item:T, index:number)=>Promise<R>} fn
 * @returns {Promise<R[]>}
 */
export async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  const width = Math.max(1, Math.min(Math.floor(limit) || 1, items.length));
  let next = 0;
  const worker = async () => {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      out[i] = await fn(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: width }, worker));
  return out;
}

/**
 * Build a deterministic, reproducible sample of ledger sequences in [from, to]:
 * the endpoints, `n` evenly spaced points, and a logarithmic sweep (so early
 * history — where a supply change would most likely hide — is well covered).
 * Returned ascending and de-duplicated.
 */
export function sampleLedgers(from, to, n = 40) {
  const pts = new Set([from, from + 1, to, to - 1]);
  if (n > 0) {
    for (let i = 0; i <= n; i++) pts.add(from + Math.floor(((to - from) * i) / n));
  }
  const lo = Math.max(from, 1);
  for (let e = Math.log10(lo); e <= Math.log10(to) + 1e-9; e += 0.25) {
    pts.add(Math.floor(10 ** e));
  }
  return [...pts].filter((s) => Number.isInteger(s) && s >= from && s <= to).sort((a, b) => a - b);
}
