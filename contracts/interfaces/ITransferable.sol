//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

interface ITransferable {
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
}
