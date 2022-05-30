import { ethers, run } from "hardhat";

async function main() {
  const Erc20my = await ethers.getContractFactory("Erc20my");
  const Erc20myInstance = await Erc20my.deploy("Erc20my", "EMY", 18, '1000000000000000000000000');

  await Erc20myInstance.deployed();

  const MyBridge = await ethers.getContractFactory("MyBridge");
  const MyBridgeInstance = await MyBridge.deploy(Erc20myInstance.address);

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
  console.log("MyBridge deployed to:", MyBridgeInstance.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
