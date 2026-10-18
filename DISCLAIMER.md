---
layout: default
title: "DISCLAIMER"
---

# DISCLAIMER

> Short version: this repository is a **measurement**, not advice, and it is not affiliated with anyone.

---

## 1. Not financial advice

Nothing in this repository is financial, investment, legal, accounting or tax advice, and nothing here
is a recommendation to buy, sell, hold, transfer or value any asset.

This repository makes exactly one kind of claim: a statement about a **number in a ledger header**. It
says **nothing** about:

- whether Pi has value, will have value, or should have value;
- price, liquidity, exchange listings, or market behaviour;
- the merits, legality, or risk of holding or trading it;
- the quality, honesty, or competence of any party.

If you are looking for an investment opinion, this is the wrong repository and it does not contain one.

---

## 2. No affiliation

This project is **independent**. It is not affiliated with, endorsed by, sponsored by, or connected to:

- Pi Network, Pi Core Team, SocialChain Inc., PiBit, or the Pi Foundation;
- the Stellar Development Foundation.

All names and trademarks belong to their respective owners. Official documentation is **quoted** with
attribution and revision pins (`docs/SOURCES.md`); quoting a document is not a claim of endorsement.

---

## 3. Read-only, and no keys

| | |
|---|---|
| Network operations | **`GET` only.** Nothing is signed, broadcast, or written. |
| Keys, seeds, mnemonics, wallets | **Never requested, never used.** |
| Wallet connection | **Never required.** Verification needs none. |
| Dependencies | **None** beyond Node 18+ standard library. |
| Data collected | **None.** The only outbound requests are to `api.mainnet.minepi.com`. |
| Donations / payments | **None.** Nothing here asks for anything. |

**If a copy of this material asks you to connect a wallet, enter a seed phrase, or sign anything, it is
not this repository. Refuse.** See `docs/THREAT-MODEL.md` §5.

---

## 4. Accuracy, and how it is bounded

The measurements here are reproducible and the tools fail loudly when a claim breaks. That said:

- The sweep is a **sample**, not an enumeration of every ledger.
- The lower bound is **ledger 2**, because ledger 1 is not served.
- A **node is still trusted** — the data is only as good as the endpoint you query.
- Official sources are quoted **as pinned**; if a source changes, the pin in `docs/SOURCES.md` shows what
  was cited and when.

If something here is wrong, that is a **finding**, and `docs/FALSIFICATION.md` §4 describes how to
submit it. Corrections are published with the finding attached.

---

## 5. Verbatim quotes and third-party content

Quotations from Pi Network and Stellar documentation are reproduced verbatim for citation and
verification, under the ordinary expectation of attribution and fair quotation. Copyright in those
documents remains with their authors. Remove or amend them if required by the rights holder.

The **code and original text** of this repository are licensed under MIT — see `LICENSE`.

---

## 6. Limitation of liability

The software and documentation are provided **“as is”**, without warranty of any kind. The authors are
not liable for any claim, damages or other liability arising from the use of this material. See the
`LICENSE` for the full text.
