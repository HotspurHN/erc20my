
const { ethers } = require("hardhat");
import { StakeEmy } from "../typechain-types/StakeEmy";
import { Erc20my } from "../typechain-types/Erc20my";
import { IUniswapV2Router02 } from "../typechain-types/uniswap/IUniswapV2Router02";
import { IUniswapV2Factory } from "../typechain-types/uniswap/IUniswapV2Factory";
import { IErc20 } from "../typechain-types/interfaces/IErc20";
import constants from "../scripts/constants";
import { string } from "hardhat/internal/core/params/argumentTypes";
const Web3 = require('web3');
const web3 = new Web3();

export default {
    _setLPToken: async (
        Erc20myInstance: Erc20my,
        StakeEmyInstance: StakeEmy,
        Router: IUniswapV2Router02,
        ownerAddress: string,
        tokenValue: string,
        ethValue: string) => {

        const time = Math.floor(Date.now() / 1000) + 200000;
        const deadline = ethers.BigNumber.from(time);

        await Erc20myInstance.approve(constants.uniswapRouterAddress,
            ethers.BigNumber.from(tokenValue));

        var tx = await Router.addLiquidityETH(
            Erc20myInstance.address,
            ethers.BigNumber.from(tokenValue),
            ethers.BigNumber.from(tokenValue),
            ethers.BigNumber.from(ethValue),
            ownerAddress,
            deadline, { value: ethers.BigNumber.from(ethValue) });
        var logs = await tx.wait();

        const pair = web3.eth.abi.decodeParameter('address', logs.logs[0].data);
        await StakeEmyInstance.setLPToken(pair);

        return await ethers.getContractAt("IErc20", pair);
    }
};