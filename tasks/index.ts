import "dotenv/config";
import { HardhatUserConfig, task } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";
import { Contract } from "@ethersproject/contracts";
import { HardhatRuntimeEnvironment } from "hardhat/types";

export function tasks() {

  const PRIVATE_KEY = process.env.PRIVATE_KEY || '';
  const CONTRACT = process.env.CONTRACT || '';
  const CONTRACT_BridgeRinkeby = process.env.CONTRACT_BridgeRinkeby || '';
  const CONTRACT_BridgeBsc = process.env.CONTRACT_BridgeBsc || '';

  const initBlockchainTask = async (hre: HardhatRuntimeEnvironment): Promise<Contract> => {
    let provider = hre.ethers.provider;
    let signer = new hre.ethers.Wallet(PRIVATE_KEY, provider);

    const Erc20my = await hre.ethers.getContractFactory("Erc20my");
    const Erc20myInstance = await Erc20my.attach(CONTRACT).connect(signer);

    return Erc20myInstance;
  }
  const initBlockchainBridgeTask = async (hre: HardhatRuntimeEnvironment, contract: string): Promise<Contract> => {
    let provider = hre.ethers.provider;
    let signer = new hre.ethers.Wallet(PRIVATE_KEY, provider);

    const MyBridge = await hre.ethers.getContractFactory("MyBridge");
    const MyBridgeInstance = await MyBridge.attach(contract).connect(signer);

    return MyBridgeInstance;
  }
  const getSignatureFromEvent = (hre: HardhatRuntimeEnvironment, tx: any): Promise<string> => {
    console.log([...tx?.events ?? []]);
    return hre.ethers.utils.defaultAbiCoder.decode(
      ['address', 'address', 'uint256', 'uint256', 'uint256', 'bytes'],
      [...tx?.events ?? []][1].data
    )[5];
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

  task("swaprinkeby", "Swap tokens")
    .addParam("amount", "integer")
    .addParam("nonce", "integer")
    .setAction(async ({ amount, nonce }, hre) => {
      const instance = await initBlockchainBridgeTask(hre, CONTRACT_BridgeRinkeby);
      var tx = await instance.swap(amount, nonce);
      console.log(await getSignatureFromEvent(hre, tx));
    });
    task("swapbsc", "Swap tokens")
      .addParam("amount", "integer")
      .addParam("nonce", "integer")
      .setAction(async ({ amount, nonce }, hre) => {
        const instance = await initBlockchainBridgeTask(hre, CONTRACT_BridgeBsc);
        var tx = await instance.swap(amount, nonce);
        console.log(await getSignatureFromEvent(hre, tx));
      });

  task("redeemrinkeby", "Redeem tokens")
    .addParam("amount", "integer")
    .addParam("nonce", "integer")
    .addParam("signature", "string")
    .setAction(async ({ amount, nonce, signature }, hre) => {
      const instance = await initBlockchainBridgeTask(hre, CONTRACT_BridgeRinkeby);
      await instance.redeem(amount, nonce, signature);
    });

    task("redeembsc", "Redeem tokens")
      .addParam("amount", "integer")
      .addParam("nonce", "integer")
      .addParam("signature", "string")
      .setAction(async ({ amount, nonce, signature }, hre) => {
        const instance = await initBlockchainBridgeTask(hre, CONTRACT_BridgeBsc);
        await instance.redeem(amount, nonce, signature);
      });
}