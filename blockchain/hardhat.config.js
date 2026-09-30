require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config({ path: "../server/.env" });

const PRIVATE_KEY = process.env.POLYGON_PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000001";

module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.20",
        settings: {
          optimizer: { enabled: true, runs: 200 },
          viaIR: true
        }
      },
      {
        version: "0.8.24",
        settings: {
          optimizer: { enabled: true, runs: 200 },
          viaIR: true
        }
      }
    ]
  },
  networks: {
    amoy: {
      url: "https://polygon-amoy.drpc.org",
      accounts: [PRIVATE_KEY],
      chainId: 80002
    },
    polygon: {
      url: "https://polygon-rpc.com",
      accounts: [PRIVATE_KEY],
      chainId: 137
    }
  }
};
