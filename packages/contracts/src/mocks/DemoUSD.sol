// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

/**
 * @title DemoUSD
 * @notice Six-decimal test stablecoin for the X Layer testnet demo. Not a real stablecoin,
 *         not redeemable, and mintable by anyone so a judge can fund their own wallet.
 * @dev ERC-2612 permit lets the app settle in one transaction (sign permit + settle),
 *      instead of waiting for a separate approve to mine.
 */
contract DemoUSD is ERC20Permit {
    constructor() ERC20("StockBack Demo USD", "dUSD") ERC20Permit("StockBack Demo USD") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
