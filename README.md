# StockBack

Pay a Singapore SGQR invoice with crypto on X Layer, get 1% back as fractional tokenized
stock, and get stopped before you spend an asset at a loss.

Three things make it more than a checkout skin:

- **The QR is decoded, not trusted.** Full EMVCo TLV parsing with CRC validation, locally.
- **The spread is honest and enforced.** 2% total, split 1% protocol reserve and 1% reward
  funding. The contract recomputes that split itself, so the off-chain signer cannot alter
  it.
- **Spend Guard blocks by default.** If paying would realize an unrealized loss against the
  cost basis you recorded, confirmation is blocked and explained, with a deliberate
  override.

**Read [docs/LIMITATIONS.md](docs/LIMITATIONS.md) before judging.** It states exactly which
parts are real and which are demo stand-ins. Short version: settlement, parsing, pricing and
the reward ledger are real; the merchant registry, the payment token and the reward token
are labelled test artifacts; there is no fiat leg and no custody.

## Quick start

```bash
pnpm install
cp .env.example .env.local
pnpm dev                 # http://localhost:3000
```

The app runs immediately in **preview mode**: real SGQR parsing and real OKX pricing, with
no wallet interaction and a receipt that is labelled a preview rather than a settlement.

To enable real on-chain settlement:

```bash
# Fill DEPLOYER_PRIVATE_KEY (throwaway wallet, funded at https://web3.okx.com/xlayer/faucet)
# and QUOTE_SIGNER_PRIVATE_KEY in .env.local
pnpm deploy:xlayer
# Paste the printed NEXT_PUBLIC_* lines into .env.local
SEED_WALLET=0xYourWallet pnpm seed:xlayer
pnpm dev
```

See [docs/CONTRACTS.md](docs/CONTRACTS.md) for the full deployment walkthrough.

## Layout

```
apps/web                 Next.js 15 UI and the quote API route
packages/sgqr            SGQR/EMVCo parser with CRC validation
packages/contracts       Hardhat: StockBackRouter and test tokens
design-system/stockback  Design tokens and page specs
docs                     Architecture, contracts, limitations, demo script
```

## How a payment flows

1. **Decode** the SGQR payload locally: nested TLV, CRC-16/CCITT, PayNow proxy, amount.
2. **Resolve** the merchant through an operator allowlist. An SGQR code contains no wallet
   address, so an unregistered merchant is a hard stop with an explanation.
3. **Price** the invoice against live OKX v5 market data, with integer-only arithmetic.
4. **Sign** an EIP-712 quote server-side that the router will verify.
5. **Check** Spend Guard against the locally stored cost basis.
6. **Settle** through `StockBackRouter.settle`: one debit, three transfers, one ledger
   credit, replay-protected.

[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) explains the design decisions, including why
the fee split is recomputed on-chain and why the merchant registry has to exist.

## Commands

| Command | What it does |
| --- | --- |
| `pnpm dev` | Web app in development |
| `pnpm build` | Production build |
| `pnpm test` | SGQR parser tests and contract tests |
| `pnpm test:sgqr` | Parser tests only |
| `pnpm test:contracts` | Hardhat tests only |
| `pnpm typecheck` | Type-check every workspace |
| `pnpm lint` | Lint the web app |
| `pnpm verify:all` | Typecheck, lint, test and build |
| `pnpm deploy:xlayer` | Deploy to X Layer testnet |
| `pnpm seed:xlayer` | Mint demo balances and fund reward backing |

## Requirements

Node 20.9+, pnpm 10, and a browser wallet (OKX Wallet or MetaMask) on X Layer testnet
(chain ID 1952) for the on-chain path.

## What this project does not do

No fiat payout. No custody of user funds. No OKX trading endpoints, only public market
data. No distribution of real tokenized equity, and no claim that anyone is eligible to
receive it. Spend Guard is a user-controlled client-side policy, not on-chain enforcement.
