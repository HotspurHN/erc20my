import { expect } from "chai";
import { Erc721my } from "../typechain-types/contracts/Erc721my";
const { ethers } = require("hardhat");

describe("Erc721my", function () {

  let owner: any;
  let addr1: any;

  let Erc721myFactory: any;
  let Erc721myInstance: Erc721my;

  before(async () => {
    [owner, addr1] = await ethers.getSigners();
    Erc721myFactory = await ethers.getContractFactory("Erc721my");
  });

  beforeEach(async () => {
    Erc721myInstance = await Erc721myFactory.deploy();
    await Erc721myInstance.deployed();
  });

    describe("mint", function () {
        it("Should mint a token", async function () {
            await Erc721myInstance.setMinter(owner.address);
            const tokenId = await Erc721myInstance.mintTo(owner.address, "https://example.com/");
            expect(tokenId.value).to.be.equal(0);
        });
        it("Should revert if not minter", async function () {
            await expect(Erc721myInstance.mintTo(owner.address, "https://example.com/")).to.be.revertedWith("Only minter can mint");
        });
    });

    describe("setMinter", function () {
        it("Should revert if not owner", async function () {
            await expect(Erc721myInstance.connect(addr1).setMinter(addr1.address)).to.be.revertedWith("Ownable: caller is not the owner");
        });
    });

    describe("tokenUri", function () {
        it("Should return correct tokenUri", async function () {
            await Erc721myInstance.setMinter(owner.address);
            const tokenId = await Erc721myInstance.mintTo(owner.address, "https://example.com/");
            expect(await Erc721myInstance.tokenURI(tokenId.value)).to.be.equal("https://example.com/");
        });
    });
});