---
layout: default
title: "AUDIT REQUEST — please try to break this"
---

# AUDIT REQUEST — please try to break this

> This repository makes one measurable claim. It has **not** been independently audited. This file is a
> standing, specific request to attack it.

---

## 1. Status

| | |
|---|---|
| Independently audited | ❌ **No.** It has only been checked by its author. |
| Peer reviewed | ❌ No. |
| Bug bounty | ❌ None. There is nothing of value here to protect. |
| Self-tested | ✅ Yes — `node examples/run-all.mjs` |
| Reproducible without the author | ✅ Yes — five minutes, see §3 |

The absence of an independent audit is stated everywhere it matters, on purpose. A green check mark from
the author is not an audit.

---

## 2. Attack the falsifiers first

Do not start with the prose. Start with the five things that would make the claim false — they are
cheap to test and they are listed in full in `docs/FALSIFICATION.md`:

| | Attack | Command |
|---|---|---|
| **F1** | Find a ledger whose `total_coins` is not the cap | `node examples/supply-check.mjs --samples 40 --from 2` |
| **F2** | Find an operation that creates native π | `node examples/op-check.mjs` |
| **F3** | Find a header/JSON disagreement | `node examples/xdr-header.mjs <SEQ>` |
| **F4** | Show a protocol change that re-enables issuance | read `docs/FAQ-FUTURE-INFLATION.md` |
| **F6** | Find a header that does not hash to its ledger hash, or a broken chain link | `node examples/hash-chain.mjs` |

One working witness from F1–F3 or F6 ends the claim. F4 is anticipated and listed as legitimate.

---

## 3. Reproduce everything in about five minutes

No accounts, no keys, no install. Node 18+ and a network connection.

```bash
git clone <this repository>
cd pi-fixed-supply
node examples/run-all.mjs
```

That runs six checks — the internal link check, header decode + cross-check, the SHA-256 hash-chain
verification, the range sweep, the operation vocabulary, and the self-test — and prints one verdict. If
you have no Node at all:

```bash
curl -s https://api.mainnet.minepi.com/ledgers/2                       | grep -o '"total_coins":"[^"]*"'
curl -s https://api.mainnet.minepi.com/ledgers?order=desc\&limit=1     | grep -o '"total_coins":"[^"]*"'
```

Both must print `"total_coins":"100000000000.0000000"`.

---

## 4. Where a serious critique would land

In rough order of value:

1. **A live deviation (F1).** A ledger off the cap is the whole game.
2. **A missed issuance path (F2).** If some operation raises the total, the protocol argument in
   `docs/SCOPE.md` §3 is incomplete and should be rewritten.
3. **A decoder bug (F3).** `examples/xdr.mjs` is hand-written. If it mis-parses a header in a way that
   makes a wrong number look right, that is a serious defect — and the cross-check against the API’s
   independent decode, plus the independent SHA-256 hash binding in `examples/chain.mjs`, are the
   defences, so an error there is interesting.
4. **A wording overclaim.** If any sentence here reads as claiming more than `SCOPE.md` §1, that is a
   documentation bug and worth filing. `SCOPE.md` §4 exists to make such a claim easy to refute.
5. **A wrong citation.** If an official quote is mis-transcribed or stale, `docs/SOURCES.md` §0 pins
   every revision precisely so this can be checked and corrected.

---

## 5. Known limitations — stated before anyone finds them

| Limitation | Consequence |
|---|---|
| The sweep is a **sample** (70 of ~29.28M ledgers), not an enumeration | The *proof* is the protocol rule; the sweep corroborates it |
| **Ledger 1 is unreadable** (`410`) | The claim’s lower bound is ledger 2 |
| `total_coins` is a **header field**, not a sum of account balances | Never claimed to be a sum |
| **Circulating supply** is not derived | Out of scope by design |
| **Future protocol changes** could re-enable issuance | Falsifier F4; explicitly open |
| The **node you query** provides the **anchor** hash | Mitigation: the hash chain is verified locally, but the anchor still comes from the node — use multiple independent endpoints, or run your own node |
| The tooling only **reads** (GET); it cannot detect a network split | A minority-chain view is indistinguishable from here |

---

## 6. How to submit a finding

Open an issue using `.github/ISSUE_TEMPLATE/audit-finding.md` and include:

1. which falsifier (F1–F6), or “wording” / “citation” for the documentation-level findings;
2. the exact artifact — ledger sequence, transaction hash, header hash, or document;
3. the raw response (`curl` output, not a screenshot);
4. the command you ran.

A submission with those four items gets triaged as a **finding**. If it stands, the claim or the code is
corrected and the correction is published **with the finding attached** — including the case where the
finding is wrong and the reasoning for saying so.
