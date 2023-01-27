const { run } = require("hardhat");

const network = {
  80001: "polygon_mumbai",
  137: "polygon",
};

const verify = async (contractAddress, args) => {
  console.log("Verifying contract...");

  try {
    // -----  EXAMPLE -----
    // await hre.run("verify:verify", {
    //   address: contractAddress,
    //   constructorArguments: [
    //     50,
    //     "a string argument",
    //     {
    //       x: 10,
    //       y: 5,
    //     },
    //     "0xabcdef",
    //   ],
    // });
    await run("verify:verify", {
      address: contractAddress,
      constructorArguments: args,
    });
  } catch (e) {
    console.log(e);
  }
};

module.exports = verify;
