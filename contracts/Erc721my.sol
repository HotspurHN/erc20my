//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "./interfaces/IMintable.sol";
import "./interfaces/IMintableErc721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Erc721my is ERC721, ERC721URIStorage, IMintableErc721, Ownable {

    uint256 private tokenId;
    address private minter;

    constructor() ERC721("Erc721my", "E721MY") {}

    function mintTo(address _recipient, string memory _url)
        public
        override onlyMinter
        returns (uint256)
    {
        uint256 newItemId = tokenId;
        tokenId++;
        _safeMint(_recipient, newItemId);
        _setTokenURI(newItemId, _url);
        return newItemId;
    }

    function _burn(uint256 _tokenId) onlyOwner internal override(ERC721, ERC721URIStorage) {
        super._burn(_tokenId);
    }

    function tokenURI(uint256 _tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(_tokenId);
    }

    function _baseURI() internal pure override returns (string memory) {
        return "";
    }

    function setMinter(address _minter) onlyOwner public override {
        minter = _minter;
    }

    modifier onlyMinter {
        require(msg.sender == minter, "Only minter can mint");
        _;
    }
}