/**
 * Landing page content.
 *
 * Every figure here is a published third-party statistic with a citation. Nothing on the
 * landing page is estimated, extrapolated or rounded in our favour, for the same reason
 * the product refuses to overstate what it settles: a number a judge cannot check is
 * worth less than no number at all.
 */

export interface Source {
  name: string;
  url: string;
  published: string;
}

const MAS_2022: Source = {
  name: "MAS parliamentary reply",
  url: "https://www.mas.gov.sg/news/parliamentary-replies/2022/reply-to-parliamentary-question-on-prevalence-use-of-cashless-payment-platforms-and-number-of-scam-cases-involving-scan-and-pay-transactions",
  published: "Oct 2022",
};

const IRCI_2026: Source = {
  name: "Independent Reserve Cryptocurrency Index Singapore 2026",
  url: "https://www.independentreserve.com/blog/wp-content/uploads/2026/04/Independent-Reserve-Cryptocurrency-Index-Singapore-2026.pdf",
  published: "Apr 2026",
};

export interface Stat {
  value: string;
  label: string;
  detail: string;
  source: Source;
}

export const IMPACT_STATS: Stat[] = [
  {
    value: "210,000+",
    label: "merchants accept SGQR",
    detail:
      "Over 90% of merchants in Singapore, from mall retail to hawker stalls, already display the code.",
    source: MAS_2022,
  },
  {
    value: "32%",
    label: "of Singaporeans hold or have held crypto",
    detail: "Up from 29% a year earlier, across a nationally representative panel of 1,500 adults.",
    source: IRCI_2026,
  },
  {
    value: "44%",
    label: "sold crypto in the last 12 months",
    detail:
      "Selling is routine. Nothing in that flow asks whether the sale locks in a loss against what they paid.",
    source: IRCI_2026,
  },
  {
    value: "76%",
    label: "keep crypto at 10% or less of their portfolio",
    detail:
      "Holdings are small and deliberate, which makes every badly timed disposal proportionally expensive.",
    source: IRCI_2026,
  },
];

export interface Pillar {
  title: string;
  body: string;
}

export const PROBLEM: Pillar[] = [
  {
    title: "Singapore already scans",
    body: "SGQR launched in 2018 as the world's first unified payment QR standard. The rail is everywhere, it works, and it is fiat-only by design.",
  },
  {
    title: "A third of the country holds crypto",
    body: "To spend any of it at that counter you sell on an exchange, withdraw to a bank, wait, and then pay. The two rails never touch.",
  },
  {
    title: "So people sell at whatever the day gives them",
    body: "No checkout anywhere asks the one question that matters: are you about to hand over an asset for less than you paid for it?",
  },
];

export const SOLUTION: Pillar[] = [
  {
    title: "Pay the code that is already on the counter",
    body: "StockBack decodes the merchant's existing SGQR label. The merchant installs nothing, signs up for nothing, and changes nothing about how they take payment.",
  },
  {
    title: "Spend Guard refuses a loss by default",
    body: "Before you can confirm, the live mark is compared against the cost basis you recorded. If you would be spending at a loss, the payment is blocked and explained in words. You can override it on purpose.",
  },
  {
    title: "Cashback is funded, not subsidised",
    body: "A disclosed 2% spread splits into a 1% protocol reserve and 1% that buys your cashback in fractional tokenized stock. No treasury burn, no emissions, no yield assumption.",
  },
];

export interface Step {
  index: string;
  title: string;
  body: string;
  tech: string;
}

export const STEPS: Step[] = [
  {
    index: "01",
    title: "Decode",
    body: "The SGQR payload is parsed on the device into nested EMVCo tags, with the checksum verified before anything is trusted.",
    tech: "EMVCo TLV · CRC-16/CCITT",
  },
  {
    index: "02",
    title: "Resolve",
    body: "An SGQR code identifies a PayNow merchant, never a wallet. The settlement address comes from an on-chain consent registry keyed by a hash of that identifier.",
    tech: "keccak256(proxyValue) → allowlist",
  },
  {
    index: "03",
    title: "Price",
    body: "The invoice is priced against live OKX public market data and converted with integer-only arithmetic, so no quote ever depends on binary floating point.",
    tech: "OKX v5 ticker · 1e18 fixed point",
  },
  {
    index: "04",
    title: "Guard",
    body: "The quoted mark meets the cost basis stored on your device. Blocking is the default, the reason is stated plainly, and the override is a deliberate act.",
    tech: "client-side policy · never on-chain",
  },
  {
    index: "05",
    title: "Settle",
    body: "One signed, expiring quote is verified on-chain. The router recomputes the 1% / 1% split itself, so even a leaked signing key cannot change the economics.",
    tech: "EIP-712 · replay-protected · 1 tx, 3 transfers",
  },
  {
    index: "06",
    title: "Credit",
    body: "Cashback lands in a reward ledger. A withdrawal only pays out from tokens the contract actually holds, and it says so when the buffer is short.",
    tech: "backing-checked claims",
  },
];

export const REAL: string[] = [
  "SGQR parsing, including CRC rejection of malformed codes",
  "Live OKX v5 public market data for every quote",
  "EIP-712 quote signing, verified on-chain by the router",
  "Settlement on X Layer: one debit, three transfers, replay-protected — sample tx on explorer",
  "A reward ledger whose claims are checked against real balances",
];

export const NOT_REAL: string[] = [
  "The merchant registry is three fictional demo merchants",
  "The payment token is a mintable test stablecoin, not a real one",
  "The reward token is a labelled mock, not an issued xStock",
  "There is no fiat leg: nothing pays a merchant in SGD",
  "Spend Guard is a client-side policy, not on-chain enforcement",
];
