---
layout: default
title: "PROOF — the claim, assembled end to end"
---

# PROOF — the claim, assembled end to end

> This is the long-form proof. If you only want the verdict, run
> `node examples/run-all.mjs`. If you want to know *whether to trust that verdict*, read on.

---

## 1. The claim

> **Pi’s total native supply is exactly 100,000,000,000 π on every observable ledger, and no operation
> in the network’s current protocol increases it.**

Two clauses, deliberately separated, because they are supported by different kinds of evidence:

| Clause | Kind of evidence |
|---|---|
| “exactly 100,000,000,000 π on every observable ledger” | **Measured** — read from ledger headers |
| “no operation in the current protocol increases it” | **Documented + measured** — the issuance operation is gone, and the header’s issuance counter is 0 |

---

## 2. Step 1 — what the number is, and where it lives

Every ledger header carries a field the API exposes as `total_coins` and the raw header stores as
`totalCoins`. Stellar’s documentation defines it as:

> “**Total coins** — Total number of lumens in existence.” — *Ledger header fields* (updated 2026-05-27)

Two consequences, both load-bearing:

1. It is a **stock** — “in existence” — not a flow, and not a per-block reward.
2. It is **one consensus-maintained number in the header**. It is *not* produced by summing account
   balances, and this repository does not claim that it equals such a sum.

### 2.1 The unit, derived rather than assumed

The header of the latest ledger reports:

```
totalCoins      : 1000000000000000000 stroops  =  100000000000.0000000 π
```

The documented cap is `100,000,000,000` π. Therefore `10¹⁸ ÷ 10¹¹ = 10⁷`, i.e. **1 π = 10,000,000
stroops** — the scale is *read off the chain*, not imported from documentation. All arithmetic in this
repository is integer arithmetic on stroops, so it never rounds.

Reproduce: `node examples/xdr-header.mjs`.

---

## 3. Step 2 — why the number should not be able to move

The ledger header carries an adjacent field that is an **issuance counter**:

> “**Inflation sequence** — Number of times inflation has been run. Note: the inflation operation was
> deprecated when validators voted to upgrade the network to **Protocol 12** on **10/28/2019**.
> Therefore, inflation no longer runs, so this sequence number no longer changes.”
> — *Ledger header fields* (updated 2026-05-27)

So:

| Fact | Source |
|---|---|
| `inflation` was the protocol’s only native-issuance operation | Stellar documentation of the counter, above |
| It was removed on **2019-10-28** | same |
| Pi Mainnet genesis is **2020-12-31** — fourteen months later | measured, ledger 2 |
| Pi Mainnet runs **Protocol 28** | measured, head header |

The expected behaviour is therefore: `totalCoins` is a **constant of the protocol** on Pi.

> **This repository does not ask you to accept that reasoning.** It measures the number instead, and
> says plainly in `docs/SCOPE.md` §7 that it is *not* attempting a proof from source code that no code
> path anywhere can write to `totalCoins`.

---

## 4. Step 3 — the measurement

### 4.1 The earliest observable ledger

```
curl -s https://api.mainnet.minepi.com/ledgers/1
# HTTP 410 Gone
```

Ledger 1 is **not served**. The claim’s lower bound is therefore **ledger 2**, closed
**2020-12-31T22:47:31Z**. That boundary is stated in `SCOPE.md` and explained in
`docs/FAQ-LEDGER-1-MISSING.md` rather than papered over with the word “genesis”.

Decoding ledger 2’s **raw header**:

| Field | Value |
|---|---|
| `ledgerSeq` | `2` |
| `totalCoins` | `1000000000000000000` stroops = **100,000,000,000 π** |
| `feePool` | `0` |
| `inflationSeq` | **`0`** |
| `header hash` | `af5e4f8ad2331ddec839022a70278c808f1a1ad2782fdc9dd1542fca165f8947` |

Three things at the earliest observable point: the total is **already exactly the cap**; no fees have
ever been collected; and **the issuance counter has never been incremented**.

### 4.2 The sweep

`examples/supply-check.mjs` reads `total_coins` on a deterministic sample across the whole observable
range — the endpoints, 40 evenly spaced ledgers, and a **logarithmic sweep** that is deliberately dense
in the earliest history, where a supply change would be easiest to miss and most consequential.

Result at the last run:

| | |
|---|---|
| Range | ledger **2 … 29,284,239** |
| Ledgers read | **70** |
| Ledgers **not** at the cap | **0** |
| `fee_pool` at ledger 2 | `0.0000000` |
| `fee_pool` at the head | `11780946.9229664` |
| Protocol versions seen | `0, 15, 18, 19, 21, 24, 25, 26, 28` |

The fee pool growing while the total does not is the difference between a **sink** and **issuance** —
Stellar defines the fee pool as “Number of lumens that have been paid in fees”, a separate field.
[`docs/FAQ-FEE-POOL.md`](docs/FAQ-FEE-POOL.md)

### 4.3 The reader is not blind

A fair worry about a sweep that reports “nothing changed” is that it could not have noticed a change.
It could. In the **same header**, over the same period:

| Field | Ledger 2 | Head | Changed? |
|---|---|---|---|
| `baseFee` | `100` | `100000` | ✅ |
| `baseReserve` | `100000000` | `4900000` | ✅ |
| `maxTxSetSize` | `100` | `1000` | ✅ |
| `ledgerVersion` | `0` | `28` | ✅ |
| `feePool` | `0` | `11780946.8629664` | ✅ |
| **`totalCoins`** | **`100000000000.0000000`** | **`100000000000.0000000`** | ❌ |
| **`inflationSeq`** | **`0`** | **`0`** | ❌ |

The header is demonstrably moving elsewhere while the supply and the issuance counter do not. That is
what an invariant looks like, rather than a stale copy.

---

## 5. Step 4 — removing the API from the trust path

Everything above would be worthless if it only restated what the API asserted. So the API is not the
source.

Each ledger response carries **both** `total_coins` (a string the API produced) and `header_xdr` — the
**actual consensus-signed header**, base64. `examples/xdr.mjs` decodes the second, strictly, field by
field, and `examples/xdr-header.mjs` refuses to pass unless the two agree:

```
  cross-check: raw XDR  vs  the API's JSON
    ✓ ledgerSeq      xdr=29284238  json=29284238
    ✓ totalCoins     xdr=100000000000.0000000  json=100000000000.0000000
    ✓ feePool        xdr=11780946.8629664  json=11780946.8629664
    ✓ maxTxSetSize   xdr=1000  json=1000
    ✓ baseFee        xdr=100000  json=100000
    ✓ baseReserve    xdr=4900000  json=4900000
    ✓ ledgerVersion  xdr=28  json=28
```

A disagreement is a **finding** (falsifier F3), not a footnote — the tool exits non-zero and says so.

The decoder is the only way to read **`inflationSeq`**, which the JSON does not expose at all. And it is
strict on purpose: short buffers, over-long length fields and unknown extensions all **throw with the
exact byte offset** rather than yielding a plausible wrong number. The offline half of the test suite
covers those paths, including a synthetic *signed* `StellarValue`.

---

## 6. What would falsify all of this

| | Falsifier | Status |
|---|---|---|
| **F1** | A ledger whose `total_coins` is not the cap | 🟢 not found across 70 ledgers spanning the whole range |
| **F2** | An operation that creates native π | 🟢 not found; no issuance-looking type; `inflationSeq` = 0 |
| **F3** | A header/JSON disagreement | 🟢 not found; all decoded fields agree |
| **F4** | A protocol change enabling issuance | ⚪ **open by design** — reserved in Pi’s Whitepaper |
| **F5** | A pre-genesis ledger disagreeing | ⚪ unreachable — ledger 1 is not served |

F4 deserves emphasis: Pi’s own Whitepaper reserves the question of *future* inflation, to be decided by
the community after distribution completes. That is why the claim is worded **“no operation in the
network’s current protocol”** and **“on every observable ledger”** — a statement about the measurable
present, not a promise about eternity.
[`docs/FAQ-FUTURE-INFLATION.md`](docs/FAQ-FUTURE-INFLATION.md)

---

## 7. Summary

| | |
|---|---|
| **Claimed** | `total_coins` is exactly 100,000,000,000 π on every observable ledger (2 … head), and no operation in the current protocol increases it |
| **How** | protocol rule (issuance removed 2019-10-28) + raw-header decode + 70-ledger sweep + API/header cross-check |
| **Measured** | 70 ledgers, 0 deviations; `inflationSeq` = 0; `fee_pool` 0 → 11,780,946.9229664; raw `totalCoins` = 10¹⁸ stroops |
| **Not claimed** | circulating supply, allocation, unlock schedule, a sum of balances, “impossible forever”, price |
| **Falsified by** | one ledger off the cap; one issuance operation; one header/JSON disagreement |
| **To verify** | `node examples/run-all.mjs` — or one `curl` |
