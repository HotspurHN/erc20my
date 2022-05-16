
const { ethers } = require("hardhat");

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