//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;
interface IERC721Receiver{
 function onERC721Received(address _operator, address _from, uint256 _tokenId, bytes calldata _data) external returns(bytes4);
}