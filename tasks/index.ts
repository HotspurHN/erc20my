import "dotenv/config";
import "@nomiclabs/hardhat-ethers";

export function tasks() {

  require("./erc20.ts").tasks();
  require("./bridge.ts").tasks();

}