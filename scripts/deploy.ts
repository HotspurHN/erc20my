import { ethers, run } from "hardhat";
import { Erc20my } from "../typechain-types/Erc20my";
import { Erc721my } from "../typechain-types/contracts/Erc721my";
import { Erc1155my } from "../typechain-types/contracts/Erc1155my";
import { NFTMarketplace } from "../typechain-types/contracts/NFTMarketplace";

const images = ['QmZWbZ7ogH3ER5EvBFPYfWkpZnY8zZttfUnSWZGgw8mKje', 'QmXYqZXwFxHJvNdDaJfrYFrGaCJgmJW8zK4ifYBM5r3vYJ'];
//, {gasPrice: '68813487855'}

async function main() {
  const [owner] = await ethers.getSigners();
  console.log("start");
  const Erc20my = await ethers.getContractFactory("Erc20my");
  console.log("Erc20my started deploy");
  const Erc20myInstance = <Erc20my>await Erc20my.deploy("Erc20my", "EMY", 18, '1000000000000000000000000', { gasPrice: '18813487855' });
  await Erc20myInstance.deployed();
  console.log("Erc20my deployed to:", Erc20myInstance.address);
  
  const Erc721my = await ethers.getContractFactory("Erc721my");
  console.log("Erc721my started deploy");
  const Erc721myInstance = <Erc721my>await Erc721my.deploy();
  await Erc721myInstance.deployed();
  console.log("Erc721my deployed to:", Erc721myInstance.address);
  
  const Erc1155my = await ethers.getContractFactory("Erc1155my");
  console.log("Erc1155my started deploy");
  const Erc1155myInstance = <Erc1155my>await Erc1155my.deploy();
  await Erc1155myInstance.deployed();
  console.log("Erc1155my deployed to:", Erc1155myInstance.address);

  const NFTMarketplace = await ethers.getContractFactory("NFTMarketplace");
  console.log("NFTMarketplace started deploy");
  const NFTMarketplaceInstance = <NFTMarketplace>await NFTMarketplace.deploy(Erc20myInstance.address, 10, 10, 120, Erc721myInstance.address, Erc1155myInstance.address);
  await NFTMarketplaceInstance.deployed();
  console.log("NFTMarketplace deployed to:", NFTMarketplaceInstance.address);

  await Erc721myInstance.setMinter(NFTMarketplaceInstance.address);
  await Erc1155myInstance.setMinter(NFTMarketplaceInstance.address);
  
  console.log("mint 721");
  await NFTMarketplaceInstance.createItemErc721(`ipfs://${images[0]}`);

  console.log("mint 1155");
  await NFTMarketplaceInstance.createItemErc1155(`ipfs://${images[1]}`, 100);

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
      address: Erc721myInstance.address,
      constructorArguments: [],
    });
  }
  catch (ex) {
    console.log("verify failed", Erc721myInstance.address);
  }
  try {
    await run("verify:verify", {
      address: Erc1155myInstance.address,
      constructorArguments: [],
    });
  }
  catch (ex) {
    console.log("verify failed", Erc1155myInstance.address);
  }
  try {
    await run("verify:verify", {
      address: NFTMarketplaceInstance.address,
      constructorArguments: [Erc20myInstance.address, 10, 10, 120, Erc721myInstance.address, Erc1155myInstance.address],
    });
  }
  catch (ex) {
    console.log("verify failed", NFTMarketplaceInstance.address);
  }

  console.log("finish");
  console.log({
    "Erc20my": Erc20myInstance.address,
    "Erc20Url": `https://rinkeby.etherscan.io/address/${Erc20myInstance.address}`,
    "Erc721my": Erc721myInstance.address,
    "Erc721Url": `https://rinkeby.etherscan.io/address/${Erc721myInstance.address}`,
    "Erc1155my": Erc1155myInstance.address,
    "Erc1155Url": `https://rinkeby.etherscan.io/address/${Erc1155myInstance.address}`,
    "NFTMarketplace": NFTMarketplaceInstance.address,
    "NFTMarketplaceUrl": `https://rinkeby.etherscan.io/address/${NFTMarketplaceInstance.address}`,
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
