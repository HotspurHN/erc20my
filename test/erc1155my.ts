import { expect } from "chai";
import { Erc1155my } from "../typechain-types/contracts/Erc1155my";
const { ethers } = require("hardhat");

describe("Erc1155my", function () {

  const tokenName: string = "Erc20my";
  const tokenSymbol: string = "EMY";
  const tokenDecimals: number = 18;
  const tokenTotalSupply: number = 1000000;

  let owner: any;
  let addr1: any;

  let Erc1155myFactory: any;
  let Erc1155myInstance: Erc1155my;

  before(async () => {
    [owner, addr1] = await ethers.getSigners();
    Erc1155myFactory = await ethers.getContractFactory("Erc1155my");
  });

  beforeEach(async () => {
    Erc1155myInstance = await Erc1155myFactory.deploy();
    await Erc1155myInstance.deployed();
  });

    describe("mint", function () {
        it("Should mint a token", async function () {
            await Erc1155myInstance.setMinter(owner.address);
            await Erc1155myInstance.mintTo(owner.address, "https://example.com/", 1000);
            expect(await Erc1155myInstance.balanceOf(owner.address, 0)).to.be.equal(1000);
        });
        it("Should revert if not minter", async function () {
            await expect(Erc1155myInstance.mintTo(owner.address, "https://example.com/", 1)).to.be.revertedWith("Only minter can mint");
        });
    });

    describe("setMinter", function () {
        it("Should revert if not owner", async function () {
            await expect(Erc1155myInstance.connect(addr1).setMinter(addr1.address)).to.be.revertedWith("Ownable: caller is not the owner");
        });
    });
});