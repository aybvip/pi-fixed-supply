---
layout: default
title: "pi-fixed-supply"
---

# pi-fixed-supply

> **Pi’s total native supply is exactly 100,000,000,000 π on every observable ledger, and no operation
> in the network’s current protocol increases it.**

A small, read-only, zero-dependency proof. `GET` requests only. No keys, no wallet, no install beyond
Node 18+ — and a `curl`-only path for people who do not want to run any of it.

**Status:** self-tested (`node examples/run-all.mjs`). **Not** independently audited — see
[`docs/AUDIT-REQUEST.md`](docs/AUDIT-REQUEST.md).

---

## The claim, in three parts

| # | Claim | Status |
|---|---|---|
| **A** | Pi’s **total** native supply is fixed at **100,000,000,000 π** on every observable ledger | ✅ **Proven** — protocol rule + 70-ledger live measurement |
| **B** | Any **single ledger’s** supply can be read from its **raw consensus-signed header** | ✅ **Verifiable** — `examples/xdr-header.mjs` |
| **C** | **Circulating / “effective”** supply, unlock schedules, allocation, price | ❌ **Not claimed** — see below |

If someone tells you this repository “proves 100 billion π are in circulation”, they are describing
**Claim C**, which is not made here. Pi itself names that number differently and computes it off-ledger
([`docs/FAQ-TOTAL-VS-EFFECTIVE.md`](docs/FAQ-TOTAL-VS-EFFECTIVE.md)).

---

## What is claimed — and what is not

| ✅ Claimed | ❌ Not claimed |
|---|---|
| `total_coins` = exactly `100000000000.0000000` on every ledger read, from **ledger 2** to the head | That circulating supply equals any figure |
| The one native-issuance operation was removed **before Pi’s genesis**, and `inflationSeq` = **0** | That supply can **never** change under a future protocol |
| The API’s summary matches the **raw header** it summarises, field by field | That `total_coins` equals the **sum of all account balances** |
| Any deviation is a **finding**, and the tools exit non-zero | Anything about price, scarcity, or investment merit |
| The claim’s lower bound is **ledger 2** (ledger 1 returns `410`) | Anything about ledgers before 2 |

The full statement, with the formal appendix and a falsifier per claim, is
[`docs/SCOPE.md`](docs/SCOPE.md).

---

## Why the number cannot move

Stellar’s ledger-header documentation (`docs/SOURCES.md` §S3) is explicit on two fields:

> **“Total coins** — Total number of lumens in existence.”

> **“Inflation sequence** — Number of times inflation has been run. Note: the inflation operation was
> **deprecated** when validators voted to upgrade the network to **Protocol 12** on **10/28/2019**.
> Therefore, inflation no longer runs, so this sequence number no longer changes.”

`inflation` was the protocol’s **only** native-issuance operation. It was switched off on 2019-10-28.
Pi Mainnet’s genesis is **2020-12-31**, fourteen months later, and Pi runs **Protocol 28**.

Pi’s own documentation agrees the cap exists:

> **“The Maximum Supply of Pi is 100 billion tokens.”** — Pi Network, 2025-04-17

> “the Mainnet supply model has a **clear maximum total supply of 100 billion Pi**” — Pi Whitepaper

And — importantly — Pi **discloses** the uncomfortable part itself:

> “This remains true despite the fact that **all tokens were minted at the genesis** as technically
> required by the blockchain protocol.”

None of that is asked to be taken on faith. **It is measured.**

---

## The evidence

| Observation | Value |
|---|---|
| Documented maximum supply | **100,000,000,000 π** |
| Earliest ledger served | **2** — 2020-12-31T22:47:31Z — `total_coins = 100000000000.0000000` |
| Ledger 1 | HTTP **410 Gone** (the claim’s lower bound) |
| Head at last retrieval | **29,284,239** — 2026-10-18T20:15:10Z — `total_coins = 100000000000.0000000` |
| Ledgers sampled across the range | **70** |
| Ledgers **not** at the cap | **0** |
| `totalCoins` decoded from **raw XDR** | **1000000000000000000** stroops |
| `inflationSeq` decoded from **raw XDR** | **0** |
| `fee_pool` | `0.0000000` at genesis → `11780946.9229664` at the head |
| Protocol versions seen | `0, 15, 18, 19, 21, 24, 25, 26, 28` |

The unit falls out of the chain itself: the header reports `10¹⁸` stroops while the documented cap is
`10¹¹` π — so **1 π = 10,000,000 stroops**, derived, not assumed.

---

## Run it

No install. No dependencies. Node 18+.

```bash
node examples/run-all.mjs
```

| Command | What it does | Cost |
|---|---|---|
| `node examples/run-all.mjs` | Everything, one verdict | ~1 min |
| `node examples/xdr-header.mjs` | Decodes the raw header and cross-checks it against the API | 1 request |
| `node examples/xdr-header.mjs 2` | The same thing for the earliest observable ledger | 1 request |
| `node examples/supply-check.mjs --samples 40` | Sweeps the whole observable range | ~70 requests |
| `node examples/op-check.mjs` | Tabulates the operation types actually used | ~12 requests |
| `node examples/self-test.mjs --offline` | The test suite’s offline half, no network | 0 requests |
| `node examples/check-links.mjs` | Verifies every relative link resolves from its own file | 0 requests |
| `node examples/regenerate-snapshots.mjs` | Rewrites the recorded evidence | ~90 requests |

**No Node? One line.** The claim does not depend on this code:

```bash
curl -s https://api.mainnet.minepi.com/ledgers/2 | grep -o '"total_coins":"[^"]*"'
curl -s https://api.mainnet.minepi.com/ledgers?order=desc\&limit=1 | grep -o '"total_coins":"[^"]*"'
```

Both print `"total_coins":"100000000000.0000000"`.

---

## The important trick: do not trust the API

The API returns `total_coins` — a string **it** produced — and `header_xdr`, the **actual
consensus-signed header**. This repository reads the header:

```
  cross-check: raw XDR  vs  the API's JSON
    ✓ ledgerSeq      xdr=29284238  json=29284238
    ✓ totalCoins     xdr=100000000000.0000000  json=100000000000.0000000
    ✓ feePool        xdr=11780946.8629664  json=11780946.8629664
    ✓ baseFee        xdr=100000  json=100000
    ✓ baseReserve    xdr=4900000  json=4900000
    ✓ ledgerVersion  xdr=28  json=28
```

A disagreement fails the run and is treated as a **finding**. The decoder also reads `inflationSeq`,
which the JSON does not expose at all. [`docs/FAQ-API-COULD-LIE.md`](docs/FAQ-API-COULD-LIE.md)

And the reader is demonstrably **not blind**: several other fields in the same header *did* change
between genesis and the head (`baseFee` 100 → 100000, `baseReserve` 100000000 → 4900000,
`maxTxSetSize` 100 → 1000), while `totalCoins` and `inflationSeq` did not move.
[`docs/VERIFICATION.md`](docs/VERIFICATION.md) §2a

---

## Every objection, in one table

| Objection | Answer | File |
|---|---|---|
| “Pi can mint unlimited coins.” | The cap is official and on-chain; the issuance operation was removed before genesis. | [`FAQ-INFINITE-MINT.md`](docs/FAQ-INFINITE-MINT.md) |
| “Everything was minted at genesis, so it is fake.” | Pi says so itself; pre-mint is an allocation, not recurring issuance. | [`FAQ-PREMINTED-AT-GENESIS.md`](docs/FAQ-PREMINTED-AT-GENESIS.md) |
| “Only a fraction migrated — the rest is fake.” | Total ≠ circulating. Pi names the live figure separately. | [`FAQ-TOTAL-VS-EFFECTIVE.md`](docs/FAQ-TOTAL-VS-EFFECTIVE.md) |
| “You are just trusting the API.” | The summary is cross-checked against the raw signed header. | [`FAQ-API-COULD-LIE.md`](docs/FAQ-API-COULD-LIE.md) |
| “The fee pool grows — that is inflation.” | It is a separate header field, defined as fees paid. | [`FAQ-FEE-POOL.md`](docs/FAQ-FEE-POOL.md) |
| “The Whitepaper mentions future inflation.” | Correct — and the claim is scoped to the observable present. | [`FAQ-FUTURE-INFLATION.md`](docs/FAQ-FUTURE-INFLATION.md) |
| “You cannot see ledger 1.” | Correct. The bound is ledger 2, stated openly. | [`FAQ-LEDGER-1-MISSING.md`](docs/FAQ-LEDGER-1-MISSING.md) |

All of them, plus the category errors: [`docs/FAQ-ALL-OBJECTIONS.md`](docs/FAQ-ALL-OBJECTIONS.md).

---

## Try to break it

The claim is designed to be falsified, and there are exactly four ways. One live witness from the first
three ends it:

| | Falsifier | Test |
|---|---|---|
| **F1** | A ledger whose `total_coins` is not the cap | `node examples/supply-check.mjs --samples 40` |
| **F2** | An operation that creates native π | `node examples/op-check.mjs` |
| **F3** | A header/JSON disagreement | `node examples/xdr-header.mjs <SEQ>` |
| **F4** | A protocol change that re-enables issuance | anticipated, not denied |

Submit with four items — which falsifier, the artifact, the raw response, the command — using
`.github/ISSUE_TEMPLATE/audit-finding.md`. If it stands, the claim is corrected and the correction is
published **with the finding attached**. [`docs/FALSIFICATION.md`](docs/FALSIFICATION.md)

---

## Repository layout

```
README.md                        this file
PROOF.md                         the proof, end to end
docs/
  SCOPE.md                       the exact claim, its limits, formal appendix
  SOURCES.md                     every official source, verbatim, revision-pinned
  FALSIFICATION.md               F1–F5, non-falsifiers, submission process
  VERIFICATION.md                the verification layers
  AUDIT-REQUEST.md               an open request to break the claim
  THREAT-MODEL.md                what is defended, what is not
  INDEX.md                       the full map
  FAQ-*.md                       one file per objection
examples/
  lib.mjs                        HTTP client, exact π arithmetic, helpers
  xdr.mjs                        a strict XDR reader for the ledger header
  xdr-header.mjs                 decode the raw header, cross-check the API
  supply-check.mjs               sweep the range for the cap
  op-check.mjs                   the operation vocabulary
  self-test.mjs                  the test suite
  check-links.mjs                internal link checker
  run-all.mjs                    everything, one verdict
  regenerate-snapshots.mjs       regenerate the recorded evidence
  *-output.txt                   generated evidence (never hand-edited)
```

---

## Official sources

| Source | Pin |
|---|---|
| Pi Network — *Mainnet Migrations Roadmap & Tokenomics* | published **2025-04-17** |
| Pi Whitepaper | version dated **2021-12-28** |
| Stellar Docs — *Ledger header fields* | page updated **2026-05-27** |
| Pi Mainnet API (the chain) | live head at retrieval: ledger **29,284,239** |

Verbatim quotes and what the sources deliberately do **not** say: [`docs/SOURCES.md`](docs/SOURCES.md).
Third-party mirrors, aggregators and “supply” dashboards are **not** used as sources anywhere here.

---

## Honest limitations

- The sweep is a **sample** (70 of ~29.28 M ledgers). The *proof* is the protocol rule; the sweep
  corroborates it. [`docs/VERIFICATION.md`](docs/VERIFICATION.md) §3
- The claim’s lower bound is **ledger 2**, because ledger 1 is not served.
- `total_coins` is a **header field**, not a re-derived sum of account balances.
- **Circulating supply** is a different number, computed off-ledger, and is not claimed.
- Pi’s Whitepaper **reserves the question of future inflation** — so the claim is about the current
  protocol and the observable present, never about eternity.
- A **node is still trusted**: query more than one endpoint, or run your own.

---

## License and disclaimer

Code and text: **MIT** — see [`LICENSE`](LICENSE). Citations of Pi Network and Stellar documentation
remain the property of their authors.

**Not financial advice.** This repository makes no claim about price, value, or merit, and is not
affiliated with Pi Network or the Stellar Development Foundation. See [`DISCLAIMER.md`](DISCLAIMER.md).
