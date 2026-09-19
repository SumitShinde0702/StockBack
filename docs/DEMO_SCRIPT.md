# Demo script

Target length 3 minutes. Four beats: a payment that works, a payment that gets blocked, the
on-chain proof, and the cashback. The whole point is that each rail is named separately, so
nobody walks away thinking SGQR settles crypto.

## Before you start

- [ ] `pnpm deploy:xlayer` has run and `NEXT_PUBLIC_*` addresses are in `.env.local`
- [ ] `SEED_WALLET=0x... pnpm seed:xlayer` has run, so the wallet holds dUSD and the router
      holds reward backing
- [ ] Wallet is on X Layer testnet (chain ID 1952) and holds testnet OKB for gas
- [ ] Dev server restarted after the env change
- [ ] A settings cost basis is pre-entered for the asset you will use in the blocked run
- [ ] X Layer explorer open in a second tab: https://www.okx.com/web3/explorer/xlayer-test
- [ ] Browser zoom at 100%, dark room, phone frame visible

## Beat 1 — A payment that settles (0:00 to 1:15)

> "This is a Singapore SGQR code, the same one you'd see at a hawker stall."

1. Paste or scan the sample SGQR payload.
2. Open the TLV inspector for two seconds. **Say:** "We're decoding EMVCo tag by tag and
   checking the CRC locally. Nothing about this payload is a wallet address, which matters
   in a moment."
3. Land on review. Point at the fee breakdown. **Say:** "Two percent spread, disclosed
   before signing. One percent is the protocol reserve, one percent funds the cashback. The
   cashback is paid for by the spread, not by yield and not by inflation."
4. Point at the merchant line. **Say:** "The QR identifies a PayNow merchant. It can't
   contain an X Layer address, so this merchant separately registered one, and the router
   only pays addresses on that allowlist."
5. Confirm. Walk through approve, sign, pending.
6. On the receipt, read the three labels out loud, deliberately:
   - **SGQR decoded** — the invoice format
   - **X Layer payment settled** — the actual crypto rail
   - **xStock reward credited** — the cashback ledger

## Beat 2 — A payment that gets blocked (1:15 to 2:00)

> "Now the part I actually care about."

1. Start a second payment with an asset whose recorded cost basis is above the current mark.
2. Spend Guard blocks at review. Read the explanation. **Say:** "You'd be spending at an
   unrealized loss against the cost basis you recorded yourself. We block by default."
3. Be explicit about what it is: **"This is a client-side policy, not an on-chain oracle.
   The contract has no idea what you paid for your ETH. We're not going to pretend it
   does."**
4. Show the override. **Say:** "It's your money, so you can proceed on purpose. It just
   can't happen by accident."
5. Do not complete this payment. Back out.

## Beat 3 — On-chain proof (2:00 to 2:30)

1. Click the transaction hash on the receipt.
2. On the explorer, point at the three transfers in one transaction: merchant, treasury,
   reward fund.
3. **Say:** "One transaction, three legs, and the router recomputes the one-percent split
   itself. Even if our quote signer key leaked, nobody can change the proportions."
4. Show the router address and note the merchant registration is on-chain and inspectable.

## Beat 4 — The cashback (2:30 to 3:00)

1. Open the rewards tab. Show the ledger balance and the backing figures.
2. **Say plainly:** "This is a labelled test token. It is not an xStock, it carries no
   equity exposure, and we're not distributing real tokenized stock in a hackathon demo.
   What's real is the mechanism."
3. Withdraw to the wallet. **Say:** "The contract refuses any claim it doesn't hold tokens
   for, so the ledger can never promise more than the buffer holds."
4. Close: **"Real SGQR parsing, real OKX pricing, real X Layer settlement, real ledger. The
   fiat payout and the official xStock distribution are integrations, not claims we're
   making today."**

## If something breaks

| Symptom | What to say and do |
| --- | --- |
| Quote goes stale mid-demo | "The price expired, which is the guard working." Tap refresh. |
| OKX rate limit, degraded badge | Point at the badge. "Fallback price, and the UI says so." |
| Wallet rejects | Show the rejected state, then retry from review. |
| Reward claim reverts | Open the backing figures. "Credited but unbacked, exactly as designed." |
| Everything is on fire | Fall back to `docs/ARCHITECTURE.md` and the contract tests. |

## Lines to never say

- "The SGQR code pays the merchant in crypto." It doesn't. It's the invoice format.
- "Spend Guard protects your portfolio on-chain." It's a client-side policy.
- "You earn real NVIDIA stock." It's a labelled mock in this build.
- "Zero-cost cashback." It's funded by the 2% spread the user pays.
