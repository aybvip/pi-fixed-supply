---
name: Falsifier / finding
about: Something here is wrong, or you have found a witness that breaks the claim.
title: "[F1] "
labels: ["finding"]
---

<!--
Thanks for taking the time. Four things make a submission triageable. Without them it
cannot be checked, and it will be sent back rather than argued with.
-->

## 1. Which falsifier

<!-- F1 ledger off the cap · F2 supply-creating operation · F3 header/JSON disagreement ·
     F4 protocol change enabling issuance · F5 pre-genesis ledger · wording · citation -->

- [ ] **F1** — a ledger whose `total_coins` is not `100000000000.0000000`
- [ ] **F2** — an operation that creates native π / raises `total_coins`
- [ ] **F3** — the API's `total_coins` differs from the ledger's raw `header_xdr`
- [ ] **F4** — a protocol change that re-enables native issuance
- [ ] **F5** — a pre-genesis (ledger 1) signed header that disagrees
- [ ] **wording** — a sentence claims more than `docs/SCOPE.md` §1
- [ ] **citation** — an official quote is wrong, mis-transcribed, or stale

## 2. The exact artifact

<!-- A ledger sequence, a transaction hash, a header hash, or the document + section. -->

```
```

## 3. The raw response

<!-- Paste the curl output. Not a screenshot, please. -->

```bash

```

```json

```

## 4. The command you ran

<!-- Byte-for-byte, so it can be reproduced. -->

```bash

```

## 5. Anything else

<!-- Optional. What you expected, and what you saw instead. -->
