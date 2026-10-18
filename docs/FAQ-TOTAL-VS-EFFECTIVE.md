---
layout: faq
faq_question: "The total is 100 billion but only a fraction has migrated — so the rest is fake."
faq_answer: "Those are two different quantities, and Pi names both: Maximum Supply (the fixed cap of 100 billion π) and Effective Total Supply (a live figure equal to the Migrated Mining Rewards divided by 65%). This repository proves only the first. Neither number is 'fake'; the error is treating a cap as a circulating figure."
---
# FAQ — Total supply vs “Effective Total Supply”

> **Objection.** “There are 100 billion π on the ledger but only a few billion have migrated. So most of
> it does not exist, and the 100 billion is fake.”

---

## Short answer

**Total ≠ circulating.** This repository proves the **cap**, not the **circulating** amount. Pi defines
the circulating figure separately, and calls it the **Effective Total Supply**.

Conflating the two is the single most common error in this argument — in both directions.

---

## 1. Pi defines both numbers, in the same paragraph

From *Mainnet Migrations Roadmap & Tokenomics* (2025-04-17) (`docs/SOURCES.md` §S1):

> “**The Maximum Supply of Pi is 100 billion tokens.**”

> “The **Effective Total Supply of Pi** — the total Pi supply at the current time — proportions the
> allocations the same as the Maximum Supply. Since every allocation tracks the Migrated Mining Rewards
> of the community, the Effective Total Supply can be **calculated by dividing the current Migrated
> Mining Rewards of Pi on the Mainnet blockchain by 65%**.”

So:

| Term | Meaning | Where it comes from |
|---|---|---|
| **Maximum Supply** | the fixed cap: 100,000,000,000 π | documented **and** measured on-chain |
| **Effective Total Supply** | Migrated Mining Rewards ÷ 65% | computed from a **migrated** figure, off this repository’s scope |
| **Circulating supply** | whatever a given tracker says | third-party methodology; changes silently; not a ledger field |

---

## 2. What this repository claims, exactly

> Pi’s **total** native supply is exactly 100,000,000,000 π on every observable ledger.

That is a statement about **one header field**, and it is proven by measurement
(`docs/VERIFICATION.md`). It is **not** a statement that 100 billion π are in circulation, spendable,
unlocked, or held by anyone in particular.

If you want the circulating number, this repository is the wrong tool, and it says so in
`docs/SCOPE.md` §4.

---

## 3. “But that means the cap is meaningless”

It means the cap is a **cap**. Caps are like that.

The cap does real work, though. It implies three things that are separately checkable:

1. **Nothing is created over time.** `total_coins` never rises — F1, F2.
2. **No allocation can exceed its share by minting more.** The 65/10/5/20 split is a split of a fixed
   total.
3. **The quantity of “unmigrated” π is bounded.** Whatever is not yet migrated has to come out of the
   existing 100 billion, not from new issuance.

If the objection is “the unmigrated portion is not yet usable”, that is **correct and uncontroversial** —
it is what “unmigrated” means. It is not a supply defect, because no new supply is being created to
cover it.

---

## 4. What would make the objection stick

Show that the total can grow. Concretely:

- a ledger with `total_coins` above `100000000000.0000000` (falsifier **F1**), or
- an operation that increases it (falsifier **F2**).

Neither has been found. `node examples/supply-check.mjs` re-tests F1 on every run.

---

## 5. The honest one-liner

> **100 billion π exist. How many of them are in circulation is a different question, with a different
> answer, that this repository does not claim.**
