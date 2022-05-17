import { expect } from "chai";
import { StakeEmy } from "../typechain-types/StakeEmy";
import { Erc20my } from "../typechain-types/Erc20my";
import { IUniswapV2Router02 } from "../typechain-types/uniswap/IUniswapV2Router02";
import { IUniswapV2Factory } from "../typechain-types/uniswap/IUniswapV2Factory";
import { IErc20 } from "../typechain-types/interfaces/IErc20";
const { ethers } = require("hardhat");
import tools from "./tools";

describe("StakeEmy", function () {
    const uniswapRouterAddress: string = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D';
    const uniswapFactoryAddress: string = '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f';
    let WETH: string = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';

    let owner: any;
    let addr1: any;
    let addr2: any;

    let StakeEmy: any;
    let StakeEmyInstance: StakeEmy;
    let Erc20my: any;
    let Erc20myInstance: Erc20my;
    let Router: IUniswapV2Router02;
    let Factory: IUniswapV2Factory;
    let PairErc20: IErc20;

    const tokenName: string = "Erc20my";
    const tokenSymbol: string = "EMY";
    const tokenDecimals: number = 18;
    const tokenTotalSupply: any = ethers.BigNumber.from("1000000000000000000000000");

    const coolDown: number = 10;
    const freeze: number = 20;
    const pool: number = 210000000;

    const _setLPToken = async () => {
        const time = Math.floor(Date.now() / 1000) + 200000;
        const deadline = ethers.BigNumber.from(time);
        let approveTx = await Erc20myInstance.approve(uniswapRouterAddress,
            ethers.BigNumber.from("1000000000000000000000000"));
        await approveTx.wait();

        const liquidity = await Router.addLiquidityETH(
            Erc20myInstance.address,
            ethers.BigNumber.from('10000000000000000000'),
            ethers.BigNumber.from('10000000000000000000'),
            ethers.BigNumber.from('10000000000000000'),
            owner.address,
            deadline, { value: ethers.BigNumber.from('10000000000000000') });
        await liquidity.wait();

        const pair = await Factory.getPair(Erc20myInstance.address, WETH);
        let setLPTokenTx = await StakeEmyInstance.setLPToken(pair);
        await setLPTokenTx.wait();

        PairErc20 = await ethers.getContractAt("IErc20", pair);
    }

    before(async () => {
        [owner, addr1, addr2] = await ethers.getSigners();
        StakeEmy = await ethers.getContractFactory("StakeEmy");
        Erc20my = await ethers.getContractFactory("Erc20my");
        Router = await ethers.getContractAt("IUniswapV2Router02", uniswapRouterAddress);
        Factory = await ethers.getContractAt("IUniswapV2Factory", uniswapFactoryAddress);
    });

    beforeEach(async () => {
        Erc20myInstance = await Erc20my.deploy(tokenName, tokenSymbol, tokenDecimals, tokenTotalSupply);
        await Erc20myInstance.deployed();
        StakeEmyInstance = await StakeEmy.deploy(Erc20myInstance.address, pool, coolDown, freeze);
        await StakeEmyInstance.deployed();
        await owner.sendTransaction({ to: StakeEmyInstance.address, value: ethers.utils.parseEther("0.1") });
        await Erc20myInstance.setMinter(StakeEmyInstance.address);
    });

    describe("balanceOf", function () {
        it("Should return 0 for a non-existent account", async function () {
            expect(await StakeEmyInstance.balanceOf(addr1.address)).to.equal(0);
        });
    });

    describe("stake", function () {
        it("Should stake tokens", async function () {
            await _setLPToken();
            await PairErc20.approve(StakeEmyInstance.address, 100);
            await StakeEmyInstance.stake(100);
            expect(await StakeEmyInstance.balanceOf(owner.address)).to.equal(100);
            expect(await StakeEmyInstance.allStaked()).to.equal(100);
        });

        it("Should stake tokens with a different amount", async function () {
            await _setLPToken();

            await PairErc20.approve(StakeEmyInstance.address, 100);
            await StakeEmyInstance.stake(100);

            await PairErc20.approve(StakeEmyInstance.address, 100);
            await StakeEmyInstance.stake(100);

            expect(await StakeEmyInstance.balanceOf(owner.address)).to.equal(200);
            expect(await StakeEmyInstance.allStaked()).to.equal(200);
        });

        it("Should fail if not enough tokens are approved", async function () {
            await StakeEmyInstance.setLPToken(PairErc20.address);

            await expect(StakeEmyInstance.stake(100)).to.be.revertedWith("Not enough allowance");
        });

        it("Should fail if lpToken not set", async function () {
            await expect(StakeEmyInstance.stake(100)).to.be.revertedWith("lpToken not set");
        });

        it("Should fail if not enough tokens are available", async function () {
            await _setLPToken();
            await PairErc20.connect(addr1).approve(StakeEmyInstance.address, 100);
            await expect(StakeEmyInstance.connect(addr1).stake(100)).to.be.revertedWith("Not enough balance");
        });
    });

    describe("unstake", function () {
        it("Should unstake tokens", async function () {
            await _setLPToken();

            const stake = 100;
            await PairErc20.approve(StakeEmyInstance.address, stake);
            await StakeEmyInstance.stake(stake);
            await tools._increaseTime(freeze);
            await StakeEmyInstance.unstake(stake);
            expect(await StakeEmyInstance.balanceOf(owner.address)).to.equal(0);
            expect(await StakeEmyInstance.allStaked()).to.equal(0);
        });

        it("Should unstake & claim tokens", async function () {
            await _setLPToken();

            const stake = 100;
            const initialBalance = await Erc20myInstance.balanceOf(owner.address) || 0;
            await PairErc20.approve(StakeEmyInstance.address, stake);
            const timestampBeforeStakeOwner = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp;
            await StakeEmyInstance.stake(stake);

            await tools._mineBlockByTime(timestampBeforeStakeOwner + 3 * coolDown);

            let tx = await StakeEmyInstance.unstake(stake);
            await tx.wait();
            expect(await Erc20myInstance.balanceOf(owner.address)).to.equal(initialBalance.add(pool * 3));
        });

        it("Should not unstake if not enough time has passed", async function () {
            await _setLPToken();

            const stake = 100;
            await PairErc20.approve(StakeEmyInstance.address, stake);
            await StakeEmyInstance.stake(stake);

            await expect(StakeEmyInstance.unstake(stake)).to.be.revertedWith("Tokens still frozen");
        });

        it ("Should fail if not enough tokens are staked", async function () {	
            await _setLPToken();

            const stake = 100;
            await PairErc20.approve(StakeEmyInstance.address, stake);
            await expect(StakeEmyInstance.unstake(stake)).to.be.revertedWith("Not enough balance");
        });

        it ("Should fail if not set lpToken", async function () {
            await expect(StakeEmyInstance.unstake(100)).to.be.revertedWith("lpToken not set");
        });
    });

    describe("claim", function () {
        it("Should claim tokens", async function () {
            await _setLPToken();
            const initialBalance = await Erc20myInstance.balanceOf(owner.address) || 0;
            const stake = 100;

            await PairErc20.approve(StakeEmyInstance.address, stake);
            await StakeEmyInstance.stake(stake);

            await ethers.provider.send("evm_increaseTime", [coolDown]);
            await ethers.provider.send("evm_mine");

            await StakeEmyInstance.claim();
            expect(await Erc20myInstance.balanceOf(owner.address)).to.equal(initialBalance.add(pool));
        });

        it("Should not claim tokens if not enough time has passed", async function () {
            await _setLPToken();
            const initialBalance = await Erc20myInstance.balanceOf(owner.address) || 0;
            const stake = 100;

            await PairErc20.approve(StakeEmyInstance.address, stake);
            await StakeEmyInstance.stake(stake);

            await StakeEmyInstance.claim();
            expect(await Erc20myInstance.balanceOf(owner.address)).to.equal(initialBalance);
        });

        it("Should not claim tokens if not enough tokens are staked", async function () {
            await _setLPToken();
            await expect(StakeEmyInstance.claim()).to.be.revertedWith("No balance to claim");
        });

        it("Should claim tokens divided by the number of stakers", async function () {
            await _setLPToken();

            const initialBalance = await Erc20myInstance.balanceOf(owner.address) || 0;
            const stake = 100;
            const stake1 = 50;
            const stake2 = 25;

            await PairErc20.approve(StakeEmyInstance.address, stake);
            await PairErc20.transfer(addr1.address, stake1);
            await PairErc20.transfer(addr2.address, stake2);
            await PairErc20.connect(addr1).approve(StakeEmyInstance.address, stake1);
            await PairErc20.connect(addr2).approve(StakeEmyInstance.address, stake2);

            const timestampBeforeStakeOwner = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp;
            await StakeEmyInstance.stake(stake);

            const timestampBeforeStake1 = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp;
            await StakeEmyInstance.connect(addr1).stake(stake1);

            await tools._mineBlockByTime(timestampBeforeStakeOwner + 3 * coolDown);
            await StakeEmyInstance.claim();

            await tools._mineBlockByTime(timestampBeforeStake1 + 4 * coolDown);
            await StakeEmyInstance.connect(addr1).claim();

            const timestampBeforeStake2 = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp;
            await StakeEmyInstance.connect(addr2).stake(stake2);

            await tools._mineBlockByTime(timestampBeforeStake2 + 5 * coolDown);
            await StakeEmyInstance.connect(addr2).claim();
            await StakeEmyInstance.claim();

            const balance1 = await Erc20myInstance.balanceOf(addr1.address);
            const balance2 = await Erc20myInstance.balanceOf(addr2.address);
            const balanceOwner = await Erc20myInstance.balanceOf(owner.address);

            const bo = initialBalance.add(Math.round(pool * stake * 4 / (stake + stake1)) + Math.round(pool * stake * 5 / (stake + stake1 + stake2)));
            const b1 = Math.round(pool * stake1 * 4 / (stake + stake1));
            const b2 = Math.round(pool * stake2 * 5 / (stake + stake1 + stake2));

            expect(1.01).to.above(bo.sub(balanceOwner).toNumber());
            expect(-1.01).to.below(bo.sub(balanceOwner).toNumber());
            expect(1.01).to.above(balance1.sub(b1).toNumber());
            expect(-1.01).to.below(balance1.sub(b1).toNumber());
            expect(1.01).to.above(balance2.sub(b2).toNumber());
            expect(-1.01).to.below(balance2.sub(b2).toNumber());
        });

        it ("Should not be possible to claim is lpToken is not set", async function () {
            await expect(StakeEmyInstance.claim()).to.be.revertedWith("lpToken not set");
        });
    });

    describe("Set LP token", function () {
        it("Should set LP token", async function () {
            await StakeEmyInstance.setLPToken(Erc20myInstance.address);
            expect(await StakeEmyInstance.lpToken()).to.equal(Erc20myInstance.address);
        });

        it ("Should not be possible to set LP token if not admin or owner", async function () {
            await expect(StakeEmyInstance.connect(addr1).setLPToken(Erc20myInstance.address)).to.be.revertedWith("Only owner or admin allowed");
        });

        it ("Should not be possible to set lp token if it is already set", async function () {
            await StakeEmyInstance.setLPToken(Erc20myInstance.address);
            await expect(StakeEmyInstance.setLPToken(Erc20myInstance.address)).to.be.revertedWith("lpToken already set");
        });
    });

    describe("Set pool", function () {
        it("Should set pool", async function () {
            await StakeEmyInstance.setPool(100);
            expect(await StakeEmyInstance.pool()).to.equal(100);
        });
    });

    describe("Set admin", function () {
        it("Should set admin", async function () {
            await StakeEmyInstance.setAdmin(addr1.address);
            await StakeEmyInstance.connect(addr1).setLPToken(Erc20myInstance.address);
        });

        it("Should not be possible to set admin if not owner", async function () {
            await expect(StakeEmyInstance.connect(addr1).setAdmin(addr2.address)).to.be.revertedWith("VM Exception while processing transaction: revert");
        });
    });

});
