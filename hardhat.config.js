require('@nomicfoundation/hardhat-toolbox')
require("@nomiclabs/hardhat-truffle5")
const dotenv = require('dotenv')
dotenv.config()

// Go to https://www.alchemyapi.io, sign up, create
// a new App in its dashboard, and replace "KEY" with its key
const ALCHEMY_LINK = process.env.DEV_ALCHEMY

// Replace this private key with your Goerli account private key
// To export your private key from Metamask, open Metamask and
// go to Account Details > Export Private Key
// Beware: NEVER put real Ether into testing accounts
const GOERLI_PRIVATE_KEY = process.env.DEV_WALLET
const ETHERSCAN_API = process.env.ETHERSCAN_API

module.exports = {
  solidity: '0.8.15',
  networks: {
    goerli: {
      url: `${ALCHEMY_LINK}`,
      accounts: [GOERLI_PRIVATE_KEY],
    },
  },
  etherscan: {
    apiKey: {
      goerli: ETHERSCAN_API
    },
  },
}
