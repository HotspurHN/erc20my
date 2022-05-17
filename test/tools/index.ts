
const { ethers } = require("hardhat");
import { StakeEmy } from "../../typechain-types/StakeEmy";
import { Erc20my } from "../../typechain-types/Erc20my";
import { IUniswapV2Router02 } from "../../typechain-types/uniswap/IUniswapV2Router02";
import { IUniswapV2Factory } from "../../typechain-types/uniswap/IUniswapV2Factory";
import { IErc20 } from "../../typechain-types/interfaces/IErc20";
import constants from "../../scripts/constants";

export default {
    _now: async () => {
        return (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp;
    },
    _mineBlockByTime: async (time: number) => {
        await ethers.provider.send("evm_mine", [time]);
    },
    _increaseTime: async (time: number) => {
        await ethers.provider.send("evm_mine", [(await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp + time]);
    }
};