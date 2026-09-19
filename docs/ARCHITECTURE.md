# Architecture

## The one-paragraph version

A payer scans a Singapore SGQR code. The app decodes it locally, looks the merchant up in a
consent registry, prices the invoice against live OKX market data, and asks a server-side
signer for an EIP-712 quote. Spend Guard checks the quoted mark against the user's own cost
basis and blocks by default if the payment would realize a paper loss. On confirmation the
payer's wallet calls `StockBackRouter.settle` on X Layer, which verifies the quote, splits
the debit into merchant proceeds plus a disclosed 2% spread, and credits 1% back as a
tokenized-equity ledger entry the payer can later withdraw.

## Layout

```
apps/web                 Next.js 15 App Router UI and the quote API route
packages/sgqr            EMVCo/SGQR parser, CRC validation, fixtures
packages/contracts       Hardhat project: StockBackRouter plus test tokens
design-system/stockback  Design tokens and page specs the UI is built against
docs                     This directory
```

## Request path for one payment

1. **Decode.** `packages/sgqr` parses the payload into nested TLV fields, validates the
   CRC-16/CCITT checksum, and extracts the PayNow proxy, merchant name, currency and, for
   dynamic codes, the amount. Static codes route the payer to an amount screen instead of
   inventing a value.

2. **Resolve the merchant.** `lookupMerchant` maps the proxy value to a registered
   settlement address. An unregistered merchant is a hard stop with an explanation, because
   an SGQR code carries no wallet address.

3. **Price it.** `POST /api/quote` fetches the OKX v5 ticker for the pay asset, the reward
   asset and SGD/USD, then hands them to `computeQuote`. All arithmetic is integer-only:
   decimal price strings are scaled to 1e18 before use, so no quote depends on binary
   floating point. The response carries every leg in both base units and display form.

4. **Sign it.** `signQuote` produces an EIP-712 signature over the exact struct the router
   verifies. The type definition lives in `apps/web/lib/eip712.ts` and must stay
   byte-identical to `StockBackRouter.QUOTE_TYPEHASH`. When no signer key or router address
   is configured the quote comes back unsigned and the UI runs in preview mode, clearly
   labelled, rather than faking a settlement.

5. **Apply Spend Guard.** `evaluateSpendGuard` compares the quoted mark against the cost
   basis the user recorded locally. A loss beyond tolerance blocks confirmation, states the
   loss in plain language, and offers a deliberate override. This is a client-side policy
   and the contract knows nothing about it.

6. **Settle.** `useOnchainPayment` reads the existing allowance, approves only if it is
   short, simulates the call so a revert becomes a readable sentence before the wallet
   opens, sends `settle`, waits for the receipt, then reads the reward ledger back from the
   chain.

## The contract

`StockBackRouter` is one contract rather than three, because there is one thing to audit.

**Verifies**

- the quote is EIP-712 signed by the configured signer, bound to this chain and this router
- the quote has not expired, and neither the quote ID nor the invoice hash has settled before
- the caller is the payer named in the quote
- the merchant address is on the operator allowlist
- the pay and reward tokens match the deployment
- the 1% / 1% split recomputes exactly, so a leaked signer key cannot alter the economics

**Moves**

- `merchantAmount` to the merchant
- `protocolFee` to the treasury
- `rewardFee` to the reward fund

The router keeps no pay tokens; a test asserts its pay-token balance is zero after
settlement.

**Records**

- `rewardLedger[payer] += rewardUnits` and the matching `rewardLiabilities` total
- the invoice hash, so the same invoice cannot settle twice

**Pays**

- `claimRewards` transfers only from tokens the contract actually holds, and reverts with
  `InsufficientRewardBacking` otherwise
- `sweepRewardSurplus` lets the operator recover only the excess above outstanding
  liabilities, so a credited payer can never be stranded

## Deliberate choices

**Why a merchant allowlist rather than deriving an address from the QR.** It is not
possible. SGQR encodes a fiat scheme identifier. Anything that appeared to turn one into a
wallet address would be an invention. The allowlist makes merchant consent an explicit,
inspectable on-chain fact.

**Why the fee split is recomputed on-chain.** Signature verification alone would make the
quote signer fully trusted with the user's money. Recomputing the split bounds the damage
from a key leak to prices, not proportions.

**Why quotes expire in 90 seconds.** The quote embeds a live price. The UI marks it stale
at 60 seconds and re-quotes before allowing a signature; the contract rejects anything past
the expiry regardless.

**Why a hand-written ABI in the web app.** The surface is small, and writing it out keeps
the client honest about exactly which functions it calls. Compiled artifacts in
`packages/contracts/artifacts` remain the source of truth for the deployed bytecode.

**Why solc targets Paris.** X Layer's zkEVM does not implement Cancun opcodes such as
`MCOPY`. The compiler target and the pinned OpenZeppelin release both reflect that.

**Why a bespoke wallet layer instead of wagmi connectors.** wagmi's connector barrel pulls
in several unrelated wallet SDKs, one of which ships broken subpath exports. The app needs
one injected provider, so it speaks EIP-6963 and EIP-1193 directly through viem.

## State

The UI is a single reducer in `apps/web/lib/store.tsx` covering scan, amount, review,
authorize and receipt, plus quote status, guard override and transaction status. Settings
and cost basis persist to `localStorage` only, since a cost basis is the user's private
record and has no business on a server.
