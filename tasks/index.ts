import "dotenv/config";
import { HardhatUserConfig, task } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";
import { Contract } from "@ethersproject/contracts";
import { HardhatRuntimeEnvironment } from "hardhat/types";

export function tasks() {

  const PRIVATE_KEY = process.env.PRIVATE_KEY || '';
  const CONTRACT = process.env.CONTRACT || '';
  const STAKING_CONTRACT = process.env.STAKING_CONTRACT || '';

  const initBlockchainTask = async (hre: HardhatRuntimeEnvironment): Promise<Contract> => {
    let provider = hre.ethers.provider;
    let signer = new hre.ethers.Wallet(PRIVATE_KEY, provider);

    const Erc20my = await hre.ethers.getContractFactory("Erc20my");
    const Erc20myInstance = await Erc20my.attach(CONTRACT).connect(signer);

    return Erc20myInstance;
  }

  const initStakeBlockchainTask = async (hre: HardhatRuntimeEnvironment): Promise<Contract> => {
    let provider = hre.ethers.provider;
    let signer = new hre.ethers.Wallet(PRIVATE_KEY, provider);

    const StakeEmy = await hre.ethers.getContractFactory("StakeEmy");
    const StakeEmyInstance = await StakeEmy.attach(STAKING_CONTRACT).connect(signer);

    return StakeEmyInstance;
  }

  task("transfer", "Transfer tokens")
    .addParam("to", "string")
    .addParam("value", "integer")
    .setAction(async ({ to, value }, hre) => {
      const instance = await initBlockchainTask(hre);
      await instance.transfer(to, value);
    });

  task("transferfrom", "Transfer tokens from another account")
    .addParam("from", "string")
    .addParam("to", "string")
    .addParam("value", "integer")
    .setAction(async ({ from, to, value }, hre) => {
      const instance = await initBlockchainTask(hre);
      await instance.transferFrom(from, to, value);
    });

  task("approve", "Approve tokens for another account")
    .addParam("spender", "string")
    .addParam("value", "integer")
    .setAction(async ({ spender, value }, hre) => {
      const instance = await initBlockchainTask(hre);
      await instance.approve(spender, value);
    });

  task("set LP token", "set LP token")
    .addParam("address", "string")
    .setAction(async ({ address }, hre) => {
      const instance = await initStakeBlockchainTask(hre);
      await instance.setLPToken(address);
    });

  task("set Cooldown", "set Cooldown")
    .addParam("value", "integer")
    .setAction(async ({ value }, hre) => {
      const instance = await initStakeBlockchainTask(hre);
      await instance.setCooldown(value);
    });

    task("set Pool", "set Pool")
      .addParam("value", "integer")
      .setAction(async ({ value }, hre) => {
        const instance = await initStakeBlockchainTask(hre);
        await instance.setPool(value);
      });

  task("stake", "Stake lp tokens")
    .addParam("value", "integer")
    .setAction(async ({ value }, hre) => {
      const instance = await initStakeBlockchainTask(hre);
      await instance.stake(value);
    });

  task("unstake", "Unstake lp tokens")
    .addParam("value", "integer")
    .setAction(async ({ value }, hre) => {
      const instance = await initStakeBlockchainTask(hre);
      await instance.unstake(value);
    });

  task("claim", "Claim reward")
    .addParam("value", "integer")
    .setAction(async ({ value }, hre) => {
      const instance = await initStakeBlockchainTask(hre);
      await instance.claim(value);
    });
}