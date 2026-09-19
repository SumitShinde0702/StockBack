// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title DemoUSD
 * @notice Six-decimal test stablecoin for the X Layer testnet demo. Not a real stablecoin,
 *         not redeemable, and mintable by anyone so a judge can fund their own wallet.
 */
contract DemoUSD is ERC20 {
    constructor() ERC20("StockBack Demo USD", "dUSD") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
