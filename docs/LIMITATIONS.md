# Limitations

This file exists so nobody has to guess which parts of StockBack are real. Read it before
the demo, not after.

## What is genuinely real

- **SGQR parsing.** `packages/sgqr` implements nested EMVCo TLV decoding and CRC-16/CCITT
  validation locally. Invalid lengths and bad checksums are rejected, not tolerated.
- **Market data.** `/api/quote` calls the public OKX v5 ticker endpoint server-side. No
  API key, no order placement.
- **Quote signing and verification.** Quotes are EIP-712 signed off-chain and verified
  on-chain. The router recomputes the fee split itself, so a compromised signer still
  cannot change the economics.
- **Settlement.** `StockBackRouter.settle` moves a real ERC-20 on X Layer, splits it three
  ways, and records the invoice. A recorded sample is
  [0xbea6…2bb9](https://www.okx.com/web3/explorer/xlayer-test/tx/0xbea6e47f944132bd5b2cfe6c2d4612948830a2f9da01a229c7725c6808b22bb9)
  (block 41869095).
- **The reward ledger.** Credit, backing checks and claims are all on-chain, and the
  contract refuses to pay a claim it does not hold tokens for.

## What is a demo stand-in

- **The merchant registry.** An SGQR payload identifies a PayNow proxy or UEN. It contains
  no wallet address and never will. The mapping from identifier to settlement address is an
  operator-maintained allowlist representing merchant consent. It is seeded with three
  fictional merchants.
- **The payment token.** `DemoUSD` is a mintable six-decimal test token. It is not a
  stablecoin, is not redeemable, and has no issuer.
- **The reward token.** `MockXNVDA` is a test token named so that no one can mistake it for
  an xStock. It carries no exposure to NVIDIA, no equity rights, and no redemption. The app
  displays an official xStock address only if one is explicitly configured, and otherwise
  labels the balance a mock in the interface itself.
- **The treasury.** Reward backing is deposited by an operator wallet. There is no
  automated purchase of tokenized equity.

## What is deliberately out of scope

- **No fiat leg.** Nothing in this project pays a merchant in SGD. There is no PayNow
  transfer, no bank integration, and no claim that a merchant receives fiat.
- **No custody.** The app never holds user funds. It never sees a private key. The router
  holds reward backing only, and cannot touch a user's wallet beyond the allowance they
  approve for a single payment.
- **No OKX trading.** No `POST /trade/order`, no Earn automation, no CEX-to-chain
  replenishment. Only public market data is read.
- **No claim of eligibility.** Tokenized equities are subject to jurisdictional
  restrictions. Nothing here asserts that a Singapore user may legally receive xStocks.

## Spend Guard is a policy, not an oracle

Spend Guard compares the quoted mark of the payment asset against a cost basis the user
typed in and stored on their own device. It is:

- **unrealized**, not realized. It describes a paper loss versus a self-reported basis.
- **client-side**. The contract has no knowledge of it and does not enforce it.
- **overridable**. Blocking is the default, the reason is explained in words, and the user
  can proceed deliberately.

Any description of Spend Guard as on-chain loss protection would be false.

## Economics

The 2% spread funds everything: 1% goes to the protocol reserve, 1% funds the cashback.
This is user-funded cashback, not yield-funded. Yield on the reserve would be supplementary
and is not implemented. The contract does not create value out of nothing, and the fee is
disclosed on the review screen before signing rather than buried.

## Known rough edges

- Only one ERC-20 settles on-chain. Other assets are selectable so Spend Guard can be
  demonstrated against a volatile basis, which is the point of the policy.
- OKX rate limits can push a quote onto the pinned fallback price table. When that happens
  the quote is flagged as degraded in the UI rather than silently served.
- The reward ledger mirror on the rewards tab falls back to local state when no router is
  configured or no wallet is connected, and says which source it is showing.
