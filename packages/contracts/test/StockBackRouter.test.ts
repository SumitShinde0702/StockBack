import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import type { HDNodeWallet, Signer } from "ethers";
import type { RouterLike, TestTokenLike } from "./types";

/**
 * These tests are the contract's honesty check. They cover the money split, the
 * authorization surface, replay, expiry, and the reward backing rule, because those are
 * the claims the submission makes out loud.
 */

const PAY_DECIMALS = 6n;
const ONE_PAY = 10n ** PAY_DECIMALS;
const ONE_REWARD = 10n ** 18n;

interface QuoteStruct {
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

const QUOTE_TYPES = {
  Quote: [
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
};

async function deployFixture() {
  const [owner, payer, merchant, treasury, rewardFund, outsider] = await ethers.getSigners();

  // A dedicated signer keeps "who priced the quote" separate from "who owns the router".
  const quoteSigner = ethers.Wallet.createRandom();

  const payToken = (await (
    await ethers.getContractFactory("DemoUSD")
  ).deploy()) as unknown as TestTokenLike;
  const rewardToken = (await (
    await ethers.getContractFactory("MockXNVDA")
  ).deploy()) as unknown as TestTokenLike;

  const router = (await (await ethers.getContractFactory("StockBackRouter")).deploy(
    owner.address,
    await payToken.getAddress(),
    await rewardToken.getAddress(),
    treasury.address,
    rewardFund.address,
    quoteSigner.address,
  )) as unknown as RouterLike;

  const identifierHash = ethers.keccak256(ethers.toUtf8Bytes("202401234K"));
  await router.connect(owner).registerMerchant(identifierHash, merchant.address);

  await payToken.mint(payer.address, 10_000n * ONE_PAY);
  await payToken.connect(payer).approve(await router.getAddress(), ethers.MaxUint256);

  return {
    owner,
    payer,
    merchant,
    treasury,
    rewardFund,
    outsider,
    quoteSigner,
    payToken,
    rewardToken,
    router,
    identifierHash,
  };
}

async function makeQuote(
  overrides: Partial<QuoteStruct> & { router: string; payer: string; merchant: string; payToken: string; rewardToken: string },
): Promise<QuoteStruct> {
  const merchantAmount = overrides.merchantAmount ?? 100n * ONE_PAY;
  return {
    quoteId: overrides.quoteId ?? ethers.hexlify(ethers.randomBytes(32)),
    invoiceHash: overrides.invoiceHash ?? ethers.hexlify(ethers.randomBytes(32)),
    payer: overrides.payer,
    merchant: overrides.merchant,
    payToken: overrides.payToken,
    rewardToken: overrides.rewardToken,
    merchantAmount,
    protocolFee: overrides.protocolFee ?? merchantAmount / 100n,
    rewardFee: overrides.rewardFee ?? merchantAmount / 100n,
    rewardUnits: overrides.rewardUnits ?? ONE_REWARD / 1000n,
    expiry: overrides.expiry ?? BigInt((await time.latest()) + 90),
  };
}

async function sign(wallet: HDNodeWallet, router: string, quote: QuoteStruct) {
  const { chainId } = await ethers.provider.getNetwork();
  return wallet.signTypedData(
    { name: "StockBack", version: "1", chainId, verifyingContract: router },
    QUOTE_TYPES,
    quote,
  );
}

describe("StockBackRouter", () => {
  describe("deployment", () => {
    it("rejects zero addresses for every configured role", async () => {
      const [owner] = await ethers.getSigners();
      const factory = await ethers.getContractFactory("StockBackRouter");
      const token = await (await ethers.getContractFactory("DemoUSD")).deploy();
      const tokenAddress = await token.getAddress();

      await expect(
        factory.deploy(
          owner.address,
          ethers.ZeroAddress,
          tokenAddress,
          owner.address,
          owner.address,
          owner.address,
        ),
      ).to.be.revertedWithCustomError(factory, "ZeroAddress");
    });

    it("exposes the same EIP-712 type hash the web app signs with", async () => {
      const { router } = await deployFixture();
      const expected = ethers.keccak256(
        ethers.toUtf8Bytes(
          "Quote(bytes32 quoteId,bytes32 invoiceHash,address payer,address merchant,address payToken,address rewardToken,uint256 merchantAmount,uint256 protocolFee,uint256 rewardFee,uint256 rewardUnits,uint64 expiry)",
        ),
      );
      expect(await router.QUOTE_TYPEHASH()).to.equal(expected);
    });
  });

  describe("settlement", () => {
    it("splits the debit into merchant proceeds, protocol reserve and reward funding", async () => {
      const f = await deployFixture();
      const routerAddress = await f.router.getAddress();
      const quote = await makeQuote({
        router: routerAddress,
        payer: f.payer.address,
        merchant: f.merchant.address,
        payToken: await f.payToken.getAddress(),
        rewardToken: await f.rewardToken.getAddress(),
      });
      const signature = await sign(f.quoteSigner, routerAddress, quote);

      await expect(f.router.connect(f.payer).settle(quote, signature))
        .to.emit(f.router, "PaymentSettled")
        .withArgs(
          quote.quoteId,
          quote.invoiceHash,
          f.payer.address,
          f.merchant.address,
          quote.merchantAmount,
          quote.protocolFee,
          quote.rewardFee,
        );

      expect(await f.payToken.balanceOf(f.merchant.address)).to.equal(quote.merchantAmount);
      expect(await f.payToken.balanceOf(f.treasury.address)).to.equal(quote.protocolFee);
      expect(await f.payToken.balanceOf(f.rewardFund.address)).to.equal(quote.rewardFee);
      // The router is a pass-through and must never retain pay tokens.
      expect(await f.payToken.balanceOf(routerAddress)).to.equal(0n);
    });

    it("settles via ERC-2612 permit without a prior approve transaction", async () => {
      const f = await deployFixture();
      const routerAddress = await f.router.getAddress();
      const payTokenAddress = await f.payToken.getAddress();

      // Start from zero allowance so settle alone would fail.
      await f.payToken.connect(f.payer).approve(routerAddress, 0n);

      const quote = await makeQuote({
        router: routerAddress,
        payer: f.payer.address,
        merchant: f.merchant.address,
        payToken: payTokenAddress,
        rewardToken: await f.rewardToken.getAddress(),
      });
      const signature = await sign(f.quoteSigner, routerAddress, quote);
      const value = quote.merchantAmount + quote.protocolFee + quote.rewardFee;
      const deadline = BigInt((await time.latest()) + 600);
      const nonce = await f.payToken.nonces(f.payer.address);
      const { chainId } = await ethers.provider.getNetwork();

      const permitSig = await f.payer.signTypedData(
        {
          name: "StockBack Demo USD",
          version: "1",
          chainId,
          verifyingContract: payTokenAddress,
        },
        {
          Permit: [
            { name: "owner", type: "address" },
            { name: "spender", type: "address" },
            { name: "value", type: "uint256" },
            { name: "nonce", type: "uint256" },
            { name: "deadline", type: "uint256" },
          ],
        },
        {
          owner: f.payer.address,
          spender: routerAddress,
          value,
          nonce,
          deadline,
        },
      );
      const { v, r, s } = ethers.Signature.from(permitSig);

      await expect(
        f.router.connect(f.payer).settleWithPermit(quote, signature, value, deadline, v, r, s),
      )
        .to.emit(f.router, "PaymentSettled")
        .withArgs(
          quote.quoteId,
          quote.invoiceHash,
          f.payer.address,
          f.merchant.address,
          quote.merchantAmount,
          quote.protocolFee,
          quote.rewardFee,
        );

      expect(await f.payToken.balanceOf(f.merchant.address)).to.equal(quote.merchantAmount);
    });

    it("charges exactly the 2% spread and nothing more", async () => {
      const f = await deployFixture();
      const routerAddress = await f.router.getAddress();
      const before = await f.payToken.balanceOf(f.payer.address);
      const quote = await makeQuote({
        router: routerAddress,
        payer: f.payer.address,
        merchant: f.merchant.address,
        payToken: await f.payToken.getAddress(),
        rewardToken: await f.rewardToken.getAddress(),
        merchantAmount: 250n * ONE_PAY,
      });

      await f.router.connect(f.payer).settle(quote, await sign(f.quoteSigner, routerAddress, quote));

      const debited = before - (await f.payToken.balanceOf(f.payer.address));
      expect(debited).to.equal(255n * ONE_PAY); // 250 + 2.5 + 2.5
      expect(await f.router.grossAmount(quote)).to.equal(debited);
    });

    it("credits the reward ledger in reward-token base units", async () => {
      const f = await deployFixture();
      const routerAddress = await f.router.getAddress();
      const quote = await makeQuote({
        router: routerAddress,
        payer: f.payer.address,
        merchant: f.merchant.address,
        payToken: await f.payToken.getAddress(),
        rewardToken: await f.rewardToken.getAddress(),
      });

      await expect(f.router.connect(f.payer).settle(quote, await sign(f.quoteSigner, routerAddress, quote)))
        .to.emit(f.router, "RewardCredited")
        .withArgs(quote.quoteId, f.payer.address, await f.rewardToken.getAddress(), quote.rewardUnits);

      expect(await f.router.rewardLedger(f.payer.address)).to.equal(quote.rewardUnits);
      expect(await f.router.rewardLiabilities()).to.equal(quote.rewardUnits);
      // Credit is recorded even though no tokens back it yet, and the shortfall is visible.
      expect(await f.router.unbackedLiabilities()).to.equal(quote.rewardUnits);
    });

    it("rejects a fee split that does not match the on-chain bps math", async () => {
      const f = await deployFixture();
      const routerAddress = await f.router.getAddress();
      const quote = await makeQuote({
        router: routerAddress,
        payer: f.payer.address,
        merchant: f.merchant.address,
        payToken: await f.payToken.getAddress(),
        rewardToken: await f.rewardToken.getAddress(),
        protocolFee: 5n * ONE_PAY, // 5% instead of 1%
      });

      await expect(
        f.router.connect(f.payer).settle(quote, await sign(f.quoteSigner, routerAddress, quote)),
      ).to.be.revertedWithCustomError(f.router, "FeeSplitMismatch");
    });

    it("rejects a quote signed by anyone other than the configured signer", async () => {
      const f = await deployFixture();
      const routerAddress = await f.router.getAddress();
      const impostor = ethers.Wallet.createRandom();
      const quote = await makeQuote({
        router: routerAddress,
        payer: f.payer.address,
        merchant: f.merchant.address,
        payToken: await f.payToken.getAddress(),
        rewardToken: await f.rewardToken.getAddress(),
      });

      await expect(
        f.router.connect(f.payer).settle(quote, await sign(impostor, routerAddress, quote)),
      ).to.be.revertedWithCustomError(f.router, "BadSignature");
    });

    it("rejects a signature bound to a different router address", async () => {
      const f = await deployFixture();
      const routerAddress = await f.router.getAddress();
      const quote = await makeQuote({
        router: routerAddress,
        payer: f.payer.address,
        merchant: f.merchant.address,
        payToken: await f.payToken.getAddress(),
        rewardToken: await f.rewardToken.getAddress(),
      });

      const wrongDomain = await sign(f.quoteSigner, f.outsider.address, quote);
      await expect(
        f.router.connect(f.payer).settle(quote, wrongDomain),
      ).to.be.revertedWithCustomError(f.router, "BadSignature");
    });

    it("only lets the named payer settle their own quote", async () => {
      const f = await deployFixture();
      const routerAddress = await f.router.getAddress();
      const quote = await makeQuote({
        router: routerAddress,
        payer: f.payer.address,
        merchant: f.merchant.address,
        payToken: await f.payToken.getAddress(),
        rewardToken: await f.rewardToken.getAddress(),
      });
      const signature = await sign(f.quoteSigner, routerAddress, quote);

      await expect(
        f.router.connect(f.outsider).settle(quote, signature),
      ).to.be.revertedWithCustomError(f.router, "PayerMismatch");
    });

    it("rejects an expired quote", async () => {
      const f = await deployFixture();
      const routerAddress = await f.router.getAddress();
      const quote = await makeQuote({
        router: routerAddress,
        payer: f.payer.address,
        merchant: f.merchant.address,
        payToken: await f.payToken.getAddress(),
        rewardToken: await f.rewardToken.getAddress(),
      });
      const signature = await sign(f.quoteSigner, routerAddress, quote);

      await time.increaseTo(quote.expiry + 1n);
      await expect(
        f.router.connect(f.payer).settle(quote, signature),
      ).to.be.revertedWithCustomError(f.router, "QuoteExpired");
    });

    it("rejects a replayed quote id", async () => {
      const f = await deployFixture();
      const routerAddress = await f.router.getAddress();
      const quote = await makeQuote({
        router: routerAddress,
        payer: f.payer.address,
        merchant: f.merchant.address,
        payToken: await f.payToken.getAddress(),
        rewardToken: await f.rewardToken.getAddress(),
      });
      const signature = await sign(f.quoteSigner, routerAddress, quote);

      await f.router.connect(f.payer).settle(quote, signature);
      await expect(
        f.router.connect(f.payer).settle(quote, signature),
      ).to.be.revertedWithCustomError(f.router, "QuoteAlreadySettled");
    });

    it("rejects a second quote for an invoice that already settled", async () => {
      const f = await deployFixture();
      const routerAddress = await f.router.getAddress();
      const first = await makeQuote({
        router: routerAddress,
        payer: f.payer.address,
        merchant: f.merchant.address,
        payToken: await f.payToken.getAddress(),
        rewardToken: await f.rewardToken.getAddress(),
      });
      await f.router.connect(f.payer).settle(first, await sign(f.quoteSigner, routerAddress, first));

      const reissued = await makeQuote({
        router: routerAddress,
        payer: f.payer.address,
        merchant: f.merchant.address,
        payToken: await f.payToken.getAddress(),
        rewardToken: await f.rewardToken.getAddress(),
        invoiceHash: first.invoiceHash,
      });

      await expect(
        f.router.connect(f.payer).settle(reissued, await sign(f.quoteSigner, routerAddress, reissued)),
      ).to.be.revertedWithCustomError(f.router, "InvoiceAlreadySettled");
    });

    it("refuses to route to an unregistered merchant", async () => {
      const f = await deployFixture();
      const routerAddress = await f.router.getAddress();
      const quote = await makeQuote({
        router: routerAddress,
        payer: f.payer.address,
        merchant: f.outsider.address,
        payToken: await f.payToken.getAddress(),
        rewardToken: await f.rewardToken.getAddress(),
      });

      await expect(
        f.router.connect(f.payer).settle(quote, await sign(f.quoteSigner, routerAddress, quote)),
      ).to.be.revertedWithCustomError(f.router, "MerchantNotRegistered");
    });

    it("stops routing once a merchant is deregistered", async () => {
      const f = await deployFixture();
      const routerAddress = await f.router.getAddress();
      await f.router.connect(f.owner).deregisterMerchant(f.identifierHash);

      const quote = await makeQuote({
        router: routerAddress,
        payer: f.payer.address,
        merchant: f.merchant.address,
        payToken: await f.payToken.getAddress(),
        rewardToken: await f.rewardToken.getAddress(),
      });

      await expect(
        f.router.connect(f.payer).settle(quote, await sign(f.quoteSigner, routerAddress, quote)),
      ).to.be.revertedWithCustomError(f.router, "MerchantNotRegistered");
    });

    it("refuses a quote naming a token the router does not settle", async () => {
      const f = await deployFixture();
      const routerAddress = await f.router.getAddress();
      const other = await (await ethers.getContractFactory("DemoUSD")).deploy();
      const quote = await makeQuote({
        router: routerAddress,
        payer: f.payer.address,
        merchant: f.merchant.address,
        payToken: await other.getAddress(),
        rewardToken: await f.rewardToken.getAddress(),
      });

      await expect(
        f.router.connect(f.payer).settle(quote, await sign(f.quoteSigner, routerAddress, quote)),
      ).to.be.revertedWithCustomError(f.router, "UnsupportedPayToken");
    });
  });

  describe("reward claims", () => {
    async function settledFixture() {
      const f = await deployFixture();
      const routerAddress = await f.router.getAddress();
      const quote = await makeQuote({
        router: routerAddress,
        payer: f.payer.address,
        merchant: f.merchant.address,
        payToken: await f.payToken.getAddress(),
        rewardToken: await f.rewardToken.getAddress(),
        rewardUnits: ONE_REWARD / 100n,
      });
      await f.router.connect(f.payer).settle(quote, await sign(f.quoteSigner, routerAddress, quote));
      return { ...f, routerAddress, credited: quote.rewardUnits };
    }

    async function fund(
      f: Awaited<ReturnType<typeof settledFixture>>,
      funder: Signer,
      amount: bigint,
    ) {
      await f.rewardToken.mint(await funder.getAddress(), amount);
      await f.rewardToken.connect(funder).approve(f.routerAddress, amount);
      await f.router.connect(funder).fundRewards(amount);
    }

    it("refuses to pay a credit that is not backed by real tokens", async () => {
      const f = await settledFixture();
      await expect(
        f.router.connect(f.payer).claimRewards(f.credited),
      ).to.be.revertedWithCustomError(f.router, "InsufficientRewardBacking");
    });

    it("pays out once the reward fund deposits backing", async () => {
      const f = await settledFixture();
      await fund(f, f.rewardFund, f.credited);

      await expect(f.router.connect(f.payer).claimRewards(f.credited))
        .to.emit(f.router, "RewardClaimed")
        .withArgs(f.payer.address, f.credited);

      expect(await f.rewardToken.balanceOf(f.payer.address)).to.equal(f.credited);
      expect(await f.router.rewardLedger(f.payer.address)).to.equal(0n);
      expect(await f.router.rewardLiabilities()).to.equal(0n);
    });

    it("supports a partial claim and leaves the remainder on the ledger", async () => {
      const f = await settledFixture();
      await fund(f, f.rewardFund, f.credited);

      const half = f.credited / 2n;
      await f.router.connect(f.payer).claimRewards(half);

      expect(await f.router.rewardLedger(f.payer.address)).to.equal(f.credited - half);
      expect(await f.router.rewardLiabilities()).to.equal(f.credited - half);
      expect(await f.router.rewardBacking()).to.equal(f.credited - half);
    });

    it("rejects a claim larger than the ledger balance", async () => {
      const f = await settledFixture();
      await fund(f, f.rewardFund, f.credited * 2n);

      await expect(
        f.router.connect(f.payer).claimRewards(f.credited + 1n),
      ).to.be.revertedWithCustomError(f.router, "ClaimExceedsLedger");
    });

    it("rejects a claim from someone who never paid", async () => {
      const f = await settledFixture();
      await fund(f, f.rewardFund, f.credited);

      await expect(
        f.router.connect(f.outsider).claimRewards(1n),
      ).to.be.revertedWithCustomError(f.router, "NothingToClaim");
    });

    it("lets the owner sweep only the surplus above outstanding liabilities", async () => {
      const f = await settledFixture();
      await fund(f, f.rewardFund, f.credited * 3n);

      const surplus = f.credited * 2n;
      await expect(
        f.router.connect(f.owner).sweepRewardSurplus(f.owner.address, surplus + 1n),
      ).to.be.revertedWithCustomError(f.router, "NoSurplus");

      await f.router.connect(f.owner).sweepRewardSurplus(f.owner.address, surplus);
      expect(await f.router.rewardBacking()).to.equal(f.credited);

      // The credited payer is still whole.
      await f.router.connect(f.payer).claimRewards(f.credited);
      expect(await f.rewardToken.balanceOf(f.payer.address)).to.equal(f.credited);
    });

    it("keeps the sweep behind ownership", async () => {
      const f = await settledFixture();
      await expect(
        f.router.connect(f.outsider).sweepRewardSurplus(f.outsider.address, 1n),
      ).to.be.revertedWithCustomError(f.router, "OwnableUnauthorizedAccount");
    });
  });

  describe("operator controls", () => {
    it("keeps merchant registration behind ownership", async () => {
      const f = await deployFixture();
      await expect(
        f.router.connect(f.outsider).registerMerchant(f.identifierHash, f.outsider.address),
      ).to.be.revertedWithCustomError(f.router, "OwnableUnauthorizedAccount");
    });

    it("maps the PayNow identifier hash to the registered settlement address", async () => {
      const f = await deployFixture();
      expect(await f.router.merchantByIdentifier(f.identifierHash)).to.equal(f.merchant.address);
      expect(await f.router.merchantEnabled(f.merchant.address)).to.equal(true);
    });

    it("honours a rotated quote signer", async () => {
      const f = await deployFixture();
      const routerAddress = await f.router.getAddress();
      const replacement = ethers.Wallet.createRandom();
      await f.router.connect(f.owner).setQuoteSigner(replacement.address);

      const quote = await makeQuote({
        router: routerAddress,
        payer: f.payer.address,
        merchant: f.merchant.address,
        payToken: await f.payToken.getAddress(),
        rewardToken: await f.rewardToken.getAddress(),
      });

      await expect(
        f.router.connect(f.payer).settle(quote, await sign(f.quoteSigner, routerAddress, quote)),
      ).to.be.revertedWithCustomError(f.router, "BadSignature");

      await f.router.connect(f.payer).settle(quote, await sign(replacement, routerAddress, quote));
      expect(await f.router.quoteSettled(quote.quoteId)).to.equal(true);
    });

    it("routes the two fee legs to updated destinations", async () => {
      const f = await deployFixture();
      const routerAddress = await f.router.getAddress();
      await f.router.connect(f.owner).setTreasury(f.outsider.address);
      await f.router.connect(f.owner).setRewardFund(f.owner.address);

      const quote = await makeQuote({
        router: routerAddress,
        payer: f.payer.address,
        merchant: f.merchant.address,
        payToken: await f.payToken.getAddress(),
        rewardToken: await f.rewardToken.getAddress(),
      });
      await f.router.connect(f.payer).settle(quote, await sign(f.quoteSigner, routerAddress, quote));

      expect(await f.payToken.balanceOf(f.outsider.address)).to.equal(quote.protocolFee);
      expect(await f.payToken.balanceOf(f.owner.address)).to.equal(quote.rewardFee);
    });
  });
});
