Rinkeby contract 
Erc20My: https://rinkeby.etherscan.io/address/0x158e339A1E75D13d87372c41B8a2442Dd4593a74
StakeEmy: https://rinkeby.etherscan.io/address/0xdD4ad5e39666E0EdC360B626662cE2303dA99A0A
pair: 0x8be8575d45b0b497a6f74531ace239913f9c4971

Tasks:
```
npx hardhat transfer --to 0xd88647bB0Eb39FF7bAaE7FEC1Bb75332A385dF6A --value 950000000000000000 --network rinkeby
npx hardhat approve --spender 0xd88647bB0Eb39FF7bAaE7FEC1Bb75332A385dF6A --value 50000000000000000 --network rinkeby
npx hardhat transferfrom --from 0x3C96E5Cfc585847aE330fa1A7f35647744d85F1D --to 0x3C96E5Cfc585847aE330fa1A7f35647744d85F1D --value 50000000000000000 --network rinkeby  
```

`.env` constants
```
PRIVATE_KEY=""
ALCHEMY_API_KEY=""
CONTRACT=""
ETHERSCAN=""
```

`npx hardhat node --fork https://eth-mainnet.alchemyapi.io/v2/<key>`
`npx hardhat test --network hardhat`
`npx hardhat coverage --network hardhat`

deploy 
`npx hardhat run --network rinkeby scripts/deploy.ts`

`npx hardhat verify --network rinkeby --constructor-args arguments.js 0x158e339A1E75D13d87372c41B8a2442Dd4593a74`

`npx hardhat verify --network rinkeby --constructor-args arguments-staking.js 0xdD4ad5e39666E0EdC360B626662cE2303dA99A0A`
