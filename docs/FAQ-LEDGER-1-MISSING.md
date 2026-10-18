---
layout: faq
faq_question: "You cannot even see the first ledger, so 'since genesis' is an overclaim."
faq_answer: "Fair, and the claim does not say genesis. Ledger 1 is not served (HTTP 410), so the lower bound of every claim here is ledger 2, closed 2020-12-31, which already reports total_coins at the cap and an inflationSeq of 0. The unobserved gap is one ledger wide, and its existence is stated rather than papered over."
---
# FAQ — “You cannot see ledger 1”

> **Objection.** “You claim the supply has been at the cap ‘since genesis’, but you cannot even read the
> first ledger. Your bound is made up.”

---

## Short answer

**Correct, and the word “genesis” is not used in the claim.** The claim says *“on every observable
ledger”*, and the lower bound of “observable” is **ledger 2**, closed **2020-12-31T22:47:31Z**.

What ledger 1 does is not silent: the API returns an explicit error.

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://api.mainnet.minepi.com/ledgers/1
# 410
```

---

## 1. What is actually observable, and what it says

`node examples/xdr-header.mjs 2` decodes the raw header of the earliest ledger served:

```
  ledger            : 2
  closed_at         : 2020-12-31T22:47:31Z
  header hash       : af5e4f8ad2331ddec839022a70278c808f1a1ad2782fdc9dd1542fca165f8947

    totalCoins      : 1000000000000000000 stroops  =  100000000000.0000000 π
    feePool         : 0 stroops  =  0.0000000 π
    inflationSeq    : 0
```

Three facts at the earliest observable point:

1. `totalCoins` **already equals the cap** — 100,000,000,000 π.
2. `feePool` is **exactly 0** — the chain has collected no fees yet.
3. `inflationSeq` is **exactly 0** — the issuance counter has never been incremented.

---

## 2. Why fact 3 largely closes the gap anyway

`inflationSeq` is a **counter of how many times issuance has run**, and it is carried forward in every
header. Reading `0` at ledger 2 means no issuance event had occurred **by that point** — including any
event in the unobserved interval between ledger 1 and ledger 2.

So the unobserved window is not a hole where a hidden event could be hiding unnoticed. For the gap to
conceal an issuance, the counter would have to have been **reset**, and nothing in the protocol
documentation describes such a reset. The honest residue is:

> Ledger 1’s own `totalCoins` value is not observed. We cannot print it, and we do not pretend to.

---

## 3. Does the bound actually matter?

Less than it sounds. The cap is a **maximum**. For the claim to fail, a ledger would need a total
**above** the cap — and the first observable ledger is already exactly at it, with a counter of 0. The
remaining possibilities are:

| Scenario | Effect on the claim |
|---|---|
| Ledger 1 also at the cap | Nothing. Consistent. |
| Ledger 1 *below* the cap | Nothing about “no increases” — it would imply the cap was *set* between 1 and 2 |
| Ledger 1 **above** the cap | The cap is not a cap. **This is falsifier F5.** |

F5 is listed, with what evidence would be needed to trigger it, in `docs/FALSIFICATION.md`.

---

## 4. If you have ledger 1, please share it

This is a genuine, standing request — not a rhetorical one. If you can produce, from any independent
source:

- a signed header for ledger 1, or
- a checkpoint, archive export, or node dump containing it,

then either the claim is unaffected (still ≤ cap) or it is **falsified** (above the cap). Both outcomes
are useful, and the submission process is four lines long: `docs/FALSIFICATION.md` §4.

---

## 5. The honest one-liner

> **The claim’s lower bound is ledger 2, because that is the earliest ledger the network serves. The
> boundary is stated in `SCOPE.md` rather than hidden behind the word “genesis”.**
