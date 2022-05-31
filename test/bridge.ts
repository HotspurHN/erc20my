import { expect } from "chai";
import { Erc20my } from "../typechain-types/contracts/Erc20my";
import { MyBridge } from "../typechain-types/contracts/MyBridge";
const { ethers, network } = require("hardhat");
import "dotenv/config";
const hre = require("hardhat");
require("@nomiclabs/hardhat-web3");

describe("Bridge", function () {

    const tokenName: string = "Erc20my";
    const tokenSymbol: string = "EMY";
    const tokenDecimals: number = 18;
    const tokenTotalSupply: number = 1000000;

    let owner: any;
    let addr1: any;

    let Erc20my: any;
    let Erc20myInstance: Erc20my;
    let Erc20myInstance2: Erc20my;

    let MyBridge: any;
    let MyBridgeInstance: MyBridge;
    let MyBridgeInstance2: MyBridge;

    const Web3 = require("web3");
    hre.Web3 = Web3;
    hre.web3 = new Web3(hre.network.provider);

    before(async () => {
        [owner, addr1] = await ethers.getSigners();
        Erc20my = await ethers.getContractFactory("Erc20my");
        MyBridge = await ethers.getContractFactory("MyBridge");
    });

    beforeEach(async () => {
        Erc20myInstance = await Erc20my.deploy(tokenName, tokenSymbol, tokenDecimals, tokenTotalSupply);
        await Erc20myInstance.deployed();
        Erc20myInstance2 = await Erc20my.deploy(tokenName, tokenSymbol, tokenDecimals, tokenTotalSupply);
        await Erc20myInstance2.deployed();
        MyBridgeInstance = await MyBridge.deploy(Erc20myInstance.address, Erc20myInstance2.address);
        MyBridgeInstance2 = await MyBridge.deploy(Erc20myInstance2.address, Erc20myInstance.address);
        await MyBridgeInstance.deployed();
        await MyBridgeInstance2.deployed();
        await Erc20myInstance.setMinter(MyBridgeInstance.address);
        await Erc20myInstance2.setMinter(MyBridgeInstance2.address);
    });

    const getSignatureFromEvent = (tx: any) => {
        return ethers.utils.defaultAbiCoder.decode(
            ['address', 'address', 'uint256', 'uint256', 'uint256', 'bytes'],
            [...tx?.events ?? []][1].data
        )[5];
    }

    describe("Swap", async () => {
        it("should swap tokens", async () => {
            const amount = 100;
            await MyBridgeInstance.swap(amount, 1);
            const balance = await Erc20myInstance.balanceOf(owner.address);
            expect(await Erc20myInstance.totalSupply()).to.equal(tokenTotalSupply - amount);
            expect(balance.toNumber()).to.equal(tokenTotalSupply - amount);
        });

        it("should generate valid signature", async () => {
            const amount = 100;
            const nonce = await MyBridgeInstance.nextNonce(owner.address);
            const tx = await MyBridgeInstance.swap(amount, nonce);
            const signature = getSignatureFromEvent(await tx.wait());
            const n = await ethers.provider.getNetwork();
            const s = ethers.utils.keccak256(
                ethers.utils.defaultAbiCoder.encode(
                    ['address', 'uint256', 'uint256', 'address', 'uint256'], 
                [owner.address, amount, nonce, Erc20myInstance2.address, n.chainId])
            );
            expect(signature).to.equal(s);
        });

        it("should not be possible to swap with same nonce twice", async () => {
            const amount = 100;
            const nonce = await MyBridgeInstance.nextNonce(owner.address);
            await MyBridgeInstance.swap(amount, nonce);
            await expect(MyBridgeInstance.swap(amount, nonce)).to.be.revertedWith("transfer already processed");
        });

        it("should not update nonce if lower than current nonce", async () => {
            const amount = 100;
            await MyBridgeInstance.swap(amount, 100);
            await MyBridgeInstance.swap(amount, 1);
            await expect(await MyBridgeInstance.nextNonce(owner.address)).to.be.equal(101);
        });
    });

    describe("Redeem", async () => {
        it("Should redeem", async () => {
            const amount = 10;
            const nonce = await MyBridgeInstance.nextNonce(owner.address);
            var tx = await (await MyBridgeInstance.swap(
                amount,
                nonce
            )).wait();

            await MyBridgeInstance2.redeem(
                amount,
                nonce,
                await owner.signMessage(ethers.utils.arrayify(getSignatureFromEvent(tx)))
            );
            expect(await Erc20myInstance.totalSupply()).to.equal(tokenTotalSupply - amount);
            expect(await Erc20myInstance.balanceOf(owner.address)).to.equal(tokenTotalSupply - amount);
            expect(await Erc20myInstance2.totalSupply()).to.equal(tokenTotalSupply + amount);
            expect(await Erc20myInstance2.balanceOf(owner.address)).to.equal(tokenTotalSupply + amount);
        });

        it("should be possible to swap/redeem in async", async () => {
            const amount1 = 1000;
            const amount2 = 100;
            const nonce1 = await MyBridgeInstance.nextNonce(owner.address);
            const nonce2 = await MyBridgeInstance2.nextNonce(owner.address);
            const tx = await (await MyBridgeInstance.swap(amount1, nonce1)).wait();
            const tx2 = await (await MyBridgeInstance2.swap(amount2, nonce2)).wait();
            await MyBridgeInstance2.redeem(
                amount1,
                nonce1,
                await owner.signMessage(ethers.utils.arrayify(getSignatureFromEvent(tx))));

            await MyBridgeInstance.redeem(
                amount2,
                nonce2,
                await owner.signMessage(ethers.utils.arrayify(getSignatureFromEvent(tx2))));

            expect(await Erc20myInstance.totalSupply()).to.equal(tokenTotalSupply - amount1 + amount2);
            expect(await Erc20myInstance.balanceOf(owner.address)).to.equal(tokenTotalSupply - amount1 + amount2);
            expect(await Erc20myInstance2.totalSupply()).to.equal(tokenTotalSupply - amount2 + amount1);
            expect(await Erc20myInstance2.balanceOf(owner.address)).to.equal(tokenTotalSupply - amount2 + amount1);
        });
        it("should not be possible to redeem with same nonce twice", async () => {
            const amount = 100;
            const nonce = await MyBridgeInstance.nextNonce(owner.address);
            const tx = await (await MyBridgeInstance.swap(amount, nonce)).wait();
            await MyBridgeInstance2.redeem(amount, nonce,
                await owner.signMessage(ethers.utils.arrayify(getSignatureFromEvent(tx))));
            await expect(MyBridgeInstance2.redeem(amount, nonce,
                await owner.signMessage(ethers.utils.arrayify(getSignatureFromEvent(tx))))).to.be.revertedWith("transfer already processed");
        });
        it("should not be possible to redeem from another account", async () => {
            const amount = 100;
            const nonce = await MyBridgeInstance.nextNonce(owner.address);
            const tx = await (await MyBridgeInstance.swap(amount, nonce)).wait();
            await expect(MyBridgeInstance.redeem(amount, nonce,
                await addr1.signMessage(ethers.utils.arrayify(getSignatureFromEvent(tx))))).to.be.revertedWith("wrong signature");
        });
    });

    describe("nextNonce", async () => {
        it ("should return the next nonce", async () => {
            const nonce1 = await MyBridgeInstance.nextNonce(owner.address);
            const amount = 100;
            const tx = await (await MyBridgeInstance.swap(amount, nonce1)).wait();
            const nonce2 = await MyBridgeInstance.nextNonce(owner.address);
            expect(nonce1.toNumber()).to.equal(0);
            expect(nonce2.toNumber()).to.equal(1);
        });
    });

    describe("setOtherToken", async () => {
        it("should set other token", async () => {
            await MyBridgeInstance.setOtherToken(Erc20myInstance2.address);
            expect(await MyBridgeInstance.otherToken()).to.equal(Erc20myInstance2.address);
        });
    });

});