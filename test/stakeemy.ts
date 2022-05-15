import { expect } from "chai";
import { StakeEmy } from "../typechain-types/StakeEmy";
import { Erc20my } from "../typechain-types/Erc20my";
const { ethers } = require("hardhat");

describe("StakeEmy", function () {
    let owner: any;
    let addr1: any;
    let addr2: any;

    let contractAddress: any;

    let StakeEmy: any;
    let StakeEmyInstance: StakeEmy;
    let Erc20my: any;
    let Erc20myInstance: Erc20my;

    const tokenName: string = "Erc20my";
    const tokenSymbol: string = "EMY";
    const tokenDecimals: number = 18;
    const tokenTotalSupply: number = 1000000;

    const coolDown = 10;
    const pool: number = 175000000;

    before(async () => {
        [owner, addr1, addr2] = await ethers.getSigners();
        StakeEmy = await ethers.getContractFactory("StakeEmy");
        Erc20my = await ethers.getContractFactory("Erc20my");
    });

    beforeEach(async () => {
        Erc20myInstance = await Erc20my.deploy(tokenName, tokenSymbol, tokenDecimals, tokenTotalSupply);
        await Erc20myInstance.deployed();
        StakeEmyInstance = await StakeEmy.deploy(Erc20myInstance.address, pool, coolDown);
        await StakeEmyInstance.deployed();
        contractAddress = StakeEmyInstance.address;
        await owner.sendTransaction({ to: contractAddress, value: ethers.utils.parseEther("0.1") });
        await Erc20myInstance.setMinter(StakeEmyInstance.address);
    });

    afterEach(async () => {
    });

    describe("balanceOf", function () {
        it("Should return 0 for a non-existent account", async function () {
            expect(await StakeEmyInstance.balanceOf(addr1.address)).to.equal(0);
        });
    });

    describe("stake", function () {
        it("Should stake tokens", async function () {
            let setLPTokenTx = await StakeEmyInstance.setLPToken(Erc20myInstance.address);
            await setLPTokenTx.wait();

            let approveTx = await Erc20myInstance.approve(StakeEmyInstance.address, 100);
            await approveTx.wait();
            let tx = await StakeEmyInstance.stake(100);
            await tx.wait();
            expect(await StakeEmyInstance.balanceOf(owner.address)).to.equal(100);
            expect(await StakeEmyInstance.allStaked()).to.equal(100);
        });

        it("Should stake tokens with a different amount", async function () {
            let setLPTokenTx = await StakeEmyInstance.setLPToken(Erc20myInstance.address);
            await setLPTokenTx.wait();
            
            let approveTx = await Erc20myInstance.approve(StakeEmyInstance.address, 100);
            await approveTx.wait();
            let tx = await StakeEmyInstance.stake(100);
            await tx.wait();
            
            approveTx = await Erc20myInstance.approve(StakeEmyInstance.address, 100);
            await approveTx.wait();
            tx = await StakeEmyInstance.stake(100);
            await tx.wait();

            expect(await StakeEmyInstance.balanceOf(owner.address)).to.equal(200);
            expect(await StakeEmyInstance.allStaked()).to.equal(200);
        });

        it("Should fail if not enough tokens are approved", async function () {
            let setLPTokenTx = await StakeEmyInstance.setLPToken(Erc20myInstance.address);
            await setLPTokenTx.wait();
            
            await expect(StakeEmyInstance.stake(100)).to.be.revertedWith("VM Exception while processing transaction: reverted with reason string 'Not enough allowance'");
        });

        it("Should fail if lpToken not set", async function () {
            await expect(StakeEmyInstance.stake(100)).to.be.revertedWith("VM Exception while processing transaction: reverted with reason string 'lpToken not set'");
        });
    });

    describe("claim", function () {
        it("Should claim tokens", async function () {
            let setLPTokenTx = await StakeEmyInstance.setLPToken(Erc20myInstance.address);
            await setLPTokenTx.wait();
            const initialBalance = await Erc20myInstance.balanceOf(owner.address) || 0;
            const stake = 100;

            await Erc20myInstance.approve(StakeEmyInstance.address, stake);
            await StakeEmyInstance.stake(stake);

            await ethers.provider.send("evm_increaseTime", [coolDown]);
            await ethers.provider.send("evm_mine");

            let tx2 = await StakeEmyInstance.claim();
            await tx2.wait();
            expect(await Erc20myInstance.balanceOf(owner.address)).to.equal(initialBalance.sub(stake).add(pool));
        });

        it("Should not claim tokens if not enough time has passed", async function () {
            let setLPTokenTx = await StakeEmyInstance.setLPToken(Erc20myInstance.address);
            await setLPTokenTx.wait();
            const initialBalance = await Erc20myInstance.balanceOf(owner.address) || 0;
            const stake = 100;

            await Erc20myInstance.approve(StakeEmyInstance.address, stake);
            await StakeEmyInstance.stake(stake);

            let tx2 = await StakeEmyInstance.claim();
            await tx2.wait();
            expect(await Erc20myInstance.balanceOf(owner.address)).to.equal(initialBalance.sub(stake));
        });

        it("Should not claim tokens if not enough tokens are staked", async function () {
            let setLPTokenTx = await StakeEmyInstance.setLPToken(Erc20myInstance.address);
            await setLPTokenTx.wait();
            await expect(StakeEmyInstance.claim()).to.be.revertedWith("VM Exception while processing transaction: reverted with reason string 'No balance to claim'");
        });

        it("Should claim tokens devided by the number of stakers", async function () {
            let setLPTokenTx = await StakeEmyInstance.setLPToken(Erc20myInstance.address);
            await setLPTokenTx.wait();

            const initialBalance = await Erc20myInstance.balanceOf(owner.address) || 0;
            const stake = 100;
            const stake1 = 50;
            const stake2 = 25;


            await Erc20myInstance.approve(StakeEmyInstance.address, stake);
            await Erc20myInstance.transfer(addr1.address, stake1);
            await Erc20myInstance.transfer(addr2.address, stake2);
            await Erc20myInstance.connect(addr1).approve(StakeEmyInstance.address, stake1);
            await Erc20myInstance.connect(addr2).approve(StakeEmyInstance.address, stake2);

            const timestampBeforeStakeOwner = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp;
            await StakeEmyInstance.stake(stake);

            const timestampBeforeStake1 = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp;
            await StakeEmyInstance.connect(addr1).stake(stake1);

            const timestampBeforeStake2 = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp;
            await StakeEmyInstance.connect(addr2).stake(stake2);

            await ethers.provider.send("evm_mine", [timestampBeforeStakeOwner + 3 * coolDown]);
            const tx1 = await StakeEmyInstance.claim();
            await tx1.wait();
            await ethers.provider.send("evm_mine", [timestampBeforeStake1 + 4 * coolDown]);
            const tx2 = await StakeEmyInstance.connect(addr1).claim();
            await tx2.wait();
            await ethers.provider.send("evm_mine", [timestampBeforeStake2 + 5 * coolDown]);
            const tx3 = await StakeEmyInstance.connect(addr2).claim();
            await tx3.wait();

            const balance1 = await Erc20myInstance.balanceOf(addr1.address);
            const balance2 = await Erc20myInstance.balanceOf(addr2.address);
            const balanceOwner = await Erc20myInstance.balanceOf(owner.address);

            const bo = initialBalance
                .sub(stake)
                .sub(stake1)
                .sub(stake2)
                .add(pool)
                .add(Math.round(pool * stake / (stake + stake1 + stake2)))
                .add(Math.round(pool * stake / (stake + stake1 + stake2)));

            const b1 = Math.round(pool * stake1 * 4 / (stake + stake1 + stake2));

            const b2 = Math.round(pool * stake2 * 5 / (stake + stake1 + stake2));

            expect(1.01).to.above(bo.sub(balanceOwner).toNumber());
            expect(-1.01).to.below(bo.sub(balanceOwner).toNumber());
            expect(1.01).to.above(balance1.sub(b1).toNumber());
            expect(-1.01).to.below(balance1.sub(b1).toNumber());
            expect(1.01).to.above(balance2.sub(b2).toNumber());
            expect(-1.01).to.below(balance2.sub(b2).toNumber());
        });
    });

    describe("Set LP token", function () {
        it("Should set LP token", async function () {
            await StakeEmyInstance.setLPToken(Erc20myInstance.address);
            expect(await StakeEmyInstance.lpToken()).to.equal(Erc20myInstance.address);
        });
    });

    describe("Set pool", function () {
        it("Should set pool", async function () {
            await StakeEmyInstance.setPool(100);
            expect(await StakeEmyInstance.pool()).to.equal(100);
        });
    });

    describe("unstakes", function () {
        it("Should unstake tokens", async function () {
            let setLPTokenTx = await StakeEmyInstance.setLPToken(Erc20myInstance.address);
            await setLPTokenTx.wait();
            
            const stake = 100;
            await Erc20myInstance.approve(StakeEmyInstance.address, stake);
            await StakeEmyInstance.stake(stake);
            await StakeEmyInstance.unstake(stake);
            expect(await StakeEmyInstance.balanceOf(owner.address)).to.equal(0);
            expect(await StakeEmyInstance.allStaked()).to.equal(0);
        });

        it("Should unstake & claim tokens", async function () {
            let setLPTokenTx = await StakeEmyInstance.setLPToken(Erc20myInstance.address);
            await setLPTokenTx.wait();
            
            const stake = 100;
            const initialBalance = await Erc20myInstance.balanceOf(owner.address) || 0;
            await Erc20myInstance.approve(StakeEmyInstance.address, stake);
            const timestampBeforeStakeOwner = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp;
            await StakeEmyInstance.stake(stake);

            await ethers.provider.send("evm_mine", [timestampBeforeStakeOwner + 3 * coolDown]);

            let tx = await StakeEmyInstance.unstake(stake);
            await tx.wait();

            expect(await Erc20myInstance.balanceOf(owner.address)).to.equal(initialBalance.add(pool * 3));
        });
    });

    describe("Cooldown", function () {
        it("Should set cool down", async function () {
            await StakeEmyInstance.setCooldown(coolDown + 1);
            expect(await StakeEmyInstance.coolDown()).to.equal(coolDown + 1);
        });
    });

    describe("Set admin", function () {
        it("Should set admin", async function () {
            await StakeEmyInstance.setAdmin(addr1.address);
            await StakeEmyInstance.connect(addr1).setLPToken(Erc20myInstance.address);
        });
    });

    describe("Set reward token", function () {
        it("Should set reward token", async function () {
            await StakeEmyInstance.setAdmin(addr1.address);
            await StakeEmyInstance.connect(addr1).setRewardToken(Erc20myInstance.address);
            expect(await StakeEmyInstance.rewardToken()).to.equal(Erc20myInstance.address);
        });
    });


});
