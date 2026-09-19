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
function grossAmount(Quote calldata quote) external pure returns (uint256);
function hashQuote(Quote calldata quote) public view returns (bytes32);
```

The payer must approve `grossAmount(quote)` on the pay token first. `settle` reverts unless
every one of these holds:

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
