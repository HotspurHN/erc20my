import { ethers } from "hardhat";

async function main() {
  console.log("start");
  const Erc20my = await ethers.getContractFactory("Erc20my");
  console.log("Erc20my started deploy");
  const Erc20myInstance = await Erc20my.deploy("Erc20my", "EMY", 18, '1000000000000000000000000', {gasPrice: '68813487855'});
  await Erc20myInstance.deployed();
  console.log("Erc20my deployed to:", Erc20myInstance.address);
  const StakeEmy = await ethers.getContractFactory("StakeEmy");
  console.log("StakeEmyInstance started deploy");
  const StakeEmyInstance = await StakeEmy.deploy(Erc20myInstance.address, '10000000000000000', 120, 260, {gasPrice: '68813487855'});
  await StakeEmyInstance.deployed();
  console.log("StakeEmyInstance deployed to:", StakeEmyInstance.address);
  await Erc20myInstance.setMinter(StakeEmyInstance.address, {gasPrice: '68813487855'});
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
