---
layout: faq
faq_question: "The Whitepaper says inflation may be needed later — so the supply is not really fixed."
faq_answer: "Correct, and this repository says so up front rather than hiding it. Pi's Whitepaper reserves the question of future inflation for a later community decision. That is exactly why the claim is scoped to 'no operation in the network's current protocol' and 'on every observable ledger' — a statement about the measurable present, not a promise about eternity. A documented protocol change enabling issuance is listed as legitimate falsifier F4."
---
# FAQ — “The Whitepaper mentions future inflation”

> **Objection.** “Pi’s own Whitepaper says inflation may be needed after the 100 billion is distributed.
> So the supply is not fixed at all — you are overclaiming.”

---

## Short answer

**You are right, and the claim is written to survive exactly that.** This is the strongest honest
objection to a naïvely worded supply claim, and it is why the wording here is narrow:

> *“Pi’s total native supply is exactly 100,000,000,000 π on **every observable ledger**, and no
> operation in the network’s **current protocol** increases it.”*

Not “the supply can never change”. Not “forever”. The **measured present**.

---

## 1. What the Whitepaper actually says

From the Pi Whitepaper (v2021-12-28) — `docs/SOURCES.md` §S2, quoted in full so it cannot be
cherry-picked:

> “Therefore, the token model is subject to tweaking before the Open Network period starts. Also, in the
> future, for the health of the network and ecosystem, **the network may face questions such as whether
> there needs to be any inflation after the completion of the distribution of the 100 Billion Pi.** The
> inflation may be necessary to further incentivize contributions through more mining rewards, make up
> for any loss of Pi from circulation due to accidents or death, provide for more liquidity, mitigate
> hoarding that inhibits usage and utility creation, etc. At that time, the foundation and its
> committees specialized in these matters will organize and guide the community to reach a conclusion
> on the matter in a decentralized way.”

Three things are notable:

1. It is a **question**, not a decision. “may face questions such as whether…”, “will organize and guide
   the community to reach a conclusion”.
2. It is tied to a **precondition**: “after the completion of the distribution of the 100 Billion Pi”.
3. It is explicitly **decentralised**: the foundation “will organize and guide the community”.

---

## 2. Why this does not damage the claim

The claim has two clauses, and this objection touches only the second:

| Clause | Scope | Status |
|---|---|---|
| “total native supply is exactly 100,000,000,000 π **on every observable ledger**” | the measurable present | ✅ proven by measurement |
| “no operation in the network’s **current protocol** increases it” | today’s operation set | ✅ `inflationSeq = 0`; no issuance operation exists |

Both clauses are about **now**. Neither says anything about a future protocol the community has not
adopted. If Pi later adopts a protocol that mints, **this repository becomes wrong about that clause and
will say so** — that is falsifier **F4** in `docs/FALSIFICATION.md`, and it is listed as legitimate
rather than rejected.

---

## 3. A false version of this objection

The same objection is often stated in a stronger form that the source does **not** support:

> ❌ “Pi is going to inflate the supply, it says so in the Whitepaper.”

The Whitepaper does not say that. It reserves the **right to consider** the question, at an unspecified
future point, after distribution completes, by a decentralised community process. Treating a reserved
question as a scheduled action is not reading the source; it is replacing it.

---

## 4. How to tell the difference, mechanically

Both versions are testable, and the difference is measurable:

```bash
node examples/xdr-header.mjs        # inflationSeq = 0 today
node examples/supply-check.mjs      # total_coins = the cap on every sampled ledger
```

The day `inflationSeq` moves above 0, or `total_coins` moves at all, the tools here will fail loudly.
Until then, the second clause holds — and *only* until then.
