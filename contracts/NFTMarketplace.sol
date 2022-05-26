//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "./interfaces/IErc20.sol";
import "./interfaces/IMintableErc721.sol";
import "./interfaces/IMintableErc1155.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";

contract NFTMarketplace is ERC1155Holder, ERC721Holder {
    Listing[] public listings;
    Auction[] public auctions;

    address private immutable erc721;
    address private immutable erc1155;
    address private immutable erc20;
    uint256 public immutable fee;
    uint256 public immutable auctionStep;
    uint256 public immutable auctionDuration;

    mapping(address => mapping(uint256 => bool)) private listingsByTokenId;
    mapping(address => mapping(uint256 => bool)) private auctionsByTokenId;

    constructor(
        address _erc20,
        uint256 _fee,
        uint256 _auctionStep,
        uint256 _auctionDuration,
        address _erc721,
        address _erc1155
    ) {
        erc20 = _erc20;
        fee = _fee;
        auctionStep = _auctionStep;
        auctionDuration = _auctionDuration;
        erc721 = _erc721;
        erc1155 = _erc1155;
    }

    struct Listing {
        uint256 id;
        address seller;
        uint256 price;
        uint256 tokenId;
        uint256 timestamp;
        bool isOpen;
        uint256 count;
        address contractAddress;
    }

    struct Auction {
        uint256 id;
        address seller;
        uint256 price;
        uint256 tokenId;
        uint256 timestamp;
        bool isOpen;
        uint256 count;
        address contractAddress;
        address lastBider;
        uint256 bids;
    }

    function listItem(uint256 _tokenId, uint256 _price)
        external
        returns (uint256)
    {
        require(_price > 0, "Price must be greater than 0");
        require(
            listingsByTokenId[erc721][_tokenId] == false,
            "Item is already listed"
        );
        Listing memory listing = Listing({
            id: listings.length,
            seller: msg.sender,
            price: _price,
            tokenId: _tokenId,
            timestamp: block.timestamp,
            isOpen: true,
            count: 1,
            contractAddress: erc721
        });
        listings.push(listing);
        listingsByTokenId[erc721][_tokenId] = true;
        IERC721(erc721).safeTransferFrom(msg.sender, address(this), _tokenId);
        return listing.id;
    }

    function listItem(
        uint256 _tokenId,
        uint256 _price,
        uint256 _count
    ) external returns (uint256) {
        require(_price > 0, "Price must be greater than 0");
        require(
            listingsByTokenId[erc1155][_tokenId] == false,
            "Item is already listed"
        );
        Listing memory listing = Listing({
            id: listings.length + 1,
            seller: msg.sender,
            price: _price,
            tokenId: _tokenId,
            timestamp: block.timestamp,
            isOpen: true,
            count: _count,
            contractAddress: erc1155
        });
        listings.push(listing);
        listingsByTokenId[erc1155][_tokenId] = true;
        IERC1155(erc1155).safeTransferFrom(msg.sender, address(this), _tokenId, _count, "");
        return listing.id;
    }

    function buyItem(uint256 _listingId) external {
        require(_listingId < listings.length, "Listing does not exist");
        Listing memory listing = listings[_listingId];
        require(listing.isOpen, "Item is not open for purchase");
        require(listing.seller != msg.sender, "Cannot buy your own item");
        listings[_listingId].isOpen = false;
        listingsByTokenId[listing.contractAddress][listing.tokenId] = false;
        IErc20(erc20).transferFrom(
            msg.sender,
            listing.seller,
            (listing.price * (100 - fee)) / 100
        );
        IErc20(erc20).transferFrom(
            msg.sender,
            address(this),
            (listing.price * fee) / 100
        );
        if (listing.contractAddress == erc721) {
            IERC721(erc721).safeTransferFrom(
                address(this),
                msg.sender,
                listing.tokenId
            );
        } else {
            IERC1155(erc1155).safeTransferFrom(
                address(this),
                msg.sender,
                listing.tokenId,
                listing.count,
                ""
            );
        }
    }

    function cancel(uint256 _listingId) external {
        require(_listingId < listings.length, "Listing does not exist");
        require(
            listings[_listingId].seller == msg.sender,
            "Only seller can cancel"
        );
        require(listings[_listingId].isOpen, "Listing is already closed");

        Listing storage existingListing = listings[_listingId];
        existingListing.isOpen = false;
        listingsByTokenId[existingListing.contractAddress][
            existingListing.tokenId
        ] = false;
        if (existingListing.contractAddress == erc721) {
            IERC721(erc721).safeTransferFrom(
                address(this),
                existingListing.seller,
                existingListing.tokenId
            );
        } else {
            IERC1155(erc1155).safeTransferFrom(
                address(this),
                existingListing.seller,
                existingListing.tokenId,
                existingListing.count,
                ""
            );
        }
    }

    function listItemOnAuction(uint256 _tokenId, uint256 _price)
        external
        returns (uint256)
    {
        require(_price > 0, "Price must be greater than 0");
        require(
            auctionsByTokenId[erc721][_tokenId] == false,
            "Item is already listed"
        );
        Auction memory auction = Auction({
            id: auctions.length + 1,
            seller: msg.sender,
            price: _price,
            tokenId: _tokenId,
            timestamp: block.timestamp,
            isOpen: true,
            count: 1,
            contractAddress: erc721,
            lastBider: address(0),
            bids: 0
        });
        auctions.push(auction);
        auctionsByTokenId[erc721][_tokenId] = true;
        IERC721(erc721).safeTransferFrom(msg.sender, address(this), _tokenId);
        return auction.id;
    }

    function listItemOnAuction(
        uint256 _tokenId,
        uint256 _price,
        uint256 _count
    ) external returns (uint256) {
        require(_price > 0, "Price must be greater than 0");
        require(
            auctionsByTokenId[erc1155][_tokenId] == false,
            "Item is already listed"
        );
        IERC1155(erc1155).safeTransferFrom(
            msg.sender,
            address(this),
            _tokenId,
            _count,
            ""
        );
        Auction memory auction = Auction({
            id: auctions.length + 1,
            seller: msg.sender,
            price: _price,
            tokenId: _tokenId,
            timestamp: block.timestamp,
            isOpen: true,
            count: _count,
            contractAddress: erc1155,
            lastBider: address(0),
            bids: 0
        });
        auctions.push(auction);
        auctionsByTokenId[erc1155][_tokenId] = true;
        return auction.id;
    }

    function makeBid(uint256 _auctionId, uint256 _price) external {
        require(_auctionId < auctions.length, "Auction does not exist");
        Auction memory auction = auctions[_auctionId];
        require(auction.isOpen, "Auction is not open");
        require(
            (auction.price * (100 + auctionStep)) / 100 <= _price,
            "Bid must be greater than current price"
        );
        require(
            auction.lastBider != msg.sender,
            "You have already bid on this item"
        );
        require(
            IErc20(erc20).balanceOf(msg.sender) >= _price,
            "Not enough balance"
        );

        auctions[_auctionId].lastBider = msg.sender;
        auctions[_auctionId].price = _price;
        auctions[_auctionId].bids++;
        IErc20(erc20).transferFrom(msg.sender, address(this), _price);
        if (auction.bids > 0) {
            IErc20(erc20).transfer(auction.lastBider, auction.price);
        }
    }

    function finishAuction(uint256 _auctionId) external {
        require(_auctionId < auctions.length, "Auction does not exist");
        Auction memory auction = auctions[_auctionId];
        require(auction.isOpen, "Auction is not open");
        require(
            block.timestamp >= auction.timestamp + auctionDuration,
            "Auction is not finished yet"
        );
        auctions[_auctionId].isOpen = false;
        auctionsByTokenId[auction.contractAddress][auction.tokenId] = false;
        if (auction.bids > 2) {
            if (auction.contractAddress == erc721) {
                IERC721(erc721).safeTransferFrom(
                    address(this),
                    auction.lastBider,
                    auction.tokenId
                );
            } else {
                IERC1155(erc1155).safeTransferFrom(
                    address(this),
                    auction.lastBider,
                    auction.tokenId,
                    auction.count,
                    ""
                );
            }
            IErc20(erc20).transfer(auction.seller, auction.price);
        }else{
            if (auction.contractAddress == erc721) {
                IERC721(erc721).safeTransferFrom(
                    address(this),
                    auction.seller,
                    auction.tokenId
                );
            } else {
                IERC1155(erc1155).safeTransferFrom(
                    address(this),
                    auction.seller,
                    auction.tokenId,
                    auction.count,
                    ""
                );
            }
        }
    }

    function isListedErc721(uint256 _tokenId) external view returns (bool) {
        return listingsByTokenId[erc721][_tokenId];
    }

    function isListedErc1155(uint256 _tokenId) external view returns (bool) {
        return listingsByTokenId[erc1155][_tokenId];
    }

    function getNextAuctionPrice(uint256 _auctionId)
        external
        view
        returns (uint256)
    {
        require(_auctionId < auctions.length, "Auction does not exist");
        Auction memory auction = auctions[_auctionId];
        return (auction.price * (100 + auctionStep)) / 100;
    }

    function createItem(string calldata _uri) external returns (uint256) {
        return IMintableErc721(erc721).mintTo(msg.sender, _uri);
    }

    function createItem(string calldata _uri, uint256 _count)
        external
        returns (uint256)
    {
        return IMintableErc1155(erc1155).mintTo(msg.sender, _uri, _count);
    }
}
