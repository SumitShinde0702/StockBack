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
    name: "settleWithPermit",
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
      { name: "value", type: "uint256" },
      { name: "deadline", type: "uint256" },
      { name: "v", type: "uint8" },
      { name: "r", type: "bytes32" },
      { name: "s", type: "bytes32" },
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
  {
    type: "function",
    name: "nonces",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "name",
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
  const blob = `${name} ${raw}`;

  if (code === 4001 || /UserRejected|rejected the request|User denied/i.test(blob)) {
    return { status: "rejected", message: "You dismissed the request in your wallet. Nothing was charged." };
  }

  // OZ / MetaMask often surface only the function name. Decode common selectors.
  if (/0xfb8f41b2|ERC20InsufficientAllowance/i.test(blob)) {
    return {
      status: "failed",
      message:
        "The router did not have permission to move your DemoUSD yet. Confirm the permit signature and try again — no separate approve wait.",
    };
  }
  if (/0x65c2160b|InvoiceAlreadySettled/i.test(blob)) {
    return {
      status: "failed",
      message: "This invoice was already paid. Start a fresh scan — each payment needs a new quote.",
    };
  }
  if (/0x3c9e5efc|QuoteAlreadySettled/i.test(blob)) {
    return {
      status: "failed",
      message: "This quote was already settled. Go back and refresh the price.",
    };
  }
  if (/0x5cd5d233|BadSignature/i.test(blob)) {
    return {
      status: "failed",
      message: "The router rejected the quote signature. Hard-refresh the app and get a new quote.",
    };
  }
  if (/0xa7b0ffd4|PayerMismatch/i.test(blob)) {
    return {
      status: "failed",
      message: "This quote was priced for a different wallet. Switch to the wallet you connected, then refresh.",
    };
  }
  if (/0xe450d38c|ERC20InsufficientBalance/i.test(blob)) {
    return {
      status: "failed",
      message: "Not enough DemoUSD in this wallet. Import token 0x4ec9…89b4 and use the seeded deployer account.",
    };
  }

  // MetaMask's generic line when a custom error was stripped from the response.
  if (/function ["']?settle["']? reverted|execution reverted/i.test(blob) && !/0x[0-9a-fA-F]{8}/.test(blob)) {
    return {
      status: "failed",
      message:
        "Settlement reverted on X Layer. Common causes: this QR invoice was already paid, the quote expired, or this wallet is not the one the quote was priced for. Go back, refresh the price, and try once.",
    };
  }

  const revert = raw.match(/(QuoteExpired|QuoteAlreadySettled|InvoiceAlreadySettled|PayerMismatch|MerchantNotRegistered|UnsupportedPayToken|UnsupportedRewardToken|BadSignature|FeeSplitMismatch|InsufficientRewardBacking|ClaimExceedsLedger|NothingToClaim|ERC20InsufficientBalance|ERC20InsufficientAllowance|ERC2612ExpiredSignature|ERC2612InvalidSigner)/);

  const explanations: Record<string, string> = {
    InvoiceAlreadySettled: "This invoice was already paid. Start a fresh scan — each payment needs a new quote.",
    QuoteAlreadySettled: "This quote was already settled. Go back and refresh the price.",
    PayerMismatch: "The quote was issued to a different wallet than the one signing.",
    MerchantNotRegistered: "The router no longer recognises this merchant's settlement address.",
    UnsupportedPayToken: "The router does not settle the token this quote names.",
    UnsupportedRewardToken: "The router's reward token does not match the quote.",
    BadSignature: "The router rejected the quote signature. Hard-refresh the app and get a new quote.",
    FeeSplitMismatch: "The router recomputed the 1% / 1% split and it did not match the quote.",
    InsufficientRewardBacking: "The reward buffer does not hold enough tokens to cover this claim yet.",
    ClaimExceedsLedger: "That is more than your ledger balance.",
    NothingToClaim: "This wallet has no cashback credited.",
    ERC20InsufficientBalance:
      "Not enough DemoUSD in this wallet. Import token 0x4ec93869DE34f14B72E0a464aBdd1312fCe889b4 (6 decimals).",
    QuoteExpired: "The quote expired before the transaction landed. Get a fresh price and try again.",
    ERC20InsufficientAllowance:
      "The router did not have permission to move your DemoUSD yet. Confirm the permit signature and try again.",
    ERC2612ExpiredSignature: "The permit signature expired. Confirm again — it takes a few seconds.",
    ERC2612InvalidSigner: "The permit was signed by a different wallet than the one paying.",
  };

  if (revert && explanations[revert[1]]) {
    return { status: "failed", message: explanations[revert[1]] };
  }

  return { status: "failed", message: raw };
}
