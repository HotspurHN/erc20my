import { expect } from "chai";
const { ethers } = require("hardhat");
import { NFTMarketplace } from "../typechain-types/contracts/NFTMarketplace";
import { Erc721my } from "../typechain-types/contracts/Erc721my";
import { Erc1155my } from "../typechain-types/contracts/Erc1155my";
import { Erc20my } from "../typechain-types/contracts/Erc20my";
import testTools from "./tools";

describe("NFTMarketplace", function () {

    const tokenName: string = "Erc20my";
    const tokenSymbol: string = "EMY";
    const tokenDecimals: number = 18;
    const tokenTotalSupply: number = 1000000;

    const fee: number = 10;
    const auctionLength: number = 100;
    const auctionStep: number = 10;

    let owner: any;
    let addr1: any;

    let NFTMarketplaceFactory: any;
    let NFTMarketplaceInstance: NFTMarketplace;

    let Erc721myFactory: any;
    let Erc721myInstance: Erc721my;
    let Erc1155myFactory: any;
    let Erc1155myInstance: Erc1155my;

    let Erc20myFactory: any;
    let Erc20myInstance: Erc20my;

    let uri: string = "";

    before(async () => {
        [owner, addr1] = await ethers.getSigners();
        NFTMarketplaceFactory = await ethers.getContractFactory("NFTMarketplace");
        Erc721myFactory = await ethers.getContractFactory("Erc721my");
        Erc1155myFactory = await ethers.getContractFactory("Erc1155my");
        Erc20myFactory = await ethers.getContractFactory("Erc20my");
    });

    beforeEach(async () => {
        Erc721myInstance = await Erc721myFactory.deploy();
        await Erc721myInstance.deployed();

        Erc1155myInstance = await Erc1155myFactory.deploy();
        await Erc1155myInstance.deployed();

        Erc20myInstance = await Erc20myFactory.deploy(tokenName, tokenSymbol, tokenDecimals, tokenTotalSupply);
        await Erc20myInstance.deployed();

        NFTMarketplaceInstance = await NFTMarketplaceFactory.deploy(Erc20myInstance.address, fee, auctionStep, auctionLength, Erc721myInstance.address, Erc1155myInstance.address);
        await NFTMarketplaceInstance.deployed();
    });

    describe("Erc721", function () {
        describe("Listing", function () {
            describe("listItem", function () {
                it("Should list item", async function () {
                    await Erc721myInstance.setMinter(NFTMarketplaceInstance.address);
                    const tokenId = await NFTMarketplaceInstance["createItem(string)"](uri);
                    await Erc721myInstance.approve(NFTMarketplaceInstance.address, tokenId.value);
                    const price = 100;
                    const listingId = await NFTMarketplaceInstance["listItem(uint256,uint256)"](tokenId.value, price);
                    expect(listingId.value).to.equal(0);
                });

                it("Should not be possible to list item twice", async function () {
                    await Erc721myInstance.setMinter(NFTMarketplaceInstance.address);
                    const tokenId = await NFTMarketplaceInstance["createItem(string)"](uri);
                    await Erc721myInstance.approve(NFTMarketplaceInstance.address, tokenId.value);
                    const price = 100;
                    await NFTMarketplaceInstance["listItem(uint256,uint256)"](tokenId.value, price);
                    await expect(NFTMarketplaceInstance["listItem(uint256,uint256)"](tokenId.value, price)).to.be.revertedWith("Item is already listed");
                });

                it("Should not be possible to list with price 0", async function () {
                    await Erc721myInstance.setMinter(NFTMarketplaceInstance.address);
                    const tokenId = await NFTMarketplaceInstance["createItem(string)"](uri);
                    await Erc721myInstance.approve(NFTMarketplaceInstance.address, tokenId.value);
                    const price = 0;
                    await expect(NFTMarketplaceInstance["listItem(uint256,uint256)"](tokenId.value, price)).to.be.revertedWith("Price must be greater than 0");
                });
            });
            describe("cancel", function () {
                it("Should cancel listing", async function () {
                    await Erc721myInstance.setMinter(NFTMarketplaceInstance.address);
                    const tokenId = await NFTMarketplaceInstance["createItem(string)"](uri);
                    await Erc721myInstance.approve(NFTMarketplaceInstance.address, tokenId.value);
                    const price = 100;
                    const listingId = await NFTMarketplaceInstance["listItem(uint256,uint256)"](tokenId.value, price);
                    await NFTMarketplaceInstance.cancel(listingId.value);
                    const listing = await NFTMarketplaceInstance.listings(listingId.value);
                    expect(await NFTMarketplaceInstance.isListedErc721(tokenId.value)).to.equal(false);
                    expect(listing.isOpen).to.equal(false);
                    expect(await Erc721myInstance.ownerOf(tokenId.value)).to.equal(owner.address);
                });
                it("Should check if listing exists", async function () {
                    await expect(NFTMarketplaceInstance.cancel(100)).to.be.revertedWith("Listing does not exist");
                });
                it("Should check if seller to cancel", async function () {
                    await Erc721myInstance.setMinter(NFTMarketplaceInstance.address);
                    const tokenId = await NFTMarketplaceInstance["createItem(string)"](uri);
                    await Erc721myInstance.approve(NFTMarketplaceInstance.address, tokenId.value);
                    const price = 100;
                    const listingId = await NFTMarketplaceInstance["listItem(uint256,uint256)"](tokenId.value, price);
                    await expect(NFTMarketplaceInstance.connect(addr1).cancel(listingId.value)).to.be.revertedWith("Only seller can cancel");
                });
                it("Should not possible to cancel twice", async function () {
                    await Erc721myInstance.setMinter(NFTMarketplaceInstance.address);
                    const tokenId = await NFTMarketplaceInstance["createItem(string)"](uri);
                    await Erc721myInstance.approve(NFTMarketplaceInstance.address, tokenId.value);
                    const price = 100;
                    const listingId = await NFTMarketplaceInstance["listItem(uint256,uint256)"](tokenId.value, price);
                    await NFTMarketplaceInstance.cancel(listingId.value);
                    await expect(NFTMarketplaceInstance.cancel(listingId.value)).to.be.revertedWith("Listing is already closed");
                });
            });
            describe("buyItem", async function () {
                it("Should buy item", async function () {
                    await Erc721myInstance.setMinter(NFTMarketplaceInstance.address);
                    const price = 100;
                    await Erc20myInstance.transfer(addr1.address, price);
                    const initialBalance = await Erc20myInstance.balanceOf(owner.address);
                    await Erc20myInstance.connect(addr1).approve(NFTMarketplaceInstance.address, price);
                    const tokenId = (await NFTMarketplaceInstance["createItem(string)"](uri)).value;
                    await Erc721myInstance.approve(NFTMarketplaceInstance.address, tokenId);
                    const listingId = await NFTMarketplaceInstance["listItem(uint256,uint256)"](tokenId, price);
                    await NFTMarketplaceInstance.connect(addr1).buyItem(listingId.value);
                    expect(await NFTMarketplaceInstance.isListedErc721(tokenId)).to.equal(false);
                    expect(await Erc20myInstance.balanceOf(addr1.address)).to.equal(0);
                    expect(await Erc20myInstance.balanceOf(owner.address)).to.equal(initialBalance.add(price * (100 - fee) / 100));
                    expect(await Erc20myInstance.balanceOf(NFTMarketplaceInstance.address)).to.equal(price * (fee) / 100);
                    expect(await Erc721myInstance.balanceOf(addr1.address)).to.equal(1);
                    expect(await Erc721myInstance.balanceOf(owner.address)).to.equal(0);
                    expect(await Erc721myInstance.ownerOf(tokenId)).to.equal(addr1.address);
                });
                it("Should check if listing exists", async function () {
                    await expect(NFTMarketplaceInstance.buyItem(100)).to.be.revertedWith("Listing does not exist");
                });
                it("Should check if own item", async function () {
                    await Erc721myInstance.setMinter(NFTMarketplaceInstance.address);
                    const tokenId = await NFTMarketplaceInstance["createItem(string)"](uri);
                    await Erc721myInstance.approve(NFTMarketplaceInstance.address, tokenId.value);
                    const price = 100;
                    const listingId = await NFTMarketplaceInstance["listItem(uint256,uint256)"](tokenId.value, price);
                    await expect(NFTMarketplaceInstance.buyItem(listingId.value)).to.be.revertedWith("Cannot buy your own item");
                });
                it("Should check balance of buyer", async function () {
                    await Erc721myInstance.setMinter(NFTMarketplaceInstance.address);
                    const price = 100;
                    await Erc20myInstance.connect(addr1).approve(NFTMarketplaceInstance.address, price);
                    const tokenId = (await NFTMarketplaceInstance["createItem(string)"](uri)).value;
                    await Erc721myInstance.approve(NFTMarketplaceInstance.address, tokenId);
                    const listingId = await NFTMarketplaceInstance["listItem(uint256,uint256)"](tokenId, price);
                    await expect(NFTMarketplaceInstance.connect(addr1).buyItem(listingId.value)).to.be.revertedWith("Not enough balance");
                });
                it("Should be opened to buy", async function () {
                    await Erc721myInstance.setMinter(NFTMarketplaceInstance.address);
                    const tokenId = await NFTMarketplaceInstance["createItem(string)"](uri);
                    await Erc721myInstance.approve(NFTMarketplaceInstance.address, tokenId.value);
                    const price = 100;
                    const listingId = await NFTMarketplaceInstance["listItem(uint256,uint256)"](tokenId.value, price);
                    await NFTMarketplaceInstance.cancel(listingId.value);
                    await expect(NFTMarketplaceInstance.connect(addr1).buyItem(listingId.value)).to.be.revertedWith("Item is not open for purchase");
                });
            });
        });
        describe("Auction", function () {
            describe("listItemOnAuction", async function () {
                it("Should list item on auction", async function () {
                    await Erc721myInstance.setMinter(NFTMarketplaceInstance.address);
                    const price = 100;
                    const tokenId = await NFTMarketplaceInstance["createItem(string)"](uri);
                    await Erc721myInstance.approve(NFTMarketplaceInstance.address, tokenId.value);
                    const auctionId = await NFTMarketplaceInstance["listItemOnAuction(uint256,uint256)"](tokenId.value, price);
                    expect(auctionId.value).to.equal(0);
                });

                it("Should not be possible to list item on auction with price 0", async function () {
                    await Erc721myInstance.setMinter(NFTMarketplaceInstance.address);
                    const price = 0;
                    const tokenId = await NFTMarketplaceInstance["createItem(string)"](uri);
                    await Erc721myInstance.approve(NFTMarketplaceInstance.address, tokenId.value);
                    await expect(NFTMarketplaceInstance["listItemOnAuction(uint256,uint256)"](tokenId.value, price)).to.be.revertedWith("Price must be greater than 0");
                });

                it("Should not possible to list item on auction twice", async function () {
                    await Erc721myInstance.setMinter(NFTMarketplaceInstance.address);
                    const price = 100;
                    const tokenId = await NFTMarketplaceInstance["createItem(string)"](uri);
                    await Erc721myInstance.approve(NFTMarketplaceInstance.address, tokenId.value);
                    await NFTMarketplaceInstance["listItemOnAuction(uint256,uint256)"](tokenId.value, price);
                    await expect(NFTMarketplaceInstance["listItemOnAuction(uint256,uint256)"](tokenId.value, price)).to.be.revertedWith("Item is already listed");
                });
            });
            describe("finishAuction", async function () {
                it("Should finish auction", async function () {
                    await Erc721myInstance.setMinter(NFTMarketplaceInstance.address);
                    const price = 100;
                    await Erc20myInstance.transfer(addr1.address, price * 100);
                    await Erc20myInstance.connect(addr1).approve(NFTMarketplaceInstance.address, price * 100);
                    await Erc20myInstance.approve(NFTMarketplaceInstance.address, price * 100);
                    const tokenId = await NFTMarketplaceInstance["createItem(string)"](uri);
                    await Erc721myInstance.approve(NFTMarketplaceInstance.address, tokenId.value);
                    const auctionId = await NFTMarketplaceInstance["listItemOnAuction(uint256,uint256)"](tokenId.value, price);

                    await NFTMarketplaceInstance.connect(addr1).makeBid(auctionId.value, await NFTMarketplaceInstance.getNextAuctionPrice(auctionId.value));
                    await NFTMarketplaceInstance.makeBid(auctionId.value, await NFTMarketplaceInstance.getNextAuctionPrice(auctionId.value));
                    await NFTMarketplaceInstance.connect(addr1).makeBid(auctionId.value, await NFTMarketplaceInstance.getNextAuctionPrice(auctionId.value));

                    await testTools._increaseTime(auctionLength + 1);

                    await NFTMarketplaceInstance.finishAuction(auctionId.value);
                    const auction = await NFTMarketplaceInstance.auctions(auctionId.value);

                    expect(auction.isOpen).to.equal(false);
                    expect(await Erc721myInstance.ownerOf(tokenId.value)).to.equal(addr1.address);
                });
                it("Should check if auction exists", async function () {
                    await expect(NFTMarketplaceInstance.finishAuction(100)).to.be.revertedWith("Auction does not exist");
                });
                it("Should be not possible to finish closed auction after finish", async function () {
                    await Erc721myInstance.setMinter(NFTMarketplaceInstance.address);
                    const price = 100;
                    await Erc20myInstance.transfer(addr1.address, price * 100);
                    await Erc20myInstance.connect(addr1).approve(NFTMarketplaceInstance.address, price * 100);
                    await Erc20myInstance.approve(NFTMarketplaceInstance.address, price * 100);
                    const tokenId = await NFTMarketplaceInstance["createItem(string)"](uri);
                    await Erc721myInstance.approve(NFTMarketplaceInstance.address, tokenId.value);
                    const auctionId = await NFTMarketplaceInstance["listItemOnAuction(uint256,uint256)"](tokenId.value, price);

                    await testTools._increaseTime(auctionLength + 1);

                    await NFTMarketplaceInstance.finishAuction(auctionId.value);
                    await expect(NFTMarketplaceInstance.finishAuction(auctionId.value)).to.be.revertedWith("Auction is not open");
                });
                it("Should be not possible to finish closed auction before auctionLength time", async function () {
                    await Erc721myInstance.setMinter(NFTMarketplaceInstance.address);
                    const price = 100;
                    await Erc20myInstance.transfer(addr1.address, price * 100);
                    await Erc20myInstance.connect(addr1).approve(NFTMarketplaceInstance.address, price * 100);
                    await Erc20myInstance.approve(NFTMarketplaceInstance.address, price * 100);
                    const tokenId = await NFTMarketplaceInstance["createItem(string)"](uri);
                    await Erc721myInstance.approve(NFTMarketplaceInstance.address, tokenId.value);
                    const auctionId = await NFTMarketplaceInstance["listItemOnAuction(uint256,uint256)"](tokenId.value, price);
                    await expect(NFTMarketplaceInstance.finishAuction(auctionId.value)).to.be.revertedWith("Auction is not finished yet");
                });
            });
        });
    });

    describe("Erc1155", function () {
        describe("Listing", function () {
            describe("listItem", function () {
                it("Should list item", async function () {
                    await Erc1155myInstance.setMinter(NFTMarketplaceInstance.address);
                    const tokenId = await NFTMarketplaceInstance["createItem(string,uint256)"](uri, 1);
                    await Erc1155myInstance.setApprovalForAll(NFTMarketplaceInstance.address, true);
                    const price = 100;
                    const listingId = await NFTMarketplaceInstance["listItem(uint256,uint256,uint256)"](tokenId.value, price, 1);
                    expect(listingId.value).to.equal(0);
                });

                it("Should not be possible to list item twice", async function () {
                    await Erc1155myInstance.setMinter(NFTMarketplaceInstance.address);
                    const tokenId = await NFTMarketplaceInstance["createItem(string,uint256)"](uri, 1);
                    await Erc1155myInstance.setApprovalForAll(NFTMarketplaceInstance.address, true);
                    const price = 100;
                    await NFTMarketplaceInstance["listItem(uint256,uint256,uint256)"](tokenId.value, price, 1);
                    await expect(NFTMarketplaceInstance["listItem(uint256,uint256,uint256)"](tokenId.value, price, 1)).to.be.revertedWith("Item is already listed");
                });

                it("Should not be possible to list with price 0", async function () {
                    await Erc1155myInstance.setMinter(NFTMarketplaceInstance.address);
                    const tokenId = await NFTMarketplaceInstance["createItem(string,uint256)"](uri, 1);
                    await Erc1155myInstance.setApprovalForAll(NFTMarketplaceInstance.address, true);
                    const price = 0;
                    await expect(NFTMarketplaceInstance["listItem(uint256,uint256,uint256)"](tokenId.value, price, 1)).to.be.revertedWith("Price must be greater than 0");
                });
            });
            describe("cancel", function () {
                it("Should cancel listing", async function () {
                    await Erc1155myInstance.setMinter(NFTMarketplaceInstance.address);
                    const tokenId = await NFTMarketplaceInstance["createItem(string,uint256)"](uri, 1);
                    await Erc1155myInstance.setApprovalForAll(NFTMarketplaceInstance.address, true);
                    const price = 100;
                    const listingId = await NFTMarketplaceInstance["listItem(uint256,uint256,uint256)"](tokenId.value, price, 1);
                    await NFTMarketplaceInstance.cancel(listingId.value);
                    const listing = await NFTMarketplaceInstance.listings(listingId.value);
                    expect(await NFTMarketplaceInstance.isListedErc1155(tokenId.value)).to.equal(false);
                    expect(listing.isOpen).to.equal(false);
                    expect(await Erc1155myInstance.balanceOf(owner.address, tokenId.value)).to.equal(1);
                });
                it("Should check if listing exists", async function () {
                    await expect(NFTMarketplaceInstance.cancel(100)).to.be.revertedWith("Listing does not exist");
                });
                it("Should check if seller to cancel", async function () {
                    await Erc1155myInstance.setMinter(NFTMarketplaceInstance.address);
                    const tokenId = await NFTMarketplaceInstance["createItem(string,uint256)"](uri, 1);
                    await Erc1155myInstance.setApprovalForAll(NFTMarketplaceInstance.address, true);
                    const price = 100;
                    const listingId = await NFTMarketplaceInstance["listItem(uint256,uint256,uint256)"](tokenId.value, price, 1);
                    await expect(NFTMarketplaceInstance.connect(addr1).cancel(listingId.value)).to.be.revertedWith("Only seller can cancel");
                });
                it("Should not possible to cancel twice", async function () {
                    await Erc1155myInstance.setMinter(NFTMarketplaceInstance.address);
                    const tokenId = await NFTMarketplaceInstance["createItem(string,uint256)"](uri, 1);
                    await Erc1155myInstance.setApprovalForAll(NFTMarketplaceInstance.address, true);
                    const price = 100;
                    const listingId = await NFTMarketplaceInstance["listItem(uint256,uint256,uint256)"](tokenId.value, price, 1);
                    await NFTMarketplaceInstance.cancel(listingId.value);
                    await expect(NFTMarketplaceInstance.cancel(listingId.value)).to.be.revertedWith("Listing is already closed");
                });
            });
            describe("buyItem", async function () {
                it("Should buy item", async function () {
                    await Erc1155myInstance.setMinter(NFTMarketplaceInstance.address);
                    const price = 100;
                    await Erc20myInstance.transfer(addr1.address, price);
                    const initialBalance = await Erc20myInstance.balanceOf(owner.address);
                    await Erc20myInstance.connect(addr1).approve(NFTMarketplaceInstance.address, price);
                    const tokenId = (await NFTMarketplaceInstance["createItem(string,uint256)"](uri, 1)).value;
                    await Erc1155myInstance.setApprovalForAll(NFTMarketplaceInstance.address, true);
                    const listingId = await NFTMarketplaceInstance["listItem(uint256,uint256,uint256)"](tokenId, price, 1);
                    await NFTMarketplaceInstance.connect(addr1).buyItem(listingId.value);
                    expect(await NFTMarketplaceInstance.isListedErc1155(tokenId)).to.equal(false);
                    expect(await Erc20myInstance.balanceOf(addr1.address)).to.equal(0);
                    expect(await Erc20myInstance.balanceOf(owner.address)).to.equal(initialBalance.add(price * (100 - fee) / 100));
                    expect(await Erc20myInstance.balanceOf(NFTMarketplaceInstance.address)).to.equal(price * (fee) / 100);
                    expect(await Erc1155myInstance.balanceOf(addr1.address, tokenId)).to.equal(1);
                    expect(await Erc1155myInstance.balanceOf(owner.address, tokenId)).to.equal(0);
                });
            });
        });
        describe("Auction", function () {
            describe("listItemOnAuction", async function () {
                it("Should list item on auction", async function () {
                    await Erc1155myInstance.setMinter(NFTMarketplaceInstance.address);
                    const price = 100;
                    const tokenId = await NFTMarketplaceInstance["createItem(string,uint256)"](uri, 1);
                    await Erc1155myInstance.setApprovalForAll(NFTMarketplaceInstance.address, true);
                    const auctionId = await NFTMarketplaceInstance["listItemOnAuction(uint256,uint256,uint256)"](tokenId.value, price, 1);
                    expect(auctionId.value).to.equal(0);
                });

                it("Should not be possible to list item on auction with price 0", async function () {
                    await Erc1155myInstance.setMinter(NFTMarketplaceInstance.address);
                    const price = 0;
                    const tokenId = await NFTMarketplaceInstance["createItem(string,uint256)"](uri, 1);
                    await Erc1155myInstance.setApprovalForAll(NFTMarketplaceInstance.address, true);
                    await expect(NFTMarketplaceInstance["listItemOnAuction(uint256,uint256,uint256)"](tokenId.value, price, 1)).to.be.revertedWith("Price must be greater than 0");
                });

                it("Should not possible to list item on auction twice", async function () {
                    await Erc1155myInstance.setMinter(NFTMarketplaceInstance.address);
                    const price = 100;
                    const tokenId = await NFTMarketplaceInstance["createItem(string,uint256)"](uri, 1);
                    await Erc1155myInstance.setApprovalForAll(NFTMarketplaceInstance.address, true);
                    await NFTMarketplaceInstance["listItemOnAuction(uint256,uint256,uint256)"](tokenId.value, price, 1);
                    await expect(NFTMarketplaceInstance["listItemOnAuction(uint256,uint256,uint256)"](tokenId.value, price, 1)).to.be.revertedWith("Item is already listed");
                });
            });
            describe("finishAuction", async function () {
                it("Should finish auction", async function () {
                    await Erc1155myInstance.setMinter(NFTMarketplaceInstance.address);
                    const price = 100;
                    await Erc20myInstance.transfer(addr1.address, price * 100);
                    await Erc20myInstance.connect(addr1).approve(NFTMarketplaceInstance.address, price * 100);
                    await Erc20myInstance.approve(NFTMarketplaceInstance.address, price * 100);
                    const tokenId = await NFTMarketplaceInstance["createItem(string,uint256)"](uri, 1);
                    await Erc1155myInstance.setApprovalForAll(NFTMarketplaceInstance.address, true);
                    const auctionId = await NFTMarketplaceInstance["listItemOnAuction(uint256,uint256,uint256)"](tokenId.value, price, 1);

                    await NFTMarketplaceInstance.connect(addr1).makeBid(auctionId.value, await NFTMarketplaceInstance.getNextAuctionPrice(auctionId.value));
                    await NFTMarketplaceInstance.makeBid(auctionId.value, await NFTMarketplaceInstance.getNextAuctionPrice(auctionId.value));
                    await NFTMarketplaceInstance.connect(addr1).makeBid(auctionId.value, await NFTMarketplaceInstance.getNextAuctionPrice(auctionId.value));

                    await testTools._increaseTime(auctionLength + 1);

                    await NFTMarketplaceInstance.finishAuction(auctionId.value);
                    const auction = await NFTMarketplaceInstance.auctions(auctionId.value);

                    expect(auction.isOpen).to.equal(false);
                    expect(await Erc1155myInstance.balanceOf(owner.address, tokenId.value)).to.equal(0);
                    expect(await Erc1155myInstance.balanceOf(addr1.address, tokenId.value)).to.equal(1);
                });
                it("Should check if auction exists", async function () {
                    await expect(NFTMarketplaceInstance.finishAuction(100)).to.be.revertedWith("Auction does not exist");
                });
                it("Should be not possible to finish closed auction after finish", async function () {
                    await Erc1155myInstance.setMinter(NFTMarketplaceInstance.address);
                    const price = 100;
                    await Erc20myInstance.transfer(addr1.address, price * 100);
                    await Erc20myInstance.connect(addr1).approve(NFTMarketplaceInstance.address, price * 100);
                    await Erc20myInstance.approve(NFTMarketplaceInstance.address, price * 100);
                    const tokenId = await NFTMarketplaceInstance["createItem(string,uint256)"](uri, 1);
                    await Erc1155myInstance.setApprovalForAll(NFTMarketplaceInstance.address, true);
                    const auctionId = await NFTMarketplaceInstance["listItemOnAuction(uint256,uint256,uint256)"](tokenId.value, price, 1);

                    await testTools._increaseTime(auctionLength + 1);

                    await NFTMarketplaceInstance.finishAuction(auctionId.value);
                    await expect(NFTMarketplaceInstance.finishAuction(auctionId.value)).to.be.revertedWith("Auction is not open");
                });
                it("Should be not possible to finish closed auction before auctionLength time", async function () {
                    await Erc1155myInstance.setMinter(NFTMarketplaceInstance.address);
                    const price = 100;
                    await Erc20myInstance.transfer(addr1.address, price * 100);
                    await Erc20myInstance.connect(addr1).approve(NFTMarketplaceInstance.address, price * 100);
                    await Erc20myInstance.approve(NFTMarketplaceInstance.address, price * 100);
                    const tokenId = await NFTMarketplaceInstance["createItem(string,uint256)"](uri, 1);
                    await Erc1155myInstance.setApprovalForAll(NFTMarketplaceInstance.address, true);
                    const auctionId = await NFTMarketplaceInstance["listItemOnAuction(uint256,uint256,uint256)"](tokenId.value, price, 1);
                    await expect(NFTMarketplaceInstance.finishAuction(auctionId.value)).to.be.revertedWith("Auction is not finished yet");
                });
            });
        });
    });

    describe("Listing", function () {
    });

    describe("Auction", function () {
        describe("makeBid", async function () {
            it("Should make bid", async function () {
                await Erc721myInstance.setMinter(NFTMarketplaceInstance.address);
                const price = 100;
                await Erc20myInstance.transfer(addr1.address, price * (100 + auctionStep) / 100);
                await Erc20myInstance.connect(addr1).approve(NFTMarketplaceInstance.address, price * (100 + auctionStep) / 100);
                const tokenId = await NFTMarketplaceInstance["createItem(string)"](uri);
                await Erc721myInstance.approve(NFTMarketplaceInstance.address, tokenId.value);

                const auctionId = await NFTMarketplaceInstance["listItemOnAuction(uint256,uint256)"](tokenId.value, price);
                await NFTMarketplaceInstance.connect(addr1).makeBid(auctionId.value, price * (100 + auctionStep) / 100);
                const auction = await NFTMarketplaceInstance.auctions(auctionId.value);
                expect(auction.isOpen).to.equal(true);
                expect(auction.bids).to.equal(1);
                expect(auction.lastBider).to.equal(addr1.address);
                expect(auction.price).to.equal(price + price * auctionStep / 100);
            });
            it("Should check if auction exists", async function () {
                await expect(NFTMarketplaceInstance.makeBid(100, 1)).to.be.revertedWith("Auction does not exist");
            });
            it("Should be not possible to bet on finished auction", async function () {
                await Erc721myInstance.setMinter(NFTMarketplaceInstance.address);
                const price = 100;
                await Erc20myInstance.transfer(addr1.address, price * (100 + auctionStep) / 100);
                await Erc20myInstance.connect(addr1).approve(NFTMarketplaceInstance.address, price * (100 + auctionStep) / 100);
                const tokenId = await NFTMarketplaceInstance["createItem(string)"](uri);
                await Erc721myInstance.approve(NFTMarketplaceInstance.address, tokenId.value);

                const auctionId = await NFTMarketplaceInstance["listItemOnAuction(uint256,uint256)"](tokenId.value, price);
                await testTools._increaseTime(auctionLength + 1);
                await NFTMarketplaceInstance.finishAuction(auctionId.value);

                await expect(NFTMarketplaceInstance.connect(addr1).makeBid(auctionId.value, price * (100 + auctionStep) / 100)).to.be.revertedWith("Auction is not open");
            });
        });

        describe("finishAuction", async function () {
        });

        describe("getNextAuctionPrice", async function () {
            it("Should get next auction price", async function () {
                await Erc721myInstance.setMinter(NFTMarketplaceInstance.address);
                await Erc20myInstance.approve(NFTMarketplaceInstance.address, 1000);
                const price = 100;
                const tokenId = await NFTMarketplaceInstance["createItem(string)"](uri);
                await Erc721myInstance.approve(NFTMarketplaceInstance.address, tokenId.value);
                const auctionId = await NFTMarketplaceInstance["listItemOnAuction(uint256,uint256)"](tokenId.value, price);
                const nextPrice = await NFTMarketplaceInstance.getNextAuctionPrice(auctionId.value);

                await NFTMarketplaceInstance.makeBid(auctionId.value, price + price * auctionStep / 100);
                const nextPrice2 = await NFTMarketplaceInstance.getNextAuctionPrice(auctionId.value);

                expect(nextPrice).to.equal(price + price * auctionStep / 100);
                expect(nextPrice2).to.equal((price + price * auctionStep / 100) + (price + price * auctionStep / 100) * auctionStep / 100);
            });
            it("Should check if auction exists", async function () {
                await expect(NFTMarketplaceInstance.getNextAuctionPrice(100)).to.be.revertedWith("Auction does not exist");
            });
        });
    });
});

