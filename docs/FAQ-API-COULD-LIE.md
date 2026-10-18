---
layout: faq
faq_question: "You are just trusting the API — it could report any total_coins it wants."
faq_answer: "The API's summary is a cross-check, not the source: header_xdr is decoded byte by byte, and those bytes are bound to the network locally — sha256(header) equals the ledger hash, and adjacent headers are linked by SHA-256. A disagreement, or a broken link, exits non-zero and is called a finding. The decoder reads fields the JSON never exposes, including inflationSeq. What remains trusted — the node you query, and the anchor hash for the chain — is named honestly, with the mitigation stated."
---
# FAQ — “You are just trusting the API”

> **Objection.** “`total_coins` comes from an API response. The API can say whatever it wants. This
> proves nothing.”

---

## Short answer

Correct that an API is not a proof on its own — which is exactly why the API’s summary is **not** what
this repository reads.

Every ledger response carries **two** things: `total_coins`, a string the API produced, and
`header_xdr`, the ledger header as **raw bytes** in base64. This repository decodes the second one,
binds it to the network locally with SHA-256, and refuses to pass unless the two agree.

---

## 1. What the API returns

```bash
curl -s https://api.mainnet.minepi.com/ledgers/29284883 | head -c 400
```

You get a JSON object containing, among other fields:

- `"total_coins": "100000000000.0000000"` — a convenience string,
- `"header_xdr": "AAAAIA..."` — the raw ledger header,
- plus `protocol_version`, `fee_pool`, `base_fee_in_stroops`, and so on.

Any of the convenient fields can be wrong. The `header_xdr` bytes cannot be wrong about *themselves*
without breaking the hash chain: their SHA-256 must equal the ledger hash, and each header must commit
to the previous one. Note carefully that the SCP signature inside the header does **not** cover
`totalCoins` — it covers the `StellarValue` — so the guarantee here is the **hash chain**, not a
signature over the supply number.

---

## 2. What this repository does with it

`examples/xdr.mjs` is a small, strict XDR reader for the `LedgerHeader` structure. It walks the header
field by field — version, previous hash, the SCP value, then the fixed tail that holds `totalCoins`,
`feePool`, `inflationSeq`, `idPool`, `baseFee`, `baseReserve`, `maxTxSetSize` — and stops exactly when
the structure ends.

`examples/xdr-header.mjs` then prints both readings side by side and **exits non-zero on any
disagreement**:

```
  cross-check: raw XDR  vs  the API's JSON
    ✓ ledgerSeq      xdr=29284883  json=29284883
    ✓ totalCoins     xdr=100000000000.0000000  json=100000000000.0000000
    ✓ feePool        xdr=11781341.4931664  json=11781341.4931664
    ✓ maxTxSetSize   xdr=1000  json=1000
    ✓ baseFee        xdr=100000  json=100000
    ✓ baseReserve    xdr=4900000  json=4900000
    ✓ ledgerVersion  xdr=28  json=28
```

A disagreement is treated as a **finding** (falsifier **F3**), not a footnote.

But the cross-check on its own only compares two things the *same server* produced. The stronger check
is local. In Stellar the ledger hash **is** `sha256(serialised header)`, so:

```bash
node examples/hash-chain.mjs
```

recomputes `sha256(header_xdr)` with `node:crypto` and compares it against the reported ledger hash,
then verifies that each header’s `previousLedgerHash` equals the SHA-256 of the previous header’s bytes
— with **no value taken from the API**. A break is a finding (**F6**), and the run fails.

---

## 3. Two things the JSON cannot give you

The decoder is not a stunt. It also reads a field the API does not expose:

| Field | From JSON | From raw XDR | Why it matters |
|---|---|---|---|
| `totalCoins` | ✓ | ✓ | cross-check |
| `feePool` | ✓ | ✓ | fee sink, not issuance |
| **`inflationSeq`** | ✗ | ✓ | **the issuance counter — 0** |

`inflationSeq` is the number of times the protocol’s issuance operation has ever run on this ledger.
It reads **0**.

---

## 4. The decoder is strict on purpose

Failing loudly is the whole point:

- a buffer that is too short **throws with the exact byte offset** — it never returns a wrong number;
- a length field larger than its declared maximum is **rejected**, not trusted;
- a `StellarValue` extension the reader does not know is **rejected** instead of skipped.

This is the opposite of the forgiving behaviour that would let a corrupted response look like a valid
one. The self-test covers all of these paths offline:

```bash
node examples/self-test.mjs --offline
```

---

## 5. You do not have to use this code at all

The number is public. Two `curl` commands answer the question without a single line from this
repository:

```bash
curl -s https://api.mainnet.minepi.com/ledgers/2 | grep -o '"total_coins":"[^"]*"'
curl -s https://api.mainnet.minepi.com/ledgers?order=desc\&limit=1 | grep -o '"total_coins":"[^"]*"'
```

---

## 6. What is still trusted — stated plainly

Removing the API from the trust path is not the same as having no trust path. Being precise about what
is left:

| Residual trust | Mitigation |
|---|---|
| **The node you query** reports the chain honestly | The hash chain makes a fabricated header require a fabricated chain behind it, but the *anchor* hash still comes from the node. Query more than one independent endpoint; or run and query your own Pi node |
| The **anchor** hash is honest | Recompute the chain from any ledger hash you already trust; obtain that anchor from a second, independent source |
| The **encoding** `base64` is standard | It is; and `Buffer.from(x, "base64")` is in the Node standard library |
| **Stellar’s header layout** is as documented | Cited verbatim in `docs/SOURCES.md` §S3, and the decode is cross-checked against the API’s independent decode on every run |

If you distrust the node, the fix is to run one — not to distrust the number.
