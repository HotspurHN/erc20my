//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";

interface IMintableErc1155 {
    function mintTo(address _recipient, string memory _url, uint256 _count) external returns (uint256);
    function setMinter(address _minter) external;
}
