---
layout: default
title: "THREAT MODEL — what this repository does and does not defend"
---

# THREAT MODEL — what this repository does and does not defend

> Scope: this documentation and the scripts in `examples/`. It is a read-only proof repository, so the
> threat model is small — but stating it prevents both over-trust and pointless worry.

---

## 1. What this repository is

| Property | Value |
|---|---|
| Writes to the network | **None.** Every request is `GET`. |
| Holds keys, seeds, or credentials | **None.** |
| Spend, sign, or broadcast anything | **No.** |
| Runtime dependencies | **Zero.** Node 18+ standard library only. |
| Data sent anywhere | Only the HTTP requests you see in `examples/lib.mjs` — all to `api.mainnet.minepi.com` |
| Data stored | Nothing, except the snapshot files you explicitly regenerate |

If a copy of this repository asks for a key, a seed, a wallet connection, or a signature, **it is not
this repository**. See §5.

---

## 2. Assets, and who would want them

| Asset | Value to an attacker |
|---|---|
| The claim’s **credibility** | This is the only real asset. A wrong claim here is worse than no claim. |
| Nothing else | There are no funds, no keys, and no privileged access. |

So the adversary model is about **being wrong**, not about being robbed.

---

## 3. Threats to the claim, and the mitigation

| Threat | Mitigation in this repository |
|---|---|
| **A hidden issuance path** — some operation raises the total | The operation vocabulary is sampled (`op-check.mjs`); the header’s `inflationSeq` is read, not inferred; `total_coins` is measured on every sampled ledger |
| **The API lies** about `total_coins` | The raw `header_xdr` is decoded and cross-checked field by field; a disagreement fails the run |
| **The decoder is silently wrong** | It is strict — short buffers, over-long length fields and unknown extensions all throw with offsets — and it is unit-tested offline against synthetic headers, including a signed `StellarValue` |
| **A stale or wrong citation** | Every source is quoted verbatim and pinned by revision in `docs/SOURCES.md` §0 |
| **Overclaiming in the prose** | `SCOPE.md` §4 lists what is **not** claimed, and `docs/FALSIFICATION.md` §2 separates real falsifiers from category errors |
| **A change that goes unnoticed** | The claim is written so that `run-all.mjs` fails loudly if `total_coins` or `inflationSeq` moves |
| **Sampling misses a deviation** | The sweep is deliberately dense in early history, and its honesty about being a sample is in `docs/VERIFICATION.md` §3 |

---

## 4. Threats this repository does **not** address

Named so that a green run is not read as more than it is:

- **A malicious or split node.** Whatever the node you query reports is what you measure. Querying
  multiple independent endpoints reduces this; running your own node removes it.
- **A compromised machine.** If the host is owned, nothing here is meaningful.
- **A supply-chain attack on Node itself.** The scripts use only the standard library, which limits the
  surface, but the runtime is trusted.
- **Price, liquidity, legality, taxation, or investment merit.** Explicitly out of scope — see
  `DISCLAIMER.md`.
- **Off-chain balances.** App balances, exchange ledgers and internal databases are not visible here and
  are not claimed to match the chain.
- **Anything about identity or privacy.** Not a subject of this repository.

---

## 5. Impersonation

Because the claim is short and quotable, the realistic risk is not a bad actor changing the code — it is
a **copy** of this material being used to imply something stronger, such as investment merit.

| If someone tells you | The repository says |
|---|---|
| “Pi is a guaranteed investment” | Never claimed. `DISCLAIMER.md`. |
| “100 billion π are in circulation” | Never claimed. `FAQ-TOTAL-VS-EFFECTIVE.md`. |
| “The supply can never change” | Not claimed. `FAQ-FUTURE-INFLATION.md`. |
| “Buy Pi here” | This repository **cannot** buy, sell, hold or transfer anything. |
| “Connect your wallet to verify” | Verification needs **no wallet**. Refuse. |

---

## 6. Reporting a security or correctness issue

- **Correctness / wording:** open an issue — `.github/ISSUE_TEMPLATE/audit-finding.md`.
- **Something sensitive** (for example, material that could be used to impersonate this repository or
  mislead users): see `SECURITY.md`.

Both are welcome. Findings are published with the correction, not argued with.
