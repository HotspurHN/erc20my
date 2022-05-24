//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155URIStorage.sol";
import "./interfaces/IMintableNft.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Erc1155my is ERC1155URIStorage, IMintableNft, Ownable {
    uint256 private tokenId;
    address private minter;

    constructor() ERC1155("") {}

    function mintTo(address _recipient, string memory _uri)
        public
        override
        returns (uint256)
    {
        uint256 newItemId = tokenId;
        tokenId++;
        _mint(_recipient, newItemId, 1, "");
        _setURI(newItemId, _uri);
        return newItemId;
    }

    function setMinter(address _minter) onlyOwner public
        override {
        minter = _minter;
    }

    modifier onlyMinter {
        require(msg.sender == minter, "Only minter can mint");
        _;
    }
}