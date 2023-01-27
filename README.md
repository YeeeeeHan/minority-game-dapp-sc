## Overview
- Project description
- Project Demo

## Project Set-Up
Install dependencies
```bash
# Backend deps
npm install

# Frontend deps
cd frontend && npm install
```

Development
```bash
npm run dev
```

Truffle
```bash
# Create truffle-config.js
truffle init

# Compile contracts
truffle compile

# Open up truffle console
truffle develop

# ==== Within truffle console: ====

# Run unit tests
truffle test

# Deploy contract to local blockchain
migrate --reset

# Deploy contract to public testnet
migrate --reset --network goerli
```

Hardhat
```bash
npx hardhat compile

# Run test
npx hardhat test

# Deploy to local development node
npx hardhat node
npx hardhat run scripts/deploy.js --network localhost

# Testing in console
npx hardhat console --network localhost
> const Box = await ethers.getContractFactory('Box');
> const box = await Box.attach('0x5FbDB2315678afecb367f032d93F642f64180aa3')
undefined
> await box.store(42)
> await box.retrieve()

# Deploy to goerli 
npx hardhat run scripts/deploy.js --network goerli // Remember to update .env file to include the deployed contract address
```

## Project deployment
```bash
$ heroku login

# create the app
$ heroku create <name-of-app>

# sign into Container Registry
heroku container:login

# tweak this default setting on Heroku through the NODE_OPTIONS env var so that the process can address all of the memory available
heroku config:set NODE_OPTIONS="--max_old_space_size=2560" -a <name-of-app>

# Push changes
 git push heroku master
```

## Updating packages:
```bash
npm i -g npm-check-updates

# Only update the versions in package.json to the latest version
ncu -u

# Update packages in /node_modules to the latest version
npm update

```

## Postman templates:
```bash

```

## Project Structure
```bash
.
|-- backend
|   |-- config
|   |   `-- db.js    (Connecting to database)
|   |-- controllers    (Logic to interact with database)
|   |-- middleware    (Functions that are run on routes)
|   |-- models    (Schema information)
|   |-- postman     (Postman-related files)
|   |-- routes      (Endpoints)
|   `-- server.js    (Express server config)
|-- frontend
|   |-- README.md
|   |-- public
|   `-- src
|       |-- App.js
|       |-- app
|       |   `-- store.js     (Redux Store)
|       |-- components     (React components)
|       |-- features     (Feature containing: service[axios requests], slice[redux specifications])
|       |-- index.js
|       |-- pages     (React pages)
|-- readme.md
`-- solidity
    |-- artifacts           (ABIs)
    |-- cache
    |-- contracts           (smart contracts)
    |   `-- Box.sol 
    |-- hardhat.config.js
    |-- package-lock.json
    |-- package.json
    |-- scripts
    |   `-- deploy.js      (Deploy script)
    `-- test               (Test scripts)
        `-- Box.test.js
```

## Template information
- book: frontend > service > backend | No Authentication
- goals: frontend > dispatch(slice) > service > backend | Contains authentication
- user: Authentication and authorisation