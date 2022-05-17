Rinkeby contract 
Erc20My: https://rinkeby.etherscan.io/address/0xfdDd2E0faEdAFC751151D46dCF4c014E45953561

StakeEmy: https://rinkeby.etherscan.io/address/0xcaFDF7e5876cDdcc6d3A3556fcee0327f05e4E5A

pair: 0x5c0e0726b94ec754c7b85c3f1f534779d3808795

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

`npx hardhat verify --network rinkeby --constructor-args arguments.js 0xfdDd2E0faEdAFC751151D46dCF4c014E45953561`

`npx hardhat verify --network rinkeby --constructor-args arguments-staking.js 0xcaFDF7e5876cDdcc6d3A3556fcee0327f05e4E5A`
