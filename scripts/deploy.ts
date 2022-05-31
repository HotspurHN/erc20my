import { ethers, run, network } from "hardhat";
import fs from "fs";

async function main() {
  const Erc20my = await ethers.getContractFactory("Erc20my");
  const Erc20myInstance = await Erc20my.deploy("Erc20my", "EMY", 18, '1000000000000000000000000');

  await Erc20myInstance.deployed();

  const MyBridge = await ethers.getContractFactory("MyBridge");
  const MyBridgeInstance = await MyBridge.deploy(Erc20myInstance.address, '0x0000000000000000000000000000000000000000');

  await Erc20myInstance.deployed();
  await Erc20myInstance.setMinter(MyBridgeInstance.address);

  try {
    await run("verify:verify", {
      address: Erc20myInstance.address,
      constructorArguments: [
        "Erc20my",
        "EMY",
        18,
        '1000000000000000000000000'
      ],
    });
  }
  catch (ex) {
    console.log("verify failed", Erc20myInstance.address);
  }

  try {
    await run("verify:verify", {
      address: MyBridgeInstance.address,
      constructorArguments: [
        Erc20myInstance.address
      ],
    });
  }
  catch (ex) {
    console.log("verify failed", MyBridgeInstance.address);
  }

  console.log("Erc20my deployed to:", Erc20myInstance.address);
  if (network.name === "bscTestnet") {
    console.log(`https://testnet.bscscan.com/address/${Erc20myInstance.address}#writeContract`);
  } else if (network.name === "rinkeby") {
    console.log(`https://rinkeby.etherscan.io/address/${Erc20myInstance.address}#writeContract`);
  }

  console.log("MyBridge deployed to:", MyBridgeInstance.address);
  if (network.name === "bscTestnet") {
    console.log(`https://testnet.bscscan.com/address/${MyBridgeInstance.address}#writeContract`);
  } else if (network.name === "rinkeby") {
    console.log(`https://rinkeby.etherscan.io/address/${MyBridgeInstance.address}#writeContract`);
  }

  await fs.writeFile(`./deployed-${network.name}.json`, JSON.stringify({
    Erc20my: Erc20myInstance.address,
    MyBridge: MyBridgeInstance.address
  }), (err) => { });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
