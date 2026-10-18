---
layout: faq
faq_question: "Pi can mint unlimited coins — the supply is not capped."
faq_answer: "It is capped, officially and on-chain. Pi documents a maximum supply of 100 billion π, and every ledger header examined — from genesis (ledger 2, 2020-12-31) to the live head — reports total_coins of exactly 100000000000.0000000. The protocol's only native-issuance operation, inflation, was removed at Protocol 12 in 2019, before Pi's genesis (as documented), and the header's issuance counter reads 0."
---
# FAQ — “Pi can mint unlimited coins”

> **Objection.** “There is no real cap. Pi can mint as much as it wants, so the ‘100 billion’ is
> marketing.”

---

## Short answer

**There is a cap, it is official, and you can read it off the chain in one request.**

- Pi documents a **maximum supply of 100 billion π** (`docs/SOURCES.md` §S1, §S2).
- Every ledger this repository has read — from genesis to the head — reports
  `total_coins = 100000000000.0000000`.
- The one protocol mechanism that could ever increase that number was **removed before Pi existed**.

---

## 1. The official statement

Pi Network, *Mainnet Migrations Roadmap & Tokenomics* (2025-04-17):

> “**The Maximum Supply of Pi is 100 billion tokens.** The Maximum Supply is comprised of the following:
> 65 Billion tokens (or 65%) are allocated for all community mining rewards; 10 billion (10%) are
> allocated for foundation reserves; 5 billion (5%) are allocated for liquidity purposes; and 20
> billion (20%) are allocated for the Core Team.”

The Pi Whitepaper (v2021-12-28) says the same thing in its own words:

> “the Mainnet supply model has a **clear maximum total supply of 100 billion Pi**”

Two independent official documents, one number.

---

## 2. The on-chain measurement

| What | Value |
|---|---|
| Earliest ledger served | **2** (2020-12-31T22:47:31Z) |
| `total_coins` there | `100000000000.0000000` |
| Live head at retrieval | **29,284,884** (2026-10-18T21:08:55Z) |
| `total_coins` there | `100000000000.0000000` |
| Ledgers sampled across the whole range | **70** |
| Ledgers **not** at the cap | **0** |

Check it yourself in one line, no code, no trust:

```bash
curl -s https://api.mainnet.minepi.com/ledgers/2 | grep -o '"total_coins":"[^"]*"'
curl -s https://api.mainnet.minepi.com/ledgers?order=desc\&limit=1 | grep -o '"total_coins":"[^"]*"'
```

---

## 3. Why the number cannot move — the protocol reason

Stellar’s documentation of the ledger header states it plainly (`docs/SOURCES.md` §S3):

> “**Inflation sequence** — Number of times inflation has been run. Note: the inflation operation was
> **deprecated** when validators voted to upgrade the network to **Protocol 12** on 10/28/2019.
> Therefore, inflation no longer runs, so this sequence number no longer changes.”

So: `inflation` was the protocol’s only native-issuance operation. It was switched off **fourteen
months before Pi’s genesis ledger**, and Pi runs **Protocol 28**.

This repository does not ask you to take that reasoning on faith. It **decodes the raw header** and
prints the counter:

```
inflationSeq    : 0   (issuance counter — JSON does not expose this)
```

```bash
node examples/xdr-header.mjs
```

---

## 4. “But what about the fee pool?”

The fee pool grows. That is **not** issuance — it is a separate field in the same header, defined as
fees paid, and `total_coins` does **not** move while it grows. See `docs/FAQ-FEE-POOL.md`.

---

## 5. “But the Whitepaper mentions future inflation”

It does, and this repository says so up front. See `docs/FAQ-FUTURE-INFLATION.md` — the claim here is
scoped to the **observable present**, not to eternity.

---

## 6. What would prove this FAQ wrong

One ledger whose `total_coins` is not exactly `100000000000.0000000`. That is falsifier **F1** in
`docs/FALSIFICATION.md`, and there is an issue template for submitting it.
