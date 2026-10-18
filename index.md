---
layout: default
title: "Pi's ledger headers report 100,000,000,000 π — and the chain shows no issuance"
description: "A read-only, zero-dependency measurement: every ledger header examined on Pi Mainnet reports totalCoins = 100,000,000,000 π, and the chain shows no issuance operation — consistent with the documented protocol rule that removed native issuance before Pi's genesis."
---

<div class="hero">
  <p class="claim">
    Every ledger header examined on Pi Mainnet reports <strong>100,000,000,000 π</strong>, and the chain
    shows no issuance operation — consistent with the documented protocol rule that removed native
    issuance before Pi’s genesis.
  </p>
  <p style="margin:.8rem 0 0;color:var(--dim);font-size:.92rem">
    Measured, not asserted: the number is read out of the raw header bytes — not the API’s summary — and
    those bytes are bound to the network by SHA-256, across a sweep from ledger 2 to the live head.
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
| **A** | `totalCoins` = 100,000,000,000 π on every ledger examined | ✅ **Measured** — 70-ledger sweep, raw XDR |
| **B** | Any **single ledger’s** supply is readable from its **raw header bytes**, tied by SHA-256 to the network’s hash chain | ✅ **Verifiable** |
| **C** | **Circulating / “effective”** supply, allocation, unlock schedules, price | ❌ **Not claimed** |

If someone says this proves “100 billion π are in circulation”, they are describing **Claim C** — which
is not made here. Pi names that number differently and computes it off-ledger.

Claim A is a **measurement**. The step from “the field is constant” to “the protocol cannot increase
it” is a separate, weaker statement — **documented and observed**, not proven from protocol source —
and it is labelled as such throughout.

---

## The evidence

| Observation | Value |
|---|---|
| Documented maximum supply | **100,000,000,000 π** |
| Earliest ledger served | **2** — 2020-12-31T22:47:31Z — `total_coins = 100000000000.0000000` |
| Ledger 1 | HTTP **410 Gone** — the claim’s lower bound |
| Head at last retrieval | **29,284,884** — 2026-10-18T21:08:55Z — `total_coins = 100000000000.0000000` |
| Ledgers sampled across the range | **70** |
| Ledgers **not** at the cap | **0** |
| `totalCoins` from the **raw XDR** | **1000000000000000000** stroops |
| `inflationSeq` from the **raw XDR** | **0** — the issuance counter has never moved |
| `sha256(header)` vs the ledger hash | equal on every header walked; adjacent headers chain by SHA-256 |
| `fee_pool` | `0.0000000` at genesis → `11781341.5131664` at the head |

---

## Why it is expected — and observed — not to move

Stellar’s ledger-header documentation is explicit: **“Total coins — Total number of lumens in
existence”**, and the **inflation sequence** “no longer changes” because the inflation operation was
**deprecated at Protocol 12 on 10/28/2019**.

`inflation` was the protocol’s only native-issuance operation. Pi’s genesis is **2020-12-31** — fourteen
months later — and Pi runs **Protocol 28**. Pi documents the cap itself, and states in its own words
that “all tokens were minted at the genesis as technically required by the blockchain protocol”.

A constant header field is **not**, by itself, an economic proof. The protocol clause here is
**documented and observed**, scoped to the version verified in the runs above — not asserted as a
promise about eternity.

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
The raw headers are hashed and chained locally, but the <em>anchor</em> hash still comes from the node
you query: use more than one independent endpoint, or run your own.
</p>
