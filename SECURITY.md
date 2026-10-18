---
layout: default
title: "SECURITY"
---

# SECURITY

> This repository holds no funds, no keys and no credentials, and it cannot write to any network. The
> realistic risks are therefore **being wrong** and **being impersonated**.

---

## 1. What this repository is, security-wise

| Property | Value |
|---|---|
| Network access | **`GET` only** — no writes, no signing, no broadcasting |
| Secrets handled | **None** — no keys, seeds, mnemonics, tokens, or credentials |
| Privileged access | **None** |
| Dependencies | **None** beyond the Node 18+ standard library |
| Data exfiltration risk | **None** — the only outbound host is `api.mainnet.minepi.com` |
| Wallet connection | **Never required** |

**If a copy of this material asks you to connect a wallet, enter a seed phrase, approve a transaction or
sign anything, it is not this repository.** Refuse and report it.

---

## 2. Reporting a correctness issue

A wrong claim is the most serious defect this project can have. If you can break the central claim, that
is a finding — and it is wanted.

Open a GitHub issue using `.github/ISSUE_TEMPLATE/audit-finding.md` with:

1. **Which falsifier** — F1–F5 (see `docs/FALSIFICATION.md`), or `wording` / `citation`.
2. **The exact artifact** — ledger sequence, transaction hash, header hash, or document.
3. **The raw response** — `curl` output; not a screenshot.
4. **The command you ran.**

If it stands, the claim or the code is corrected and the correction is published **with the finding
attached**.

---

## 3. Reporting a security-sensitive issue

Use **GitHub’s private vulnerability reporting** on this repository (Security → *Report a vulnerability*)
if the issue is one of:

- material that could be used to **impersonate** this project or mislead users about what it claims;
- a way to make the tooling **write** to a network, sign, or leak anything from a user’s machine;
- a dependency or build-path problem that could compromise a user running `run-all.mjs`.

Please do **not** open a public issue for those. Everything else is fine in public.

There is no bug bounty. There is nothing of value here to steal — only the accuracy of the claim.

---

## 4. What is out of scope

Not security issues, and not handled here:

- disagreement about price, value, or investment merit (see `DISCLAIMER.md`);
- the security of Pi Network, its nodes, or its API — report that to them;
- the security of your own machine or network;
- objections about circulating supply or allocation (see `docs/SCOPE.md` §4).

---

## 5. Hardening notes for users

Small things that make a run trustworthy:

- **Read the code before running it.** It is short, dependency-free, and the only I/O is in
  `examples/lib.mjs`.
- **Prefer the offline half** when you only want to check the logic:
  `node examples/self-test.mjs --offline` makes no network requests at all.
- **Check the version you are running.** The evidence snapshots in `examples/*-output.txt` record what
  the code produced; regenerating them shows whether your copy agrees.
- **Do not trust a single node.** Query more than one endpoint, or run your own Pi node. This is stated
  as a limitation in `docs/AUDIT-REQUEST.md` §5.
