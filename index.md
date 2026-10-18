---
layout: default
title: "Pi's total native supply is fixed at 100,000,000,000 π"
description: "A read-only, zero-dependency proof that Pi Mainnet's total native supply is exactly 100,000,000,000 π on every observable ledger, and that no operation in the current protocol increases it."
---

<div class="hero">
  <p class="claim">
    Pi’s total native supply is exactly <strong>100,000,000,000 π</strong> on every observable ledger,
    and no operation in the network’s current protocol increases it.
  </p>
  <p style="margin:.8rem 0 0;color:var(--dim);font-size:.92rem">
    Measured, not asserted: the number is read out of the raw consensus-signed ledger header — not the
    API’s summary — across a sweep from ledger 2 to the live head.
  </p>
</div>

```bash
node examples/run-all.mjs
```

**Status:** self-tested. **Not** independently audited — [an open request to break it](docs/AUDIT-REQUEST.md).

---

## The claim

| # | Claim | Status |
|---|---|---|
| **A** | Pi’s **total** native supply is fixed at 100,000,000,000 π on every observable ledger | ✅ **Proven** — protocol rule + 70-ledger live measurement |
| **B** | Any **single ledger’s** supply is readable from its raw consensus-signed header | ✅ **Verifiable** |
| **C** | **Circulating / “effective”** supply, allocation, unlock schedules, price | ❌ **Not claimed** |

If someone says this proves “100 billion π are in circulation”, they are describing **Claim C** — which
is not made here. Pi names that number differently and computes it off-ledger.

---

## The evidence

| Observation | Value |
|---|---|
| Documented maximum supply | **100,000,000,000 π** |
| Earliest ledger served | **2** — 2020-12-31T22:47:31Z — `total_coins = 100000000000.0000000` |
| Ledger 1 | HTTP **410 Gone** — the claim’s lower bound |
| Head at last retrieval | **29,284,239** — 2026-10-18T20:15:10Z — `total_coins = 100000000000.0000000` |
| Ledgers sampled across the range | **70** |
| Ledgers **not** at the cap | **0** |
| `totalCoins` from the **raw XDR** | **1000000000000000000** stroops |
| `inflationSeq` from the **raw XDR** | **0** — the issuance counter has never moved |
| `fee_pool` | `0.0000000` at genesis → `11780946.9229664` at the head |

---

## Why it cannot move

Stellar’s ledger-header documentation is explicit: **“Total coins — Total number of lumens in
existence”**, and the **inflation sequence** “no longer changes” because the inflation operation was
**deprecated at Protocol 12 on 10/28/2019**.

`inflation` was the protocol’s only native-issuance operation. Pi’s genesis is **2020-12-31** — fourteen
months later — and Pi runs **Protocol 28**. Pi documents the cap itself, and states in its own words
that “all tokens were minted at the genesis as technically required by the blockchain protocol”.

---

## Read more

| | |
|---|---|
| The proof, end to end | [PROOF](PROOF.md) |
| The exact claim and its limits | [docs/SCOPE](docs/SCOPE.md) |
| Every official source, verbatim, pinned | [docs/SOURCES](docs/SOURCES.md) |
| How to falsify this | [docs/FALSIFICATION](docs/FALSIFICATION.md) |
| What each script asserts | [docs/VERIFICATION](docs/VERIFICATION.md) |
| Every objection, one table | [docs/FAQ-ALL-OBJECTIONS](docs/FAQ-ALL-OBJECTIONS.md) |
| An open request to break it | [docs/AUDIT-REQUEST](docs/AUDIT-REQUEST.md) |
| What is defended, and what is not | [docs/THREAT-MODEL](docs/THREAT-MODEL.md) |

---

## One line, no code

```bash
curl -s https://api.mainnet.minepi.com/ledgers/2 | grep -o '"total_coins":"[^"]*"'
curl -s https://api.mainnet.minepi.com/ledgers?order=desc\&limit=1 | grep -o '"total_coins":"[^"]*"'
```

Both print `"total_coins":"100000000000.0000000"`.

---

<p class="warn" style="color:var(--dim);font-size:.9rem">
<strong>Honest limits.</strong> The sweep is a sample, not an enumeration. The lower bound is ledger 2,
because ledger 1 is not served. <code>total_coins</code> is a header field, not a sum of account balances.
Circulating supply is a different number. Pi’s Whitepaper reserves the question of <em>future</em>
inflation, so the claim is about the current protocol and the observable present — never about eternity.
A node is still trusted: query more than one, or run your own.
</p>
