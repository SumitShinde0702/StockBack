import type { BaseContract, ContractTransactionResponse, Signer } from "ethers";

/**
 * Minimal typed views over the deployed contracts.
 *
 * The project deliberately skips TypeChain codegen: the ABI surface is small, and hand
 * declaring it keeps the test compile honest about what the tests actually call.
 */

type Tx = Promise<ContractTransactionResponse>;

export interface TestTokenLike extends BaseContract {
  connect(runner: Signer): TestTokenLike;
  mint(to: string, amount: bigint): Tx;
  approve(spender: string, amount: bigint): Tx;
  balanceOf(account: string): Promise<bigint>;
  nonces(owner: string): Promise<bigint>;
}

export interface QuoteArg {
  quoteId: string;
  invoiceHash: string;
  payer: string;
  merchant: string;
  payToken: string;
  rewardToken: string;
  merchantAmount: bigint;
  protocolFee: bigint;
  rewardFee: bigint;
  rewardUnits: bigint;
  expiry: bigint;
}

export interface RouterLike extends BaseContract {
  connect(runner: Signer): RouterLike;

  settle(quote: QuoteArg, signature: string): Tx;
  settleWithPermit(
    quote: QuoteArg,
    signature: string,
    value: bigint,
    deadline: bigint,
    v: number,
    r: string,
    s: string,
  ): Tx;
  claimRewards(amount: bigint): Tx;
  fundRewards(amount: bigint): Tx;
  registerMerchant(identifierHash: string, settlement: string): Tx;
  deregisterMerchant(identifierHash: string): Tx;
  setQuoteSigner(next: string): Tx;
  setTreasury(next: string): Tx;
  setRewardFund(next: string): Tx;
  sweepRewardSurplus(to: string, amount: bigint): Tx;

  QUOTE_TYPEHASH(): Promise<string>;
  grossAmount(quote: QuoteArg): Promise<bigint>;
  rewardLedger(payer: string): Promise<bigint>;
  rewardLiabilities(): Promise<bigint>;
  rewardBacking(): Promise<bigint>;
  unbackedLiabilities(): Promise<bigint>;
  merchantByIdentifier(identifierHash: string): Promise<string>;
  merchantEnabled(settlement: string): Promise<boolean>;
  quoteSettled(quoteId: string): Promise<boolean>;
  quoteSigner(): Promise<string>;
}
