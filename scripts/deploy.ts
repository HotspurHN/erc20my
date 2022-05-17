import { ethers, run } from "hardhat";
import { StakeEmy } from "../typechain-types/StakeEmy";
import { Erc20my } from "../typechain-types/Erc20my";
import { IUniswapV2Router02 } from "../typechain-types/uniswap/IUniswapV2Router02";
import { IUniswapV2Factory } from "../typechain-types/uniswap/IUniswapV2Factory";
import { IErc20 } from "../typechain-types/interfaces/IErc20";
import tools from "./tools";
import constants from "./constants";
//, {gasPrice: '68813487855'}

async function main() {
  console.log("start");
  const Erc20my = await ethers.getContractFactory("Erc20my");
  console.log("Erc20my started deploy");
  const Erc20myInstance = <Erc20my>await Erc20my.deploy("Erc20my", "EMY", 18, '1000000000000000000000000', { gasPrice: '18813487855' });
  await Erc20myInstance.deployed();
  console.log("Erc20my deployed to:", Erc20myInstance.address);
  const StakeEmy = await ethers.getContractFactory("StakeEmy");
  console.log("StakeEmyInstance started deploy");
  const StakeEmyInstance = <StakeEmy>await StakeEmy.deploy(Erc20myInstance.address, '10000000000000000', 120, 260, { gasPrice: '18813487855' });
  await StakeEmyInstance.deployed();
  console.log("StakeEmyInstance deployed to:", StakeEmyInstance.address);
  await Erc20myInstance.setMinter(StakeEmyInstance.address);

  console.log("verifing");
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
      address: StakeEmyInstance.address,
      constructorArguments: [
        Erc20myInstance.address,
        '10000000000000000',
        120,
        260
      ],
    });
  }
  catch (ex) {
    console.log("verify failed", StakeEmyInstance.address);
  }

  const Router = <IUniswapV2Router02>await ethers.getContractAt("IUniswapV2Router02", constants.uniswapRouterAddress);
  console.log("creating pair");
  const pairErc20 = await tools._setLPToken(Erc20myInstance, StakeEmyInstance, Router, (await ethers.getSigners())[0].address, '10000000000000000000000', '10000000000000000');
  console.log("pair:", pairErc20.address);

  console.log("finish:", pairErc20.address);
  console.log({
    "Erc20my": Erc20myInstance.address,
    "Erc20Url": `https://rinkeby.etherscan.io/address/${Erc20myInstance.address}`,
    "StakeEmy": StakeEmyInstance.address,
    "StakeEmyUrl": `https://rinkeby.etherscan.io/address/${StakeEmyInstance.address}`,
    "pair": pairErc20.address,
    "pairUrl": `https://rinkeby.etherscan.io/address/${pairErc20.address}`
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
