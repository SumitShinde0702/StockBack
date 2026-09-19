/**
 * Hand-written subset of the StockBackRouter ABI, kept narrow on purpose: the app only
 * needs to settle, read the ledger and claim. Generated artifacts live in
 * packages/contracts/artifacts and are the source of truth for the deployed bytecode.
 */
export const routerAbi = [
  {
    type: "function",
    name: "settle",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "quote",
        type: "tuple",
        components: [
          { name: "quoteId", type: "bytes32" },
          { name: "invoiceHash", type: "bytes32" },
          { name: "payer", type: "address" },
          { name: "merchant", type: "address" },
          { name: "payToken", type: "address" },
          { name: "rewardToken", type: "address" },
          { name: "merchantAmount", type: "uint256" },
          { name: "protocolFee", type: "uint256" },
          { name: "rewardFee", type: "uint256" },
          { name: "rewardUnits", type: "uint256" },
          { name: "expiry", type: "uint64" },
        ],
      },
      { name: "signature", type: "bytes" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "claimRewards",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "rewardLedger",
    stateMutability: "view",
    inputs: [{ name: "payer", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "rewardBacking",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "rewardLiabilities",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "unbackedLiabilities",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "merchantEnabled",
    stateMutability: "view",
    inputs: [{ name: "settlement", type: "address" }],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "quoteSigner",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
  { type: "error", name: "QuoteExpired", inputs: [{ type: "uint64" }, { type: "uint256" }] },
  { type: "error", name: "QuoteAlreadySettled", inputs: [{ type: "bytes32" }] },
  { type: "error", name: "InvoiceAlreadySettled", inputs: [{ type: "bytes32" }] },
  { type: "error", name: "PayerMismatch", inputs: [{ type: "address" }, { type: "address" }] },
  { type: "error", name: "MerchantNotRegistered", inputs: [{ type: "address" }] },
  { type: "error", name: "UnsupportedPayToken", inputs: [{ type: "address" }, { type: "address" }] },
  {
    type: "error",
    name: "UnsupportedRewardToken",
    inputs: [{ type: "address" }, { type: "address" }],
  },
  { type: "error", name: "BadSignature", inputs: [] },
  { type: "error", name: "FeeSplitMismatch", inputs: [{ type: "uint256" }, { type: "uint256" }] },
  { type: "error", name: "ZeroAmount", inputs: [] },
  { type: "error", name: "NothingToClaim", inputs: [] },
  { type: "error", name: "ClaimExceedsLedger", inputs: [{ type: "uint256" }, { type: "uint256" }] },
  {
    type: "error",
    name: "InsufficientRewardBacking",
    inputs: [{ type: "uint256" }, { type: "uint256" }],
  },
] as const;

export const erc20Abi = [
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint8" }],
  },
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "string" }],
  },
] as const;

/**
 * Turns a revert or wallet error into something a payer can act on. Anything unmapped is
 * surfaced verbatim rather than replaced with a friendly lie.
 */
export function describeSettlementError(error: unknown): { status: "rejected" | "failed"; message: string } {
  const name = (error as { name?: string })?.name ?? "";
  const code = (error as { code?: number })?.code;
  const raw =
    (error as { shortMessage?: string })?.shortMessage ??
    (error as { message?: string })?.message ??
    "The payment failed.";

  if (code === 4001 || /UserRejected|rejected the request|User denied/i.test(`${name} ${raw}`)) {
    return { status: "rejected", message: "You dismissed the request in your wallet. Nothing was charged." };
  }

  const revert = raw.match(/(QuoteExpired|QuoteAlreadySettled|InvoiceAlreadySettled|PayerMismatch|MerchantNotRegistered|UnsupportedPayToken|UnsupportedRewardToken|BadSignature|FeeSplitMismatch|InsufficientRewardBacking|ClaimExceedsLedger|NothingToClaim|ERC20InsufficientBalance|ERC20InsufficientAllowance)/);

  const explanations: Record<string, string> = {
    QuoteExpired: "The quote expired before the transaction landed. Get a fresh price and try again.",
    QuoteAlreadySettled: "This quote was already settled. Start a new payment.",
    InvoiceAlreadySettled: "This invoice has already been paid once.",
    PayerMismatch: "The quote was issued to a different wallet than the one signing.",
    MerchantNotRegistered: "The router no longer recognises this merchant's settlement address.",
    UnsupportedPayToken: "The router does not settle the token this quote names.",
    UnsupportedRewardToken: "The router's reward token does not match the quote.",
    BadSignature: "The router rejected the quote signature. The price was not issued by this deployment.",
    FeeSplitMismatch: "The router recomputed the 1% / 1% split and it did not match the quote.",
    InsufficientRewardBacking: "The reward buffer does not hold enough tokens to cover this claim yet.",
    ClaimExceedsLedger: "That is more than your ledger balance.",
    NothingToClaim: "This wallet has no cashback credited.",
    ERC20InsufficientBalance: "Your wallet does not hold enough of the payment token.",
    ERC20InsufficientAllowance: "The token approval was not high enough. Approve again and retry.",
  };

  if (revert && explanations[revert[1]]) {
    return { status: "failed", message: explanations[revert[1]] };
  }

  return { status: "failed", message: raw };
}
