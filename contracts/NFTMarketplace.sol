//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "./interfaces/IErc20.sol";
import "./interfaces/IMintableNft.sol";
import "./interfaces/IERC721Receiver.sol";
import "./interfaces/ITransferable.sol";

contract NFTMarketplace is IERC721Receiver {

    Listing[] private listings;
    Auction[] private auctions;

    mapping (address => bool) public approvedContracts;
    mapping (address => mapping(uint256 => Listing)) private listingsByTokenId;
    mapping (address => mapping(uint256 => Auction)) private auctionsByTokenId;

    address public erc20;
    uint256 public fee;
    uint256 public auctionStep;
    uint256 public auctionLength;

    constructor(address _erc20, uint256 _fee, uint256 _auctionStep, uint256 _auctionLength) {
        erc20 = _erc20;
        fee = _fee;
        auctionStep = _auctionStep;
        auctionLength = _auctionLength;
    }

    struct Listing {
        uint256 id;
        address seller;
        uint256 price;
        uint256 tokenId;
        uint256 timestamp;
        bool isOpen;
        address contractAddress;
    }

    struct Auction{
        uint256 id;
        address seller;
        uint256 price;
        uint256 tokenId;
        uint256 timestamp;
        bool isOpen;
        address contractAddress;
        address lastBider;
        uint256 bids;
    }

    function listItem(address _contract, uint256 _tokenId, uint256 _price) public returns (uint256) {
        require(approvedContracts[_contract], "Contract not approved");
        require(_price > 0, "Price must be greater than 0");
        require(listingsByTokenId[_contract][_tokenId].isOpen == false, "Item is already listed");
        ITransferable(_contract).safeTransferFrom(msg.sender, address(this), _tokenId);
        Listing memory listing = Listing(
            listings.length + 1,
            msg.sender,
            _price,
            _tokenId,
            block.timestamp,
            true,
            _contract
        );
        listings.push(listing);
        listingsByTokenId[_contract][_tokenId] = listing;
        return listing.id;
    }

    function buyItem(uint256 _listingId) public {
        require(_listingId < listings.length, "Listing does not exist");
        Listing memory listing = listings[_listingId];
        require(listing.isOpen, "Item is not open for purchase");
        require(listing.price <= IErc20(erc20).balanceOf(msg.sender), "Not enough balance");
        require(listing.seller != msg.sender, "Cannot buy your own item");
        listings[_listingId].isOpen = false;
        delete listingsByTokenId[listing.contractAddress][listing.tokenId];
        ITransferable(listing.contractAddress).safeTransferFrom(address(this), msg.sender, listing.tokenId);
        IErc20(erc20).transferFrom(msg.sender, listing.seller, listing.price * (100 - fee) / 100);
        IErc20(erc20).transferFrom(msg.sender, address(this), listing.price * fee / 100);
    }

    function cancel(uint256 _listingId) public {
        require(_listingId < listings.length, "Listing does not exist");
        require(listings[_listingId].seller == msg.sender, "Only seller can cancel");
        require(listings[_listingId].isOpen, "Listing is already closed");

        Listing storage existingListing = listings[_listingId];
        existingListing.isOpen = false;
        delete listingsByTokenId[existingListing.contractAddress][existingListing.tokenId];
    }

    function listItemOnAuction(address _contract, uint256 _tokenId, uint256 _price) public returns(uint256) {
        require(approvedContracts[_contract], "Contract not approved");
        require(_price > 0, "Price must be greater than 0");
        require(auctionsByTokenId[_contract][_tokenId].isOpen == false, "Item is already listed");
        ITransferable(_contract).safeTransferFrom(msg.sender, address(this), _tokenId);
        Auction memory auction = Auction(
            auctions.length + 1,
            msg.sender,
            _price,
            _tokenId,
            block.timestamp,
            true,
            _contract,
            address(0),
            0
        );
        auctions.push(auction);
        auctionsByTokenId[_contract][_tokenId] = auction;
        return auction.id;
    }

    function makeBid(uint256 _auctionId, uint256 _price) public {
        require(_auctionId < auctions.length, "Auction does not exist");
        Auction memory auction = auctions[_auctionId];
        require(auction.isOpen, "Auction is not open");
        require(auction.price * (100 + auctionStep) / 100 <= _price, "Bid must be greater than current price");
        require(auction.lastBider != msg.sender, "You have already bid on this item");
        require(IErc20(erc20).balanceOf(msg.sender) >= _price, "Not enough balance");

        auctions[_auctionId].lastBider = msg.sender;
        auctions[_auctionId].price = _price;
        auctions[_auctionId].bids++;
        IErc20(erc20).transferFrom(msg.sender, address(this), _price);
        if (auction.bids > 0){
            IErc20(erc20).transfer(auction.lastBider, auction.price);
        }
    }

    function finishAuction(uint256 _auctionId) public {
        require(_auctionId < auctions.length, "Auction does not exist");
        Auction memory auction = auctions[_auctionId];
        require(auction.isOpen, "Auction is not open");
        require(block.timestamp >= auction.timestamp + auctionLength, "Auction is not finished yet");
        if (auction.bids > 2){
            ITransferable(auction.contractAddress).safeTransferFrom(address(this), auction.lastBider, auction.tokenId);
            IErc20(erc20).transfer(auction.seller, auction.price);
        }
        auctions[_auctionId].isOpen = false;
        delete auctionsByTokenId[auction.contractAddress][auction.tokenId];
    }

    function getListing(uint256 _listingId) public view returns (Listing memory) {
        return listings[_listingId];
    }
    function getAuction(uint256 _auctionId) public view returns (Auction memory) {
        return auctions[_auctionId];
    }

    function isListed(address _contract, uint256 _tokenId) view public returns (bool){
        return listingsByTokenId[_contract][_tokenId].isOpen;
    }

    function approveContract(address _contract) public {
        approvedContracts[_contract] = true;
    }
    function revokeContract(address _contract) public {
        approvedContracts[_contract] = false;
    }
    function isApproved(address _contract) public view returns (bool) {
        return approvedContracts[_contract];
    }    
    function getNextAuctionPrice(uint256 _auctionId) public view returns (uint256){
        require(_auctionId < auctions.length, "Auction does not exist");
        Auction memory auction = auctions[_auctionId];
        return auction.price * (100 + auctionStep) / 100;
    }

    function createItem(address _contract, string calldata _uri) public returns(uint256) {
        require(approvedContracts[_contract], "Contract not approved");
        return IMintableNft(_contract).mintTo(msg.sender, _uri);
    }
    
    function onERC721Received(address, address, uint256, bytes memory) public virtual override returns (bytes4) {
        return this.onERC721Received.selector;
    }

}