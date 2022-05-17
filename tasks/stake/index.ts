import "dotenv/config";
import { HardhatUserConfig, task } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";
import { Contract } from "@ethersproject/contracts";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const PRIVATE_KEY = process.env.PRIVATE_KEY || '';
const STAKING_CONTRACT = process.env.STAKING_CONTRACT || '';

const initStakeBlockchainTask = async (hre: HardhatRuntimeEnvironment): Promise<Contract> => {
    let provider = hre.ethers.provider;
    let signer = new hre.ethers.Wallet(PRIVATE_KEY, provider);

    const StakeEmy = await hre.ethers.getContractFactory("StakeEmy");
    const StakeEmyInstance = await StakeEmy.attach(STAKING_CONTRACT).connect(signer);

    return StakeEmyInstance;
}

export default [
    task("setlptoken", "set LP token")
        .addParam("address", "string")
        .setAction(async ({ address }, hre) => {
            const instance = await initStakeBlockchainTask(hre);
            await instance.setLPToken(address);
        }),

    task("setcooldown", "set Cooldown")
        .addParam("value", "integer")
        .setAction(async ({ value }, hre) => {
            const instance = await initStakeBlockchainTask(hre);
            await instance.setCooldown(value);
        }),

    task("setpool", "set Pool")
        .addParam("value", "integer")
        .setAction(async ({ value }, hre) => {
            const instance = await initStakeBlockchainTask(hre);
            await instance.setPool(value);
        }),

    task("stake", "Stake lp tokens")
        .addParam("value", "integer")
        .setAction(async ({ value }, hre) => {
            const instance = await initStakeBlockchainTask(hre);
            await instance.stake(value);
        }),

    task("unstake", "Unstake lp tokens")
        .addParam("value", "integer")
        .setAction(async ({ value }, hre) => {
            const instance = await initStakeBlockchainTask(hre);
            await instance.unstake(value);
        }),

    task("claim", "Claim reward")
        .addParam("value", "integer")
        .setAction(async ({ value }, hre) => {
            const instance = await initStakeBlockchainTask(hre);
            await instance.claim(value);
        })
]