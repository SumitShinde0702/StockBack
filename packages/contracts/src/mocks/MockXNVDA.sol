// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockXNVDA
 * @notice Stand-in reward token used ONLY to exercise ledger and claim mechanics on X Layer
 *         testnet. It is not an xStock, carries no exposure to NVIDIA, and confers no rights
 *         of any kind. The app displays the official xStock contract address read-only and
 *         labels this token as a mock wherever a balance is shown.
 */
contract MockXNVDA is ERC20 {
    string public constant DISCLAIMER =
        "Test token. Not an xStock. No equity exposure, no redemption rights.";

    constructor() ERC20("MOCK NVIDIA xStock (test only)", "mXNVDA") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
