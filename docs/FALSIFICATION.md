---
layout: default
title: "FALSIFICATION — how to prove this repository wrong"
---

# FALSIFICATION — how to prove this repository wrong

> A claim you cannot falsify is not a claim, it is a slogan.
> This file lists every way to break the central claim, the ways that **do not** count, and how to
> submit a working falsifier.

---

## 0. The claim under attack

> **“Every ledger header examined on Pi Mainnet reports `totalCoins` = 100,000,000,000 π, and the
> chain shows no issuance operation and no increment of the issuance counter — consistent with the
> documented protocol rule that removed native issuance before Pi’s genesis.”**

Everything below is measured against that sentence. Nothing else in this repository needs to survive.

---

## 1. The falsifiers — any one of these wins

### F1 — A ledger whose total supply is not the cap ★ the strongest one

**Show one ledger, anywhere in the observable range, whose `total_coins` is not exactly
`100000000000.0000000`.**

- If it is **higher**, the supply grew and the claim is dead.
- If it is **lower**, the cap was not set at genesis and the claim is dead as worded.
- Case matters: the raw field must be exactly `1000000000000000000` stroops.

```bash
curl -s https://api.mainnet.minepi.com/ledgers/<SEQUENCE> | grep -o '"total_coins":"[^"]*"'
```

### F2 — An operation that increases the supply

**Show an operation type that creates native π**, or a transaction that raises `total_coins`.

In Stellar’s protocol the only such operation was `inflation`, removed at Protocol 12 (2019-10-28) —
before Pi’s genesis ledger. The header’s `inflationSeq` is 0. If you find a live operation with that
effect, the claim is dead.

```bash
node examples/op-check.mjs
```

### F3 — A disagreement between the API and the raw header

**Show a ledger where the API’s `total_coins` does not equal the `totalCoins` decoded from that
ledger’s own `header_xdr`.**

This would not falsify the supply figure, but it would falsify the cross-check this repository relies
on, and it would be a serious finding in its own right.

```bash
node examples/xdr-header.mjs <SEQUENCE>
```

### F4 — A protocol change that re-introduces issuance

**Show that Pi has adopted a protocol under which native supply can increase again.**

Pi’s own Whitepaper explicitly leaves this open for a future community decision
(`docs/SOURCES.md` §S2). If it happens, the claim’s second clause — “*in the network’s current
protocol*” — stops holding, and this repository must be updated. That is a **legitimate** falsifier and
it is anticipated, not denied.

### F5 — The supply was different before ledger 2

**Show a ledger, or a signed header, with a sequence below 2 and a different `total_coins`.**

The public API does not serve ledger 1 (`410 Gone`). If you have an independent source for it — a node
archive, a signed header, a published checkpoint — and it disagrees, that materially changes the
claim’s lower bound. See `docs/FAQ-LEDGER-1-MISSING.md`.

### F6 — A header that does not hash to its ledger hash, or a broken chain link

**Show a ledger whose `header_xdr` bytes do not satisfy `sha256(header) == hash`, or a header whose
`previousLedgerHash` does not equal the SHA-256 of the previous header’s bytes.**

Both are recomputed locally with `node:crypto`, with no value taken from the API. A break means the
served bytes are not the ones the network’s hash chain commits to — which would falsify the “raw
bytes” evidence this repository leans on, even if the reported supply figure were unchanged.

```bash
node examples/hash-chain.mjs
```

---

## 2. What counts as a falsifier — and what does not

| ✅ Counts | ❌ Does **not** count |
|---|---|
| A ledger sequence whose `total_coins` differs from the cap | “The price went down.” |
| A transaction that raises `total_coins` | “Only a fraction has migrated to Mainnet.” (That is circulating supply — Claim C, never made here.) |
| A header/JSON disagreement | “The Core Team has a large allocation.” (Disclosed; an allocation is not an issuance.) |
| A published protocol change that enables issuance | “The fee pool keeps growing, so supply is growing.” (Fees are a separate header field — `docs/FAQ-FEE-POOL.md`.) |
| A header that does not hash to its ledger hash, or a broken chain link | “Pi minted everything at genesis.” (Officially disclosed — `docs/SOURCES.md` §S1.) |
| A signed header for ledger 1 that disagrees | “Pi minted everything at genesis.” (Officially disclosed — `docs/SOURCES.md` §S1.) |
| — | “But there are only 100 billion, and Pi has users, so it is centralised.” (Different question.) |

The point of this table is that the **only** way to falsify the claim is to produce a **number from the
chain** (or a **documented protocol change**). Objections about price, allocation, centralisation or
circulating supply are answers to questions this repository does not ask.

---

## 3. Status — as of the last run

| Falsifier | Status | Evidence |
|---|---|---|
| **F1** ledger off the cap | 🟢 **not found** | 70 ledgers sampled across `2 … head`, 0 deviations |
| **F2** supply-creating operation | 🟢 **not found** | `inflationSeq = 0`; no issuance-looking op type in sample |
| **F3** header/JSON disagreement | 🟢 **not found** | Header decoded and cross-checked; all fields agree |
| **F4** protocol change enabling issuance | ⚪ **open by design** | Reserved in Pi’s Whitepaper; the claim is worded to survive this |
| **F5** pre-genesis discrepancy | ⚪ **unreachable** | Ledger 1 not served; lower bound is ledger 2 |
| **F6** header not hashing to its ledger hash, or a broken chain link | 🟢 **not found** | `sha256(header)` = the ledger hash on every header walked; all links verified |

`🟢 not found` means *sought and not found*, with the commands to re-sow the search. `⚪` means it is
out of reach or deliberately open — not that it was tested and passed.

---

## 4. How to submit a falsifier

Open a **GitHub issue** using the *falsifier* template (`.github/ISSUE_TEMPLATE/audit-finding.md`) and
include:

1. **Which falsifier** (F1–F6).
2. **The exact artifact** — a ledger sequence, a transaction hash, a header hash, or the document.
3. **The raw response**, not a screenshot. A `curl` of the endpoint is ideal.
4. **The command you ran**, so it can be reproduced byte for byte.

A submission that includes items 1–4 is triaged as a **finding**. The README and the claim above will
be corrected, not argued with. If the finding survives scrutiny, the correction is published with the
finding attached — the record matters more than the score.

---

## 5. Why this file exists

Three reasons, in order of importance:

1. **It makes the claim checkable, not impressive.** A reader who distrusts this repository entirely
   should still be able to extract a single number from the chain and know exactly what it would mean.
2. **It pre-commits to being wrong.** F1 and F2 are cheap to test. If the supply ever moves, the
   commands in this file will say so on the next run, without anyone having to notice.
3. **It separates the claim from the noise.** Most objections to “Pi’s supply is fixed” are actually
   objections about circulating supply, allocation or price. Naming those as **non-falsifiers** here
   keeps the argument honest on both sides.
