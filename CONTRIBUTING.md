---
layout: default
title: "CONTRIBUTING"
---

# CONTRIBUTING

> This repository makes one narrow, measurable claim. Contributions that sharpen it, falsify it, or
> correct it are welcome. Contributions that broaden it are not.

---

## 1. The house rules

1. **English only.** All files, comments, commit messages and issues.
2. **Measure, do not opine.** If a disagreement can be settled by reading the chain, read the chain and
   paste the output. “I think” is not a finding.
3. **Never weaken a test to make it pass.** `examples/self-test.mjs` asserts things on purpose. If a
   check fails, the check is right and something else is wrong.
4. **Never broaden the claim.** `docs/SCOPE.md` §1 is the whole claim. If your change makes the README
   read as if it claims more, that is a regression.
5. **Official sources only.** Pi Network and Stellar documentation, or the chain itself. No aggregators,
   no exchanges, no social posts, no forks. Third-party material is flagged as unofficial if mentioned
   at all.
6. **Read-only, always.** `GET` only. Nothing in this repository may sign, spend, or broadcast. No code
   that asks for a key, a seed, or a wallet connection will be merged.
7. **Zero runtime dependencies.** Node 18+ standard library only. This is a feature, not a limitation.
8. **When the objector is right, concede.** Several objections in `docs/FAQ-*.md` are factually correct
   about the chain. Say so, then show what it does and does not change.

---

## 2. What makes a good contribution

| Kind | Example |
|---|---|
| **A falsifier** | A ledger whose `total_coins` is not the cap — `docs/FALSIFICATION.md` |
| **A correctness fix** | The XDR reader mis-parses a legitimate header |
| **A wording fix** | A sentence that reads as claiming more than `docs/SCOPE.md` §1 |
| **A citation fix** | An official quote that is mis-transcribed or has gone stale |
| **A new verification layer** | A check that makes the claim harder to be wrong about |
| **A new objection** | A real argument not already covered in `docs/FAQ-ALL-OBJECTIONS.md` |

---

## 3. What will be declined

- Anything that weakens a check, loosens a bound, or turns a hard failure into a warning.
- Anything that expands the claim into circulating supply, allocation, price, or consensus.
- Anything that requires a dependency.
- Anything that writes to the network, or asks a user for credentials of any kind.
- Promotion, price talk, or “awareness” content.
- Rewordings that make the claim sound stronger than the evidence.

---

## 4. Adding a new objection

The pattern is one file per objection, linked from three places:

1. **Create** `docs/FAQ-<SHORT-NAME>.md` with front matter:

   ```yaml
   ---
   layout: faq
   faq_question: "The objection, as one sentence."
   faq_answer: "The one-paragraph answer, including the honest limit."
   ---
   ```

2. **Link it** from `docs/FAQ-ALL-OBJECTIONS.md` (the catalogue table).
3. **Link it** from `README.md` (the objections table).

Every FAQ file must contain, at minimum: a short answer, the relevant measurement or citation, and a
“what would prove this wrong” line pointing at a falsifier.

---

## 5. Adding or changing a check

- Put shared logic in `examples/lib.mjs` or `examples/xdr.mjs`, not inline.
- Add **offline** unit tests to `examples/self-test.mjs` for anything pure. Offline tests must run with
  no network: `node examples/self-test.mjs --offline`.
- If the check belongs in the full suite, wire it into `examples/run-all.mjs`.
- Regenerate evidence rather than editing it by hand:

  ```bash
  node examples/regenerate-snapshots.mjs
  ```

- Keep the run polite: bounded concurrency, and the client already backs off on `429`.

---

## 6. Before you open a pull request

```bash
node examples/run-all.mjs        # everything must pass
node examples/self-test.mjs --offline
```

Then confirm:

- [ ] `run-all.mjs` exits 0.
- [ ] No test was weakened or skipped.
- [ ] Nothing in the diff broadens the claim in `docs/SCOPE.md` §1.
- [ ] Every new link resolves from the file that contains it.
- [ ] Any new quotation is verbatim and pinned in `docs/SOURCES.md` §0.
- [ ] English only; no credentials, no `POST`, no new dependency.

---

## 7. Commit messages

Plain and specific. State what changed and, where it matters, the **evidence**:

```
supply-check: sample 70 ledgers instead of 40

Adds a denser logarithmic sweep over the first 10^3 ledgers, where a
supply change would be cheapest to hide. 70 ledgers read, 0 deviations,
range 2 .. 29284239.
```

---

## 8. Reporting instead of contributing

You do not need to write code to be useful. A finding submitted with four items — which falsifier, the
artifact, the raw response, and the command — is exactly as valuable as a patch. See
`docs/AUDIT-REQUEST.md` §6.
