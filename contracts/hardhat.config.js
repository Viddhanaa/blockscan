require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    viddhana: {
      url: process.env.RPC_URL || "http://localhost:8545",
      chainId: 1337,
      accounts: process.env.OWNER_PRIVATE_KEY 
        ? [process.env.OWNER_PRIVATE_KEY] 
        : [],
    },
    localhost: {
      url: "http://localhost:8545",
      chainId: 1337,
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};
