---
layout: default
title: "SCOPE — What this repository proves (and what it does **not**)"
---

# SCOPE — What this repository proves (and what it does **not**)

> A standalone, precise statement of the exact claim made here, its limits, and how **anyone** can
> verify it **independently** — without trusting the author.

---

## 0. Purpose

This file exists to draw a **sharp line** between:

- **what is actually proven** (a protocol property plus a live, repeatable measurement), and
- **what is *not* claimed** (circulating supply, unlock schedules, price, distribution, or that the
  supply can never change under any future protocol).

Every claim below is either (a) a **verbatim official source**, or (b) a **live on-chain test you can
run yourself** with zero dependencies.

---

## 1. The precise claim (one sentence)

> **“Every ledger header examined on Pi Mainnet reports `totalCoins` = 100,000,000,000 π, and the
> chain shows no issuance operation and no increment of the issuance counter — consistent with the
> documented protocol rule that removed native issuance before Pi’s genesis.”**

This is a statement about the ledgers observed and the protocol version verified. It does **not** mean
that 100 billion π is in circulation, and it does **not** claim that a future protocol change is
impossible. That is the whole claim. No more, no less.

### 1.1 Three different claims — do not blend them

| # | Claim | Status |
|---|---|---|
| **A** | `totalCoins` = 100,000,000,000 π on every ledger examined | ✅ **Measured** (70-ledger live sweep, decoded from raw XDR) |
| **B** | **A specific ledger’s** supply can be read and checked by anyone from its raw header bytes, which are tied by SHA-256 to the network’s hash chain | ✅ **Verifiable** (`examples/xdr-header.mjs`, `examples/hash-chain.mjs`) |
| **C** | **Circulating / “effective”** supply, unlock schedules, per-account distribution, price | ❌ **Not claimed** (see §4) |

A constant header field is **not**, on its own, an economic proof. Claim A is a measurement; the step
to “the protocol cannot increase it” is a separate, weaker statement — **documented and observed**,
not proven from protocol source code — and §3 says so explicitly.

If someone says “so you proved there are 100 billion π in circulation” — that is **Claim C**, and this
repository does not make it. Pi itself calls that number the **Effective Total Supply** and defines it
differently (see `docs/FAQ-TOTAL-VS-EFFECTIVE.md`).

---

## 2. The exact object being measured

On Pi Mainnet, every **ledger header** carries a field the public API exposes as `total_coins` and the
raw header stores as `totalCoins`. Stellar’s own documentation defines it as:

> **“Total coins — Total number of lumens in existence.”**
> — *Ledger header fields*, Stellar Docs (updated 2026-05-27)

Two things follow, and both matter:

1. This is a **single consensus-maintained number in the header**. It is **not** produced by adding up
   every account balance in this repository, and this repository does **not** claim it equals such a sum.
2. The unit is **stroops**. On Pi, 1 π = 10,000,000 stroops — a scale this repository *derives from the
   chain itself*, not from documentation: the header reports `totalCoins = 1000000000000000000`
   stroops while the documented cap is `100,000,000,000` π, and 10¹⁸ ÷ 10¹¹ = 10⁷.

---

## 3. Why the number is expected — and observed — not to move (documented + observed)

Stellar’s ledger-header documentation says of the adjacent field:

> **“Inflation sequence — Number of times inflation has been run. Note: the inflation operation was
> deprecated when validators voted to upgrade the network to Protocol 12 on 10/28/2019. Therefore,
> inflation no longer runs, so this sequence number no longer changes.”**
> — *Ledger header fields*, Stellar Docs (updated 2026-05-27)

`inflation` was the protocol’s only native-issuance operation. Pi Mainnet’s genesis is **ledger 2,
closed 2020-12-31T22:47:31Z** — fourteen months *after* inflation was removed — and the chain reports
`protocolVersion = 28` at the head. The header’s `inflationSeq` is **0** on every ledger decoded here.

So the expected behaviour is: `totalCoins` is a protocol constant on Pi. This repository does not ask
you to accept that reasoning. It **measures the number** instead.

### 3.1 The honest limit, and the monitor that follows from it

None of the above is a proof *from protocol source code* that no code path anywhere can write to
`totalCoins`. It is a **documented rule** plus an **observation** that the chain behaves as the rule
predicts: `inflationSeq` = 0, and no issuance-looking operation in the sampled vocabulary.

A protocol upgrade that re-enabled issuance would be a **legitimate falsifier** (F4), not a
contradiction — and it would be **observable**, because any such change requires a protocol version
bump, and the version lives in the very header this repository decodes (`ledgerVersion`, cross-checked
against the API’s `protocol_version`). So the claim is not “nothing can ever change”; it is “nothing
has changed on the ledgers and protocol version observed, and the next run will say so if it does.”

---

## 4. What is **not** proven (read this before quoting the claim)

| Not claimed | Why |
|---|---|
| **Circulating supply** is 100 billion π | It is not. Pi defines a separate **Effective Total Supply** = *Migrated Mining Rewards ÷ 65%* — an off-ledger figure. Total ≠ circulating. |
| The **unlock / migration schedule** | Published by Pi, not derivable from `total_coins`. Out of scope. |
| The **distribution** across allocations (65 / 10 / 5 / 20) | That is an allocation policy. This repository shows the *total* is capped, not who holds what. |
| That the **sum of all account balances** equals `total_coins` | We read the header field. We do **not** re-derive it by summing accounts. |
| That supply is **impossible to change forever** | Pi’s own Whitepaper explicitly reserves the question of *future* inflation. See `docs/FAQ-FUTURE-INFLATION.md`. The claim is about the **observable present**. |
| Ledgers **before ledger 2** | Ledger 1 is not served by the public API (`410 Gone`). The claim’s lower bound is ledger 2. See `docs/FAQ-LEDGER-1-MISSING.md`. |
| **Price**, scarcity, or investment merit | Nothing here is financial advice. See `DISCLAIMER.md`. |

---

## 5. The one-sentence falsifier

> **Any ledger whose `total_coins` — or whose raw `totalCoins` — is not exactly
> `1000000000000000000` stroops (100,000,000,000 π) falsifies Claim A.**

That is the whole test. `examples/supply-check.mjs` sweeps for it, and `examples/xdr-header.mjs` reads
it out of the raw header. The full list of falsifiers, rejected non-falsifiers and the submission
process live in `docs/FALSIFICATION.md`.

---

## 6. Independent verification — no trust in the author

| Level | What you check | Command | Cost |
|---|---|---|---|
| **0** | Everything, in one shot | `node examples/run-all.mjs` | ~1 min |
| **1** | The raw header of one ledger, cross-checked against the API | `node examples/xdr-header.mjs` | 1 request |
| **1b** | The raw headers, hashed and chained locally with `node:crypto` | `node examples/hash-chain.mjs` | ~17 requests |
| **2** | The whole observable range | `node examples/supply-check.mjs --samples 40` | ~70 requests |
| **3** | Which operation types the network runs | `node examples/op-check.mjs` | ~12 requests |
| **4** | The suite’s own tests, including the XDR reader and every failure path | `node examples/self-test.mjs` | ~10 requests |
| **5** | No Node at all | `curl https://api.mainnet.minepi.com/ledgers/2` and read `total_coins` | 1 request |

Level 5 is the important one: the claim does not depend on this repository’s code. It depends on a
number the network publishes.

---

## 7. Formal appendix (for readers who want it spelled out)

Let **H** be the set of ledger headers served by the public API, i.e. ledger sequences `2 … head`.
Let **tc(h)** be the `totalCoins` field read from the raw bytes of header **h**
(`examples/xdr-header.mjs`), and **tc′(h)** the same field as reported by the API’s JSON.
Let **b(h)** be the base64-decoded bytes of header **h**, and **H(h)** the ledger hash the API reports.

**Claim A.** ∀ h ∈ H : tc(h) = 10¹⁸ stroops.

**Claim (cross-check).** ∀ h : tc(h) = tc′(h) — i.e. the API’s convenient summary does not disagree
with the header it summarises. Tested on every ledger the tooling decodes; a disagreement is treated as
a **finding**, not a footnote, and the tool exits non-zero.

**Claim (issuance counter).** ∀ h : `inflationSeq(h)` = 0 — the protocol’s issuance operation has never
run on Pi.

**Claim (hash binding).** ∀ h : sha256(b(h)) = H(h); and for adjacent h, h′ with seq(h′) = seq(h) + 1:
`previousLedgerHash(h′)` = sha256(b(h)). Checked locally with `node:crypto` (`examples/chain.mjs`),
using no value the API computed.

**Evidence.**

| Layer | Statement | Kind |
|---|---|---|
| Protocol | The only native-issuance operation was removed at Protocol 12 (2019-10-28); Pi genesis is 2020-12-31 | Documented, cited in `docs/SOURCES.md` |
| Header | `totalCoins` = 10¹⁸ and `inflationSeq` = 0, read from raw XDR | Measured |
| Bytes | sha256(header) = the ledger hash, and adjacent headers chain by SHA-256 | Measured, local (`node:crypto`) |
| Observation | 70 ledgers spanning the entire observable range, 0 deviations | Measured, repeatable |

**Falsifier.** ∃ h ∈ H : tc(h) ≠ 10¹⁸ stroops. A single witness makes Claim A false, and
`docs/FALSIFICATION.md` describes exactly how to submit it.

**Open, and honestly labelled.** This appendix reasons about the behaviour of the Stellar protocol as
documented. It does not attempt to prove, from source code, that no code path anywhere can ever write
to `totalCoins`, and a constant header field is not by itself an economic proof. That is why the claim
is stated as a measurement over the ledgers examined, backed by the hash binding above, rather than by
an appeal to authority.

---

## 8. Related documents

| File | What it is for |
|---|---|
| `README.md` | The short version, and how to run everything |
| `PROOF.md` | The proof, assembled end to end, with the evidence |
| `docs/SOURCES.md` | Every official source, quoted verbatim, with revision pins |
| `docs/VERIFICATION.md` | The verification layers, and exactly what each script asserts |
| `docs/FALSIFICATION.md` | How to falsify this, and how to submit a falsifier |
| `docs/AUDIT-REQUEST.md` | An open request to attack the claim — with the limits stated up front |
| `docs/FAQ-*.md` | One file per objection |
