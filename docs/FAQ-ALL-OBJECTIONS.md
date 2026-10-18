---
layout: default
title: "FAQ — every objection, and where each one is answered"
---

# FAQ — every objection, and where each one is answered

> One page listing the arguments against “Pi’s total supply is fixed”, each with a one-line answer and a
> link to the document that handles it properly.

---

## 0. How objections are handled here

Two rules, applied without exception:

1. **Measure, do not opine.** If a question can be settled by reading the chain, this repository reads
   it and prints the result. Arguments about what “should” be true are not evidence.
2. **When the objector is factually right, concede and then show what it does and does not change.**
   Several objections below are correct on the facts and wrong only about the consequence.

---

## 1. The catalogue

| # | Objection | One-line answer | Full answer |
|---|---|---|---|
| 1 | “Pi can mint unlimited coins — there is no real cap.” | The cap is official and on-chain; the issuance operation was removed before Pi’s genesis. | `FAQ-INFINITE-MINT.md` |
| 2 | “All 100 billion were minted at genesis, so it is fake.” | Pi states it in its own words; pre-mint is an allocation, not recurring issuance. | `FAQ-PREMINTED-AT-GENESIS.md` |
| 3 | “Only a fraction has migrated, so the 100 billion is fake.” | Total ≠ circulating. Pi names the live figure separately (Effective Total Supply). | `FAQ-TOTAL-VS-EFFECTIVE.md` |
| 4 | “You are just trusting the API.” | The API’s summary is cross-checked against the raw consensus-signed header; a mismatch fails the run. | `FAQ-API-COULD-LIE.md` |
| 5 | “The fee pool keeps growing — that is inflation.” | `fee_pool` is a separate header field defined as fees paid; `total_coins` does not move. | `FAQ-FEE-POOL.md` |
| 6 | “The Whitepaper says inflation may be needed later.” | Correct — and the claim is scoped to the observable present. Listed as falsifier F4. | `FAQ-FUTURE-INFLATION.md` |
| 7 | “You cannot even see the first ledger.” | Correct. The lower bound is ledger 2, stated openly; ledger 1 returns `410`. | `FAQ-LEDGER-1-MISSING.md` |
| 8 | “The Core Team holds 20% — so it is not really fixed/ fair.” | An allocation inside a fixed total is not an issue of supply. Out of scope. | `SCOPE.md` §4 |
| 9 | “Only a few nodes mine, so the chain is centralised.” | A consensus question, not a supply question. Not claimed either way. | `SCOPE.md` §4 |
| 10 | “Price is down, so this is nonsense.” | Price is not part of the claim. `DISCLAIMER.md`. | — |
| 11 | “A cap does not prove anything about value.” | Agreed — and stated in `FAQ-PREMINTED-AT-GENESIS.md` §5. | `FAQ-PREMINTED-AT-GENESIS.md` |
| 12 | “Someone could change it with a protocol upgrade.” | Yes — that is falsifier F4, anticipated rather than denied. | `FAQ-FUTURE-INFLATION.md` |

---

## 2. The three objections that are *correct* on the facts

Worth isolating, because they are the ones that should change how the claim is read:

| Objection | What is right about it | What it does **not** change |
|---|---|---|
| **#2** — pre-minted at genesis | Everything. Pi says so verbatim. | It does not imply further issuance; the total has not moved since. |
| **#6** — future inflation is reserved | Everything. It is in the Whitepaper. | It is a reserved **question**, with no adopted protocol behind it today. |
| **#7** — ledger 1 is unreadable | Everything. It returns `410`. | The claim’s bound is ledger 2 — stated, not hidden. |

If someone opens with one of these three and stops, there is nothing to argue about: they are right, the
repository already agrees, and the disagreement is only over what follows from it.

---

## 3. The objections that are category errors

These are not wrong about the chain. They are answers to **different questions**, and the repository
names the mismatch rather than pretending to win:

- **Circulating supply** (#3) — a different quantity, defined by Pi, computed off-ledger.
- **Allocation** (#8) — who holds what inside a fixed total.
- **Consensus / centralisation** (#9) — how blocks are produced.
- **Price** (#10) — a market outcome.

None of these can falsify “`total_coins` is constant”. See `docs/FALSIFICATION.md` §2 for the full list
of what does and does not count as a falsifier.

---

## 4. The one-line summary of the whole repository

> **The total native supply is exactly 100,000,000,000 π on every ledger from 2 to the head, and no
> operation in the current protocol increases it. Everything else — circulation, allocation, price,
> consensus — is a different question, and this repository says which is which.**
