---
layout: faq
faq_question: "The fee pool keeps growing, so the supply is growing too."
faq_answer: "The fee pool is a separate ledger-header field, defined by Stellar as the number of units paid in fees. While it grows from 0 at genesis to about 11.78 million π at the head, total_coins stays at exactly 100 billion. Fees move value out of balances into a pool; they do not create it."
---
# FAQ — “The fee pool grows, so supply grows”

> **Objection.** “You say the supply never changes — but `fee_pool` climbs by millions. That is
> new coins being created.”

---

## Short answer

`fee_pool` and `total_coins` are **two different fields in the same header**, and Stellar defines them
separately:

> **“Total coins** — Total number of lumens in existence.”
>
> **“Fee pool** — Number of lumens that have been paid in fees. Note this is denominated in lumens,
> even though a transaction’s fee field is in stroops.”
> — *Ledger header fields*, Stellar Docs (updated 2026-05-27) — `docs/SOURCES.md` §S3

A fee pool that grows while the total stays put is exactly what you would see if **fees are moved out
of balances and into the pool** — a transfer, not a mint.

---

## 1. The measurement

| Ledger | Closed | `fee_pool` | `total_coins` |
|---|---|---|---|
| **2** (genesis) | 2020-12-31T22:47:31Z | `0.0000000` | `100000000000.0000000` |
| 6,588,955 | 2023-01-07T11:28:50Z | `72456.8500100` | `100000000000.0000000` |
| **29,284,239** (head) | 2026-10-18T20:15:10Z | `11780946.9229664` | `100000000000.0000000` |

The fee pool went from **zero** to **~11.78 million π** across the same ledgers on which the total did
not move by a single stroop.

```bash
node examples/supply-check.mjs --samples 40
```

---

## 2. Why a growing fee pool is not issuance

Think about what a fee actually is. You pay it; it leaves your balance. Nothing is credited to anyone
else in exchange for it — that is the point of a fee. The protocol records the accumulated fees in a
dedicated field so that they are accounted for rather than silently disappearing.

So the two fields tell a consistent story:

- **`total_coins`** — how much native value exists: **constant**.
- **`fee_pool`** — how much of it has been paid in fees: **growing**.

If fees *were* issuance, you would expect the opposite: `total_coins` rising as fees accumulate. It does
not. And if you want the structural reason fees cannot be issuance, it is the same one as everywhere
else in this repository — the only native-issuance operation was removed at Protocol 12
(`docs/SOURCES.md` §S3), and the header’s `inflationSeq` reads **0**.

---

## 3. An easy way to check the direction of travel

The fee pool only ever goes **up** in the samples, and there is no operation that pays fees *back*:

```
         2  2020-12-31T22:47:31Z  fee_pool = 0.0000000
   6588955  2023-01-07T11:28:50Z  fee_pool = 72456.8500100  (+)
  29284239  2026-10-18T20:15:10Z  fee_pool = 11780946.9229664  (+)
```

A field that can only rise and is defined as “already paid” is a **sink**, not a source.

---

## 4. What would change this conclusion

If `total_coins` ever moved in step with `fee_pool` — rising by roughly the same amount — the objection
would be right. Falsifier **F1** is precisely that test, and it has not fired.
