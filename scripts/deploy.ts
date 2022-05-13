import { ethers } from "hardhat";

async function main() {
  const Erc20my = await ethers.getContractFactory("Erc20my");
  const Erc20myInstance = await Erc20my.deploy("Erc20my", "EMY", 18, '1000000000000000000000000');

  await Erc20myInstance.deployed();

  console.log("Erc20my deployed to:", Erc20myInstance.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
