---
layout: default
title: "Official Sources — verified"
---

# Official Sources — verified

> All quotes below are transcribed **verbatim** from Pi Network / Stellar official documentation.
> Third-party mirrors, blog posts and aggregators are **not** used as sources anywhere in this
> repository.

---

## 0. Version pinning — the exact revision of every source used

Links rot and pages change silently, so each source is pinned as tightly as its form allows. All were
retrieved and cross-checked on **2026-10-18**.

| # | Source | Pin | Date of the pinned revision |
|---|---|---|---|
| S1 | **Pi Network** — blog, *Mainnet Migrations Roadmap & Tokenomics* | `minepi.com/blog/mainnet-migrations-roadmap-and-tokenomics/` | published **2025-04-17** |
| S2 | **Pi Network** — Whitepaper (Mainnet chapter) | `minepi.com/white-paper/` | version dated **2021-12-28** |
| S3 | **Stellar Docs** — *Ledger header fields* | `developers.stellar.org/docs/learn/fundamentals/stellar-data-structures/ledgers` | page updated **2026-05-27** |
| S4 | **Pi Mainnet API** (the chain itself) | `api.mainnet.minepi.com` | live head at retrieval: ledger **29,284,239**, closed **2026-10-18T20:15:10Z** |

The API is listed as a source on purpose. Four of the claims here are **measured**, not quoted, and the
measurement is the primary evidence.

---

## S1 — Pi Network: the Maximum Supply and its allocations

🔗 https://minepi.com/blog/mainnet-migrations-roadmap-and-tokenomics/
Published **2025-04-17** by Pi Network.

> **“The Maximum Supply of Pi is 100 billion tokens.** The Maximum Supply is comprised of the following:
> 65 Billion tokens (or 65%) are allocated for all community mining rewards; 10 billion (10%) are
> allocated for foundation reserves; 5 billion (5%) are allocated for liquidity purposes; and 20
> billion (20%) are allocated for the Core Team. Each allocation mentioned above tracks the community
> Migrated Mining Rewards issuance pace, so the proportions of each allocation in the total supply
> remains the same at any given time.”

And, in the same paragraph group — the sentence that pre-empts the most common objection:

> **“This remains true despite the fact that all tokens were minted at the genesis as technically
> required by the blockchain protocol.”**

This is the single most important quote in this repository. Pi **discloses**, in its own words, that
the full 100 billion π existed at genesis. That is not a leak and not a discovery — it is a documented
property of the supply model.

---

## S2 — Pi Network: the Whitepaper

🔗 https://minepi.com/white-paper/ — Mainnet chapter, version dated **2021-12-28**.

On the cap:

> “Hence, given the current network size of over 30 million Pioneers and the expected volume of
> transactions and activities in the future, the Mainnet supply model has a **clear maximum total
> supply of 100 billion Pi** allowing incentivizations of continued growth and new contributions while
> removing the concerns about the unpredictability of the supply.”

On the distribution principle:

> “Thus, given a total max supply of 100 billion Pi, the community will eventually receive 80 billion Pi
> and the Core Team will eventually receive 20 billion Pi.”

On the pre-Mainnet state (why “undefined supply” was the *status quo ante*):

> “The option to cap the supply of Pi was not exercised before Mainnet, therefore leaving the total
> supply undefined.”

On the pre-mint at genesis:

> “In other words, the livenet will **pre-mint in its genesis block** all account holder balances
> generated during Phase 1, and continue operating just like the current system but fully
> decentralized.”

And the sentence that sets the honest upper bound on this repository’s claim:

> “Also, in the future, for the health of the network and ecosystem, **the network may face questions
> such as whether there needs to be any inflation after the completion of the distribution of the 100
> Billion Pi.** The inflation may be necessary to further incentivize contributions through more
> mining rewards, make up for any loss of Pi from circulation due to accidents or death, provide for
> more liquidity, mitigate hoarding that inhibits usage and utility creation, etc. At that time, the
> foundation and its committees specialized in these matters will organize and guide the community to
> reach a conclusion on the matter in a decentralized way.”

> ⚠️ **Read that last paragraph carefully.** Pi reserves the *right to consider* future inflation, to be
> decided by the community. This is exactly why the claim here is worded **“no operation in the
> network’s current protocol increases it”** and **“on every observable ledger”** — not “the supply can
> never change”. See `docs/FAQ-FUTURE-INFLATION.md`.

---

## S3 — Stellar Docs: what the ledger-header fields mean

🔗 https://developers.stellar.org/docs/learn/fundamentals/stellar-data-structures/ledgers
Page updated **2026-05-27** by Justin Rice.

> **“Total coins** — Total number of lumens in existence.”

> **“Fee pool** — Number of lumens that have been paid in fees. Note this is denominated in lumens,
> even though a transaction’s fee field is in stroops.”

> **“Inflation sequence** — Number of times inflation has been run. Note: the inflation operation was
> deprecated when validators voted to upgrade the network to Protocol 12 on 10/28/2019. Therefore,
> inflation no longer runs, so this sequence number no longer changes.”

These three definitions are what make the measurement meaningful:

- `total_coins` is defined as a **stock** (“in existence”), not a flow.
- `fee_pool` is **separate** from `total_coins` — fees are a sink, not issuance. See
  `docs/FAQ-FEE-POOL.md`.
- `inflation sequence` is the **issuance counter**, and the documentation states plainly that it no
  longer changes because the mechanism is gone.

> Note on naming: Stellar’s documentation describes lumen (XLM) because that is the reference
> implementation. Pi Mainnet runs the same ledger-header structure; the field it reports as
> `total_coins` is this one, and `examples/xdr-header.mjs` decodes it from the wire bytes.

---

## S4 — The chain itself (measured, not quoted)

The public Pi Mainnet API, `https://api.mainnet.minepi.com`, read-only (GET only).

| Observation | Value |
|---|---|
| Earliest ledger served | **2** — closed **2020-12-31T22:47:31Z**; `total_coins = 100000000000.0000000` |
| Ledger 1 | **not served** — HTTP `410 Gone` |
| Live head at retrieval | **29,284,239** — closed **2026-10-18T20:15:10Z**; `total_coins = 100000000000.0000000` |
| Ledgers sampled across the full range | **70** — **0** deviations from the cap |
| `fee_pool` at ledger 2 | `0.0000000` |
| `fee_pool` at the head | `11780946.9229664` — monotonically increasing |
| Protocol versions in the sampled range | `0, 15, 18, 19, 21, 24, 25, 26, 28` |
| `inflationSeq` (decoded from raw XDR) | **0** |
| `totalCoins` (decoded from raw XDR) | **1000000000000000000** stroops = 100,000,000,000 π |

Reproduce all of it with:

```bash
node examples/run-all.mjs
```

---

## S5 — What the primary sources do **not** say

Recorded so that nobody can attribute a stronger claim to this repository than the sources support:

| Not in any official source | Consequence |
|---|---|
| That the **circulating** supply is 100 billion π | It is not. Pi defines **Effective Total Supply** = Migrated Mining Rewards ÷ 65%. |
| That the **supply can never change** | The Whitepaper explicitly leaves future inflation open for community decision (S2). |
| That `total_coins` equals the sum of all account balances | Never stated anywhere. Not claimed here. |
| That mined π and bought π differ on-chain | A separate repository’s subject; not assumed here. |
| A per-ledger statement about **when** each allocation unlocks | Publish-side information, not a ledger field. |

---

## S6 — Unofficial or secondary material (explicitly not relied on)

For completeness, the following classes of source are **not** used as evidence anywhere here:

- exchanges, price aggregators, and “supply” dashboards (they report *circulating* figures, defined by
  the reporter, and change their methodology silently);
- social-media posts, including from Pi Network accounts;
- forks, mirrors and third-party copies of Pi’s documentation;
- this repository’s own prose.

If a claim here cannot be traced to **S1–S4**, treat it as out of scope.
