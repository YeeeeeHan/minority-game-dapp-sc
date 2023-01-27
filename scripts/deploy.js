const dotenv = require("dotenv");
dotenv.config();
const { ethers } = require("hardhat");
const verify = require("./verify-contract");

const { TICKET_PRICE_GWEI } = process.env;

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  const MinorityGameFactory = await ethers.getContractFactory("MinorityGame");
  console.log("Deploying MinorityGame...");
  const MinorityGameContract = await MinorityGameFactory.deploy(
    TICKET_PRICE_GWEI
  );
  await MinorityGameContract.deployed();

  console.log("Contract deployed to:", MinorityGameContract.address);

  await verify(MinorityGameContract.address, [TICKET_PRICE_GWEI]);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
