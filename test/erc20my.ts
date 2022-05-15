import { expect } from "chai";
import { Erc20my } from "../typechain-types/Erc20my";
const { ethers } = require("hardhat");

describe("Erc20my", function () {

  const tokenName: string = "Erc20my";
  const tokenSymbol: string = "EMY";
  const tokenDecimals: number = 18;
  const tokenTotalSupply: number = 1000000;

  let owner: any;
  let addr1: any;

  let Erc20my: any;
  let Erc20myInstance: Erc20my;

  before(async () => {
    [owner, addr1] = await ethers.getSigners();
    Erc20my = await ethers.getContractFactory("Erc20my");
  });

  beforeEach(async () => {
    Erc20myInstance = await Erc20my.deploy(tokenName, tokenSymbol, tokenDecimals, tokenTotalSupply);
    await Erc20myInstance.deployed();
  });

  it("Should set correct values on deploy", async function () {
    expect(await Erc20myInstance.name()).to.equal(tokenName);
    expect(await Erc20myInstance.symbol()).to.equal(tokenSymbol);
    expect(await Erc20myInstance.decimals()).to.equal(tokenDecimals);
    expect(await Erc20myInstance.totalSupply()).to.equal(tokenTotalSupply);
  });

  describe("balanceOf", function () {
    it("Should return 0 for a non-existent account", async function () {
      expect(await Erc20myInstance.balanceOf(addr1.address)).to.equal(0);
    });

    it("Should set totalSupply to owner after deploy", async function () {
      expect(await Erc20myInstance.balanceOf(owner.address)).to.equal(tokenTotalSupply);
    });

    it("Should return correct balance for an existing account", async function () {
      let tx = await Erc20myInstance.transfer(addr1.address, 100);
      await tx.wait();
      expect(await Erc20myInstance.balanceOf(addr1.address)).to.equal(100);
    });
  });

  describe("approve", function () {
    it("Should set allowance for an existing account", async function () {
      let tx = await Erc20myInstance.approve(addr1.address, 100);
      await tx.wait();
      expect(await Erc20myInstance.allowance(owner.address, addr1.address)).to.equal(100);
    });
  });

  describe("transfer", function () {
    it("Should transfer tokens", async function () {
      let tx = await Erc20myInstance.transfer(addr1.address, 100);
      await tx.wait();
      expect(await Erc20myInstance.balanceOf(owner.address)).to.equal(tokenTotalSupply - 100);
      expect(await Erc20myInstance.balanceOf(addr1.address)).to.equal(100);
    });

    it("Should fail when trying to transfer more than balance", async function () {
      await expect(Erc20myInstance.transfer(addr1.address, tokenTotalSupply + 1)).to.be.revertedWith("VM Exception while processing transaction: reverted with reason string 'Not enough balance'");
    });
  });

  describe("transferFrom", function () {
    it("Should transfer tokens", async function () {
      await Erc20myInstance.approve(addr1.address, 100);
      let tx = await Erc20myInstance.connect(addr1).transferFrom(owner.address, addr1.address, 100);
      await tx.wait();
      expect(await Erc20myInstance.balanceOf(owner.address)).to.equal(tokenTotalSupply - 100);
      expect(await Erc20myInstance.balanceOf(addr1.address)).to.equal(100);
    }
    );

    it("Should fail when trying to transfer more than allowance", async function () {
      await Erc20myInstance.approve(addr1.address, 100);
      await expect(Erc20myInstance.connect(addr1).transferFrom(owner.address, addr1.address, 101)).to.be.revertedWith("VM Exception while processing transaction: reverted with reason string 'Not enough allowance'");
    }
    );

    it("Should fail when trying to transfer more than balance", async function () {
      await Erc20myInstance.approve(addr1.address, tokenTotalSupply + 1);
      await expect(Erc20myInstance.connect(addr1).transferFrom(owner.address, addr1.address, tokenTotalSupply + 1)).to.be.revertedWith("VM Exception while processing transaction: reverted with reason string 'Not enough balance'");
    }
    );
  });

  describe("mint", function () {
    it("Should mint tokens", async function () {
      let minterRoleTx = await Erc20myInstance.setMinter(owner.address);
      await minterRoleTx.wait();
      let tx = await Erc20myInstance.mint(addr1.address, 100);
      await tx.wait();
      expect(await Erc20myInstance.balanceOf(addr1.address)).to.equal(100);
      expect(await Erc20myInstance.totalSupply()).to.equal(tokenTotalSupply + 100);
    });

    it("Should be possible only for minter", async function () {
      await expect(Erc20myInstance.connect(addr1).mint(addr1.address, 1)).to.be.revertedWith("VM Exception while processing transaction: reverted with reason string 'Only minter allowed'");
    });
  });

  describe("burn", function () {
    it("Should burn tokens", async function () {
      let minterRoleTx = await Erc20myInstance.setMinter(owner.address);
      await minterRoleTx.wait();
      let tx = await Erc20myInstance.burn(owner.address, 100);
      await tx.wait();
      expect(await Erc20myInstance.balanceOf(owner.address)).to.equal(tokenTotalSupply - 100);
      expect(await Erc20myInstance.totalSupply()).to.equal(tokenTotalSupply - 100);
    });

    it("Should fail when trying to burn more than balance", async function () {
      let minterRoleTx = await Erc20myInstance.setMinter(owner.address);
      await minterRoleTx.wait();
      await expect(Erc20myInstance.burn(owner.address, tokenTotalSupply + 1)).to.be.revertedWith("VM Exception while processing transaction: reverted with reason string 'Not enough balance'");
    });

    it("Should be possible only for minter", async function () {
      await expect(Erc20myInstance.connect(addr1).burn(owner.address, 1)).to.be.revertedWith("VM Exception while processing transaction: reverted with reason string 'Only minter allowed'");
    });
  });

  describe("increaseAllowance", function () {
    it("Should increase allowance", async function () {
      let tx = await Erc20myInstance.increaseAllowance(addr1.address, 100);
      await tx.wait();
      expect(await Erc20myInstance.allowance(owner.address, addr1.address)).to.equal(100);
    });
  });

  describe("decreaseAllowance", function () {
    it("Should decrease allowance", async function () {
      await Erc20myInstance.approve(addr1.address, 100);
      let tx = await Erc20myInstance.decreaseAllowance(addr1.address, 50);
      await tx.wait();
      expect(await Erc20myInstance.allowance(owner.address, addr1.address)).to.equal(50);
    });
    
    it("Should fail when trying to decrease more than allowance", async function () {
      await Erc20myInstance.approve(addr1.address, 100);
      await expect(Erc20myInstance.decreaseAllowance(addr1.address, 101)).to.be.revertedWith("VM Exception while processing transaction: reverted with reason string 'Not enough allowance'");
    });
  });
});