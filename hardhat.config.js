/**
 * @type import('hardhat/config').HardhatUserConfig
 */
require("@nomiclabs/hardhat-ethers");
require("dotenv").config();
require("dotenv-expand").expand(require("dotenv").config());

// Load environment variables
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const MONAD_TESTNET_RPC = process.env.MONAD_TESTNET_RPC || "https://rpc.testnet-m1.monad.xyz/m1";
const CHAIN_ID = parseInt(process.env.CHAIN_ID || "1331");

// Ensure private key exists
if (!PRIVATE_KEY) {
  console.warn("WARNING: No private key found in .env file. You won't be able to deploy contracts.");
}

module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  defaultNetwork: "hardhat",
  networks: {
    // Monad Testnet network
    monadTestnet: {
      url: MONAD_TESTNET_RPC,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      chainId: CHAIN_ID,
      gasPrice: "auto",
      gas: parseInt(process.env.GAS_LIMIT || "3000000"),
      maxFeePerGas: parseInt(process.env.MAX_FEE_PER_GAS || "1000000000") * 10, // Multiply by 10 to ensure it's high enough
      maxPriorityFeePerGas: parseInt(process.env.MAX_PRIORITY_FEE_PER_GAS || "1000000000") * 10, // Multiply by 10 to ensure it's high enough
    },
    // Hardhat local network for testing
    hardhat: {
      chainId: 31337,
    },
    // Local development network
    localhost: {
      url: "http://localhost:8545",
      chainId: 31337,
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  mocha: {
    timeout: 20000 // 20 seconds for running tests
  },
  etherscan: {
    // API key configuration for block explorer verification
    // For Monad, this configuration may change based on their verification system
    apiKey: {
      monadTestnet: "not-required-yet" // Will update when Monad provides etherscan compatibility
    },
    customChains: [
      {
        network: "monadTestnet",
        chainId: CHAIN_ID,
        urls: {
          apiURL: "https://explorer.monad.xyz/api",
          browserURL: "https://explorer.monad.xyz"
        }
      }
    ]
  },
  // Contract size optimization
  contractSizer: {
    alphaSort: true,
    runOnCompile: true,
    disambiguatePaths: false,
  }
}; 