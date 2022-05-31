import "dotenv/config";
import { task } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";
import { Contract } from "@ethersproject/contracts";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import fs from "fs";

export function tasks() {

    const PRIVATE_KEY = process.env.PRIVATE_KEY || '';
    const BridgeContracts: { [name: string]: string } = {
        'rinkeby': process.env.CONTRACT_BridgeRinkeby || '',
        'bscTestnet': process.env.CONTRACT_BridgeBSC || '',
    };

    const initBlockchainBridgeTask = async (hre: HardhatRuntimeEnvironment, contract: string): Promise<Contract> => {
        let provider = hre.ethers.provider;
        let signer = new hre.ethers.Wallet(PRIVATE_KEY, provider);

        const MyBridge = await hre.ethers.getContractFactory("MyBridge");
        const MyBridgeInstance = await MyBridge.attach(contract).connect(signer);

        return MyBridgeInstance;
    }
    const getSignatureFromEvent = (hre: HardhatRuntimeEnvironment, tx: any): Promise<string> => {
        return hre.ethers.utils.defaultAbiCoder.decode(
            ['address', 'address', 'uint256', 'uint256', 'uint256', 'bytes'],
            [...tx?.events ?? []][1].data
        )[5];
    }

    task("swap", "Swap tokens")
        .addParam("amount", "integer")
        .addParam("nonce", "integer")
        .setAction(async ({ amount, nonce }, hre) => {
            const instance = await initBlockchainBridgeTask(hre, BridgeContracts[hre.network.name]);
            var tx = await instance.swap(amount, nonce);
            console.log(await getSignatureFromEvent(hre, await tx.wait()));
        });

    task("redeem", "Redeem tokens")
        .addParam("amount", "integer")
        .addParam("nonce", "integer")
        .addParam("signature", "string")
        .setAction(async ({ amount, nonce, signature }, hre) => {
            const instance = await initBlockchainBridgeTask(hre, BridgeContracts[hre.network.name]);
            await instance.redeem(amount, nonce, signature);
        });

    task("nonce", "Get next nonce")
        .addParam("address", "string")
        .setAction(async ({ address }, hre) => {
            const instance = await initBlockchainBridgeTask(hre, BridgeContracts[hre.network.name]);
            console.log(await instance.nextNonce(address));
        });

    task("initothertoken", "Set otherToken to one from another network")
    .addParam("from", "string")
    .addParam("to", "string")
    .setAction(async ({ from, to }, hre) => {
        const values = JSON.parse(fs.readFileSync(`./deployed-${from}.json`, 'utf8'));
        const valuesTo = JSON.parse(fs.readFileSync(`./deployed-${to}.json`, 'utf8'));
        const instance = await initBlockchainBridgeTask(hre, BridgeContracts[from]);
        await instance.addOtherToken(values.Erc20my, valuesTo.Erc20my);
    });
}