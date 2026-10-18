---
layout: faq
faq_question: "All 100 billion π were minted at genesis — doesn't that prove it is fake?"
faq_answer: "Pi states it in its own documentation: 'all tokens were minted at the genesis as technically required by the blockchain protocol'. Genesis pre-minting is an allocation, and the Whitepaper had already described it ('the livenet will pre-mint in its genesis block all account holder balances'). It does not imply recurring issuance, and it does not imply circulation — but it does mean the total supply figure says nothing about adoption or value, and this repository says that plainly."
---
# FAQ — “Everything was minted at genesis”

> **Objection.** “If all 100 billion π already existed at block 2, then it is not a real chain and the
> supply number is meaningless.”

---

## Short answer

Pi **says this itself**, in its own published words. It is a documented property of the supply model,
not a discovery and not a leak.

What it **does** imply: nothing has been added since genesis.
What it **does not** imply: circulation, adoption, or value.

---

## 1. Pi says it, first

From *Mainnet Migrations Roadmap & Tokenomics* (2025-04-17):

> “This remains true despite the fact that **all tokens were minted at the genesis** as technically
> required by the blockchain protocol.”

And the Whitepaper (v2021-12-28) had already described the mechanism years earlier:

> “In other words, the livenet will **pre-mint in its genesis block** all account holder balances
> generated during Phase 1, and continue operating just like the current system but fully
> decentralized.”

So the objection and the official documentation agree on the fact. They disagree only on what it means.

---

## 2. Why the model works this way

The Pi Mainnet is a Stellar-based chain, and in the Stellar model native value is not emitted by a
recurring “block reward” operation. The ledger carries a **stock** field — Stellar defines it as
“Total number of lumens in existence” — and what changes over time is **who holds** it, not how much
of it there is.

That gives two different questions that people routinely merge:

| Question | Answer here |
|---|---|
| Does the total increase over time? | **No** — one number, unchanged on every ledger examined |
| Does it *circulate*? | A **different** question, answered off-ledger — see `docs/FAQ-TOTAL-VS-EFFECTIVE.md` |

---

## 3. “In existence” is not “in circulation”

This is the part of the objection that is **fair**, and it is worth stating plainly rather than
deflecting:

- Holding 100 billion units of a capped stock, by itself, is **no evidence of adoption, users, volume,
  liquidity or value**. It is one number in a header.
- If someone reads “100 billion π exist” as “100 billion π are being used”, they are wrong, and this
  repository does not claim that.
- Pi’s own term for the live, migrating figure is **Effective Total Supply**, and it is **smaller** and
  computed differently (Migrated Mining Rewards ÷ 65%).

So the honest summary is: *the cap is real and the total is fixed; the size of the number is not a
virtue.*

---

## 4. What would actually falsify the supply claim

Not the pre-mint. **A post-genesis increase.** Two concrete tests:

```bash
node examples/supply-check.mjs --samples 40   # any ledger off the cap
node examples/op-check.mjs                    # any issuance-looking operation
```

Neither has fired, across the entire observable range.

---

## 5. The uncomfortable conclusion, stated openly

Pre-minting everything at genesis means the on-chain supply figure **cannot** distinguish a thriving
network from a dormant one. Anyone using this repository to argue “therefore Pi has value” is
misquoting it. The claim is narrow: **the total is capped and constant.** That is all.
