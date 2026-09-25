# Contracts

Hardhat project in `packages/contracts`. Solidity 0.8.24 targeting the Paris EVM, because
X Layer's zkEVM does not implement Cancun opcodes such as `MCOPY`. OpenZeppelin is pinned
to 5.0.2 for the same reason.

## Deployed

Addresses are written to `packages/contracts/deployments/xlayer-testnet.json` by the deploy
script and printed as ready-to-paste env lines. If that file is absent, nothing has been
deployed yet and the app is running in preview mode.

| Contract | Purpose |
| --- | --- |
| `StockBackRouter` | Settles an invoice, splits the spread, credits and pays cashback |
| `DemoUSD` (`dUSD`) | Six-decimal test stablecoin. Mintable by anyone. Not redeemable |
| `MockXNVDA` (`mXNVDA`) | Test reward token. Not an xStock, no equity exposure |

### Sample settlement

A complete signed-quote payment is on X Layer testnet (first deployment, pre-permit router).
Status `1` (success), block `41869095`. Four ERC-20 transfers: the router pulls DemoUSD from
the payer, then splits it to the merchant, the treasury, and the reward fund at the 1% / 1%
split.

Current deployment uses EIP-2612 `settleWithPermit` so the app no longer waits for a separate
approve transaction. Addresses live in `packages/contracts/deployments/xlayer-testnet.json`.

| Field | Value |
| --- | --- |
| Tx | [`0xbea6e47f944132bd5b2cfe6c2d4612948830a2f9da01a229c7725c6808b22bb9`](https://www.okx.com/web3/explorer/xlayer-test/tx/0xbea6e47f944132bd5b2cfe6c2d4612948830a2f9da01a229c7725c6808b22bb9) |
| Prior router | `0x42dfD0D5401f351D28122c450A0f062d4F866416` |
| Current router | `0x54dFC9CcfED6cAc285d60Feb555D3257429879DD` |
| Payer | `0xfF595e2464102F19d8035790251F4B976d750af4` |
| Invoice | S$12.50 to Ah Hock Kopitiam |

Reproduce with a running quote API: `pnpm --filter @stockback/contracts exec ts-node scripts/settle-demo.ts`

## Deploying to X Layer testnet

```bash
# 1. Fill DEPLOYER_PRIVATE_KEY and QUOTE_SIGNER_PRIVATE_KEY in .env.local at the repo root.
#    Fund the deployer at https://web3.okx.com/xlayer/faucet
pnpm deploy:xlayer

# 2. Copy the printed NEXT_PUBLIC_* lines into .env.local, then seed demo balances.
SEED_WALLET=0xYourMetaMaskAddress pnpm seed:xlayer

# 3. Restart the dev server so the new addresses are picked up.
pnpm dev
```

`deploy:xlayer` deploys the two test tokens and the router, then registers the three demo
merchants against the keccak hash of their PayNow identifier. `seed:xlayer` mints test
stablecoin to a wallet and deposits reward backing so a withdrawal actually pays out.

## Interface

### Settlement

```solidity
function settle(Quote calldata quote, bytes calldata signature) external;
function settleWithPermit(
    Quote calldata quote,
    bytes calldata signature,
    uint256 value,
    uint256 deadline,
    uint8 v,
    bytes32 r,
    bytes32 s
) external;
function grossAmount(Quote calldata quote) external pure returns (uint256);
function hashQuote(Quote calldata quote) public view returns (bytes32);
```

The payer must approve `grossAmount(quote)` on the pay token first, **or** call
`settleWithPermit` with an ERC-2612 signature so allowance and settlement land in one
transaction. `settle` reverts unless every one of these holds:

| Check | Revert |
| --- | --- |
| Quote is unexpired | `QuoteExpired` |
| Caller is the named payer | `PayerMismatch` |
| Quote ID unused | `QuoteAlreadySettled` |
| Invoice hash unused | `InvoiceAlreadySettled` |
| Merchant is allowlisted | `MerchantNotRegistered` |
| Pay token matches deployment | `UnsupportedPayToken` |
| Reward token matches deployment | `UnsupportedRewardToken` |
| Split equals 1% / 1% of the base | `FeeSplitMismatch` |
| Signature is from `quoteSigner` | `BadSignature` |

### Reward ledger

```solidity
function fundRewards(uint256 amount) external;          // permissionless top-up
function claimRewards(uint256 amount) external;         // payer withdraws their credit
function rewardLedger(address payer) external view returns (uint256);
function rewardBacking() external view returns (uint256);
function unbackedLiabilities() external view returns (uint256);
```

A claim larger than the contract's actual balance reverts with `InsufficientRewardBacking`
rather than partially paying. `unbackedLiabilities` is exposed so the UI can show, honestly,
that a reward is credited but not yet funded.

### Operator

```solidity
function registerMerchant(bytes32 identifierHash, address settlement) external onlyOwner;
function deregisterMerchant(bytes32 identifierHash) external onlyOwner;
function setQuoteSigner(address next) external onlyOwner;
function setTreasury(address next) external onlyOwner;
function setRewardFund(address next) external onlyOwner;
function sweepRewardSurplus(address to, uint256 amount) external onlyOwner;
```

`identifierHash` is `keccak256(bytes(proxyValue))` of the PayNow identifier in the SGQR
payload. The mapping is the record of merchant consent; it is not derived from the QR code.

`sweepRewardSurplus` can only move the balance above `rewardLiabilities`.

## EIP-712 quote

```
Quote(bytes32 quoteId,bytes32 invoiceHash,address payer,address merchant,address payToken,
address rewardToken,uint256 merchantAmount,uint256 protocolFee,uint256 rewardFee,
uint256 rewardUnits,uint64 expiry)
```

Domain: `name: "StockBack"`, `version: "1"`, `chainId: 1952`, `verifyingContract: router`.

This definition is duplicated in `apps/web/lib/eip712.ts` and asserted equal by a contract
test. Changing a field name or order in one place without the other silently invalidates
every signature, so the test is the guard.

## Tests

```bash
pnpm test:contracts
```

26 tests across four groups: deployment, settlement, reward claims, and operator controls.
They cover the exact split arithmetic, the pass-through balance invariant, every revert in
the table above, quote signer rotation, partial claims, backing shortfalls, and the surplus
sweep boundary.
