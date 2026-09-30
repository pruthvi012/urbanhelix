require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config({ path: "../server/.env" });

module.exports = {
  solidity: "0.8.20",
  networks: {
    amoy: {
      url: "https://rpc-amoy.polygon.technology",
      accounts: [process.env.POLYGON_PRIVATE_KEY],
      chainId: 80002
    },
    polygon: {
      url: "https://polygon-rpc.com",
      accounts: [process.env.POLYGON_PRIVATE_KEY],
      chainId: 137
    }
  }
};
