---
layout: default
title: "VERIFICATION — what each script asserts, and how to reproduce it"
---

# VERIFICATION — what each script asserts, and how to reproduce it

> Read-only. GET only. Zero dependencies. Node 18+.

---

## 0. One command

```bash
node examples/run-all.mjs
```

That runs the whole suite and prints a single verdict. The rest of this file explains what each piece
is actually asserting, so you can judge the claim instead of trusting the green ticks.

---

## 1. The layers

| # | Layer | File | What it asserts | If it fails |
|---|---|---|---|---|
| 1 | **Formatting & units** | `examples/lib.mjs` | π ↔ stroops is exact integer arithmetic; 1 π = 10⁷ stroops; the cap is exactly 10¹⁸ stroops | The number you are comparing is wrong |
| 2 | **XDR decoding** | `examples/xdr.mjs` | The raw header bytes can be parsed to the exact offset, strictly, with no silent fallbacks | The header is not what this code thinks it is |
| 3 | **Hash binding** | `examples/chain.mjs` | `sha256(header bytes)` equals the ledger hash, and adjacent headers chain by SHA-256 — checked locally, with no value the API computed | **A finding** — the bytes are not the ones the chain commits to |
| 4 | **Header truth** | `examples/xdr-header.mjs` | `totalCoins` read from raw XDR equals the API’s `total_coins`; `inflationSeq` = 0 | **A finding** — the API and the ledger disagree |
| 5 | **Range sweep** | `examples/supply-check.mjs` | Every sampled ledger, from 2 to the head, has `total_coins` = the cap | Supply moved |
| 6 | **Fee sink** | `examples/supply-check.mjs` | `fee_pool` grows across the range while `total_coins` does not | Fees are issuance (they are not) |
| 7 | **Operation vocabulary** | `examples/op-check.mjs` | No observed operation type looks like issuance | A supply-creating operation exists |
| 8 | **Failure paths** | `examples/self-test.mjs` | Network errors, timeouts, HTTP statuses, bad JSON and 429 backoff all surface correctly | Errors are being hidden |
| 9 | **Live assertions** | `examples/self-test.mjs` | Head & genesis are at the cap; header decodes; `inflationSeq` = 0; head hash = `sha256(header)`; consecutive headers link | The chain moved |

---

## 2. Why the raw bytes matter — and what “signed” does *not* mean

The API is a convenience layer. It hands you `total_coins` as a **string it produced**. If you only read
that, you are trusting the API.

The same response also carries `header_xdr` — the ledger header as **raw bytes**, base64-encoded. Two
checks run on those bytes, and **neither uses a number the API computed**:

**Hash binding.** In the Stellar protocol the ledger hash *is* `sha256(serialised LedgerHeader)`.
`examples/chain.mjs` recomputes it with `node:crypto` and compares it against the ledger hash the API
reports; and because each header stores the previous ledger’s hash, adjacent headers form a chain that
is verified link by link:

```
    ledger      sha256(header)==hash   totalCoins
    29284694    ✓                    ✓ 100000000000.0000000
    …
    11/11 links verified
```

**The word “signed”, stated exactly.** It is tempting to call this a “consensus-signed header” and stop
there. That over-claims. The SCP signature inside the header covers the **`StellarValue`** (`txSetHash`,
`closeTime`, the upgrade votes) — **not** `totalCoins`, `feePool` or `inflationSeq`. Those are derived
state, computed identically by every honest node. This repository does **not** verify the SCP signature,
and the supply number is not under it. What binds the bytes to the network is the **SHA-256 hash
chain**, not a signature over the supply.

**Cross-check.** `examples/xdr-header.mjs` decodes the raw header and refuses to pass unless the decoded
`totalCoins` equals the API’s `total_coins`, field for field:

```
  cross-check: raw XDR  vs  the API's JSON
    ✓ ledgerSeq      xdr=29284883  json=29284883
    ✓ totalCoins     xdr=100000000000.0000000  json=100000000000.0000000
    ✓ feePool        xdr=11781341.4931664  json=11781341.4931664
    ✓ maxTxSetSize   xdr=1000  json=1000
    ✓ baseFee        xdr=100000  json=100000
    ✓ baseReserve    xdr=4900000  json=4900000
    ✓ ledgerVersion  xdr=28  json=28
```

The decoder is also the only way to read **`inflationSeq`**, which the JSON does not expose at all. That
field is the protocol’s issuance counter, and it reads **0**.

The reader is strict on purpose: a short or malformed buffer throws with the exact byte offset, and a
length field that exceeds its declared maximum is rejected rather than trusted.

---

## 2a. The reader is not blind — other header fields *did* change

A fair question about a sweep that reports “nothing changed” is whether it would have noticed a change
at all. It would: the same decode shows that **other fields in the very same header moved** between
genesis and the head, while `totalCoins` did not.

| Header field | Ledger **2** (2020-12-31, genesis) | Ledger **29,284,883** (2026-10-18, head) | Changed? |
|---|---|---|---|
| `baseFee` | `100` | `100000` | ✅ changed |
| `baseReserve` | `100000000` | `4900000` | ✅ changed |
| `maxTxSetSize` | `100` | `1000` | ✅ changed |
| `ledgerVersion` | `0` | `28` | ✅ changed |
| `feePool` | `0` | `11781341.4931664` | ✅ growing |
| **`totalCoins`** | **`100000000000.0000000`** | **`100000000000.0000000`** | ❌ **constant** |
| **`inflationSeq`** | **`0`** | **`0`** | ❌ **constant** |

Two things follow, and both matter:

1. The header fields are **not** frozen by construction — several of them were re-set by protocol
   governance over the same period. A tool that only ever echoed a hardcoded constant would have been
   caught by this.
2. `totalCoins` and `inflationSeq` are constant **in a header that is elsewhere demonstrably moving**.
   That is what an invariant looks like, as opposed to a stale copy.

All four rows are reproduced by `node examples/xdr-header.mjs 2` and `node examples/xdr-header.mjs`.

---

## 3. What the sweep actually covers

`supply-check.mjs` does not sample 70 random ledgers. The list is deterministic and reproducible:

- both endpoints (`--from`, `--to`);
- `--samples N` evenly spaced ledgers (default 40);
- a **logarithmic sweep** (a point per quarter-decade), which deliberately puts many samples in the
  earliest history — the place where a supply change would be easiest to miss and most consequential.

That is 70 ledgers out of ~29.28 million. **This is a sample, not an enumeration.** The honest framing
is in `SCOPE.md`: the *proof* is the protocol rule, the *measurement* corroborates it, and the cost of
closing the gap is one request per ledger.

---

## 4. Recorded evidence

Snapshots of real runs are committed alongside the code and are regenerated — never hand-edited — by:

```bash
node examples/regenerate-snapshots.mjs
```

| Snapshot | Generated by |
|---|---|
| `examples/xdr-header-output.txt` | `node examples/xdr-header.mjs` |
| `examples/hash-chain-output.txt` | `node examples/hash-chain.mjs --count 12` |
| `examples/supply-check-output.txt` | `node examples/supply-check.mjs --samples 40` |
| `examples/op-check-output.txt` | `node examples/op-check.mjs --ledgers 12 --per 20` |
| `examples/self-test-output.txt` | `node examples/self-test.mjs` |

Because these are regenerated at a moving head, the sequence numbers differ between runs. That is
expected: the **claimed property** is what must be stable, not the ledger number.

---

## 5. Self-test summary

`node examples/self-test.mjs` runs two halves and prints a single ratio:

- **offline** — the π/stroops formatting, input validation, the sampling function, `mapLimit`, every XDR
  primitive, the full header decode (including a synthetic *signed* `StellarValue` and a truncated
  buffer), the SHA-256 chain checks (a known-vector hash, a well-linked pair, and both a tampered hash
  and a broken link correctly rejected), and every documented failure path of the HTTP client (network
  error, timeout, `410`, invalid JSON, `429` retry, exhausted retries).
- **online** — the head and genesis are at the cap, the raw header decodes and agrees, `inflationSeq`
  is 0, `sha256(header)` equals the head’s ledger hash, consecutive headers link by SHA-256, and ledger
  1 is genuinely not served.

Run it without a network to see the offline half alone:

```bash
node examples/self-test.mjs --offline
```

---

## 6. Things this suite deliberately does **not** assert

Stated so that a green run is not read as more than it is:

| Not asserted | Why |
|---|---|
| That the sum of all account balances equals `total_coins` | Never claimed; would require enumerating every account |
| That circulating supply equals any particular number | Claim C — out of scope |
| That the base reserve / base fee fields have a particular meaning in π | They are decoded and cross-checked against the API; their interpretation is not used by any check |
| That no future protocol can change the supply | Explicitly open — `docs/FAQ-FUTURE-INFLATION.md` |
| That the node you query is honest | Not asserted. The raw bytes are hashed and chained locally, so a *fabricated* header must come with a fabricated chain — but the anchor hash must come from somewhere you trust (`docs/THREAT-MODEL.md` §4) |
