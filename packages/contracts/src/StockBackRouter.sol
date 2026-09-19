// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title StockBackRouter
 * @notice Settles a single SGQR-derived invoice on X Layer and credits a cashback ledger.
 *
 * What this contract does know:
 *  - the merchant address was allowlisted by the operator against a PayNow identifier
 *  - the quote it was handed was signed by the configured off-chain signer and is unexpired
 *  - the 2% spread splits into exactly 1% protocol reserve and 1% reward funding
 *  - a quote and an invoice each settle at most once
 *
 * What this contract does NOT know, and never claims to:
 *  - the payer's portfolio history or cost basis. Spend Guard is a client-side policy;
 *    the router cannot and does not enforce it.
 *  - anything about fiat. No PayNow leg exists here. The SGQR payload is an invoice
 *    format that the operator has mapped to a consented settlement address.
 *  - whether the reward token is an officially issued xStock. The ledger is denominated
 *    in whatever reward token was configured at deployment, and claims are only payable
 *    from real balances this contract holds.
 */
contract StockBackRouter is Ownable, EIP712, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @dev Must stay byte-identical to `apps/web/lib/eip712.ts`. Reordering breaks every signature.
    bytes32 public constant QUOTE_TYPEHASH = keccak256(
        "Quote(bytes32 quoteId,bytes32 invoiceHash,address payer,address merchant,address payToken,address rewardToken,uint256 merchantAmount,uint256 protocolFee,uint256 rewardFee,uint256 rewardUnits,uint64 expiry)"
    );

    uint256 public constant PROTOCOL_BPS = 100; // 1.00% protocol reserve
    uint256 public constant REWARD_BPS = 100; // 1.00% funds the cashback
    uint256 public constant BPS_DENOMINATOR = 10_000;

    struct Quote {
        bytes32 quoteId;
        bytes32 invoiceHash;
        address payer;
        address merchant;
        address payToken;
        address rewardToken;
        uint256 merchantAmount;
        uint256 protocolFee;
        uint256 rewardFee;
        uint256 rewardUnits;
        uint64 expiry;
    }

    /// @notice The only ERC-20 this router will debit.
    IERC20 public immutable payToken;
    /// @notice The token the cashback ledger is denominated in.
    IERC20 public immutable rewardToken;

    /// @notice Receives the 1% protocol reserve.
    address public treasury;
    /// @notice Receives the 1% reward funding, and is expected to back the ledger.
    address public rewardFund;
    /// @notice Signs quotes off-chain. Rotatable, because a leaked key must not be permanent.
    address public quoteSigner;

    /// @notice PayNow proxy/UEN hash -> consented settlement address.
    mapping(bytes32 => address) public merchantByIdentifier;
    /// @notice Settlement addresses currently allowed to receive proceeds.
    mapping(address => bool) public merchantEnabled;

    mapping(bytes32 => bool) public quoteSettled;
    mapping(bytes32 => bool) public invoiceSettled;

    /// @notice Reward token base units owed to each payer.
    mapping(address => uint256) public rewardLedger;
    /// @notice Sum of all unclaimed ledger balances.
    uint256 public rewardLiabilities;

    event MerchantRegistered(bytes32 indexed identifierHash, address indexed settlement);
    event MerchantDeregistered(bytes32 indexed identifierHash, address indexed settlement);
    event QuoteSignerUpdated(address indexed previous, address indexed current);
    event TreasuryUpdated(address indexed previous, address indexed current);
    event RewardFundUpdated(address indexed previous, address indexed current);

    event PaymentSettled(
        bytes32 indexed quoteId,
        bytes32 indexed invoiceHash,
        address indexed payer,
        address merchant,
        uint256 merchantAmount,
        uint256 protocolFee,
        uint256 rewardFee
    );
    event RewardCredited(
        bytes32 indexed quoteId, address indexed payer, address rewardToken, uint256 rewardUnits
    );
    event RewardBackingAdded(address indexed from, uint256 amount);
    event RewardClaimed(address indexed payer, uint256 amount);

    error ZeroAddress();
    error QuoteExpired(uint64 expiry, uint256 now_);
    error QuoteAlreadySettled(bytes32 quoteId);
    error InvoiceAlreadySettled(bytes32 invoiceHash);
    error PayerMismatch(address expected, address actual);
    error MerchantNotRegistered(address merchant);
    error UnsupportedPayToken(address provided, address expected);
    error UnsupportedRewardToken(address provided, address expected);
    error ZeroAmount();
    error BadSignature();
    error FeeSplitMismatch(uint256 expected, uint256 provided);
    error NothingToClaim();
    error ClaimExceedsLedger(uint256 requested, uint256 available);
    error InsufficientRewardBacking(uint256 requested, uint256 held);
    error NoSurplus();

    constructor(
        address initialOwner,
        address payToken_,
        address rewardToken_,
        address treasury_,
        address rewardFund_,
        address quoteSigner_
    ) Ownable(initialOwner) EIP712("StockBack", "1") {
        if (
            payToken_ == address(0) || rewardToken_ == address(0) || treasury_ == address(0)
                || rewardFund_ == address(0) || quoteSigner_ == address(0)
        ) revert ZeroAddress();

        payToken = IERC20(payToken_);
        rewardToken = IERC20(rewardToken_);
        treasury = treasury_;
        rewardFund = rewardFund_;
        quoteSigner = quoteSigner_;
    }

    // --- operator configuration -------------------------------------------------

    /**
     * @notice Allowlists a merchant's settlement address against a PayNow identifier hash.
     * @dev The identifier hash is keccak256 of the SGQR proxy value. The mapping exists so
     *      a judge can verify that the address funds went to was registered deliberately,
     *      not derived from the QR code.
     */
    function registerMerchant(bytes32 identifierHash, address settlement) external onlyOwner {
        if (settlement == address(0)) revert ZeroAddress();
        merchantByIdentifier[identifierHash] = settlement;
        merchantEnabled[settlement] = true;
        emit MerchantRegistered(identifierHash, settlement);
    }

    function deregisterMerchant(bytes32 identifierHash) external onlyOwner {
        address settlement = merchantByIdentifier[identifierHash];
        if (settlement == address(0)) revert MerchantNotRegistered(settlement);
        delete merchantByIdentifier[identifierHash];
        merchantEnabled[settlement] = false;
        emit MerchantDeregistered(identifierHash, settlement);
    }

    function setQuoteSigner(address next) external onlyOwner {
        if (next == address(0)) revert ZeroAddress();
        emit QuoteSignerUpdated(quoteSigner, next);
        quoteSigner = next;
    }

    function setTreasury(address next) external onlyOwner {
        if (next == address(0)) revert ZeroAddress();
        emit TreasuryUpdated(treasury, next);
        treasury = next;
    }

    function setRewardFund(address next) external onlyOwner {
        if (next == address(0)) revert ZeroAddress();
        emit RewardFundUpdated(rewardFund, next);
        rewardFund = next;
    }

    // --- settlement -------------------------------------------------------------

    /**
     * @notice Settles one invoice: debits the payer once, splits the proceeds, credits cashback.
     * @dev The payer must have approved `grossAmount(quote)` on the pay token first.
     */
    function settle(Quote calldata quote, bytes calldata signature) external nonReentrant {
        if (quote.expiry < block.timestamp) revert QuoteExpired(quote.expiry, block.timestamp);
        if (quote.payer != msg.sender) revert PayerMismatch(quote.payer, msg.sender);
        if (quoteSettled[quote.quoteId]) revert QuoteAlreadySettled(quote.quoteId);
        if (invoiceSettled[quote.invoiceHash]) revert InvoiceAlreadySettled(quote.invoiceHash);
        if (!merchantEnabled[quote.merchant]) revert MerchantNotRegistered(quote.merchant);
        if (quote.payToken != address(payToken)) {
            revert UnsupportedPayToken(quote.payToken, address(payToken));
        }
        if (quote.rewardToken != address(rewardToken)) {
            revert UnsupportedRewardToken(quote.rewardToken, address(rewardToken));
        }
        if (quote.merchantAmount == 0) revert ZeroAmount();

        _verifyFeeSplit(quote);
        _verifySignature(quote, signature);

        quoteSettled[quote.quoteId] = true;
        invoiceSettled[quote.invoiceHash] = true;

        uint256 gross = quote.merchantAmount + quote.protocolFee + quote.rewardFee;
        payToken.safeTransferFrom(msg.sender, address(this), gross);
        payToken.safeTransfer(quote.merchant, quote.merchantAmount);
        payToken.safeTransfer(treasury, quote.protocolFee);
        payToken.safeTransfer(rewardFund, quote.rewardFee);

        emit PaymentSettled(
            quote.quoteId,
            quote.invoiceHash,
            msg.sender,
            quote.merchant,
            quote.merchantAmount,
            quote.protocolFee,
            quote.rewardFee
        );

        if (quote.rewardUnits > 0) {
            rewardLedger[msg.sender] += quote.rewardUnits;
            rewardLiabilities += quote.rewardUnits;
            emit RewardCredited(quote.quoteId, msg.sender, address(rewardToken), quote.rewardUnits);
        }
    }

    /// @notice Total pay-token debit for a quote, which is what the payer must approve.
    function grossAmount(Quote calldata quote) external pure returns (uint256) {
        return quote.merchantAmount + quote.protocolFee + quote.rewardFee;
    }

    function hashQuote(Quote calldata quote) public view returns (bytes32) {
        return _hashTypedDataV4(
            keccak256(
                abi.encode(
                    QUOTE_TYPEHASH,
                    quote.quoteId,
                    quote.invoiceHash,
                    quote.payer,
                    quote.merchant,
                    quote.payToken,
                    quote.rewardToken,
                    quote.merchantAmount,
                    quote.protocolFee,
                    quote.rewardFee,
                    quote.rewardUnits,
                    quote.expiry
                )
            )
        );
    }

    /**
     * @dev Recomputes the split on-chain so a compromised signer still cannot skim. The
     *      off-chain quote math uses the same truncating integer division.
     */
    function _verifyFeeSplit(Quote calldata quote) private pure {
        uint256 expectedProtocol = (quote.merchantAmount * PROTOCOL_BPS) / BPS_DENOMINATOR;
        uint256 expectedReward = (quote.merchantAmount * REWARD_BPS) / BPS_DENOMINATOR;
        if (quote.protocolFee != expectedProtocol) {
            revert FeeSplitMismatch(expectedProtocol, quote.protocolFee);
        }
        if (quote.rewardFee != expectedReward) {
            revert FeeSplitMismatch(expectedReward, quote.rewardFee);
        }
    }

    function _verifySignature(Quote calldata quote, bytes calldata signature) private view {
        (address recovered, ECDSA.RecoverError err,) =
            ECDSA.tryRecover(hashQuote(quote), signature);
        if (err != ECDSA.RecoverError.NoError || recovered != quoteSigner) revert BadSignature();
    }

    // --- reward ledger ----------------------------------------------------------

    /**
     * @notice Deposits reward tokens so ledger balances become claimable.
     * @dev Permissionless on purpose: the reward fund is an ordinary address, and anyone
     *      topping up the backing only ever helps payers.
     */
    function fundRewards(uint256 amount) external {
        if (amount == 0) revert ZeroAmount();
        rewardToken.safeTransferFrom(msg.sender, address(this), amount);
        emit RewardBackingAdded(msg.sender, amount);
    }

    /// @notice Reward tokens actually held by this contract.
    function rewardBacking() public view returns (uint256) {
        return rewardToken.balanceOf(address(this));
    }

    /// @notice Ledger credit that is not yet covered by real tokens.
    function unbackedLiabilities() external view returns (uint256) {
        uint256 held = rewardBacking();
        return held >= rewardLiabilities ? 0 : rewardLiabilities - held;
    }

    /**
     * @notice Moves cashback from the ledger into the payer's own custody.
     * @dev Reverts rather than partially paying when backing is short, so the UI can
     *      state plainly that the reward is credited but not yet funded.
     */
    function claimRewards(uint256 amount) external nonReentrant {
        uint256 available = rewardLedger[msg.sender];
        if (available == 0) revert NothingToClaim();
        if (amount == 0) revert ZeroAmount();
        if (amount > available) revert ClaimExceedsLedger(amount, available);

        uint256 held = rewardBacking();
        if (amount > held) revert InsufficientRewardBacking(amount, held);

        rewardLedger[msg.sender] = available - amount;
        rewardLiabilities -= amount;
        rewardToken.safeTransfer(msg.sender, amount);
        emit RewardClaimed(msg.sender, amount);
    }

    /**
     * @notice Withdraws only the reward balance in excess of outstanding liabilities.
     * @dev The operator can never strand a credited payer.
     */
    function sweepRewardSurplus(address to, uint256 amount) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        uint256 held = rewardBacking();
        uint256 surplus = held > rewardLiabilities ? held - rewardLiabilities : 0;
        if (surplus == 0 || amount > surplus) revert NoSurplus();
        rewardToken.safeTransfer(to, amount);
    }
}
