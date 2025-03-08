const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

// Load environment variables
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const WALLET_ADDRESS = process.env.WALLET_ADDRESS;
const MONAD_TESTNET_RPC = process.env.MONAD_TESTNET_RPC;
const CONTRACT_ADDRESS_PATH = path.join(__dirname, "..", ".env");

async function main() {
  console.log("Starting deployment process to Monad network...");
  console.log(`Using wallet address: ${WALLET_ADDRESS}`);

  // Check required environment variables
  if (!PRIVATE_KEY || !WALLET_ADDRESS || !MONAD_TESTNET_RPC) {
    console.error("❌ Missing required environment variables. Check .env file.");
    process.exit(1);
  }

  try {
    // Get contract factory
    const WWEMonad = await ethers.getContractFactory("WWEMonad");
    console.log("Deploying WWEMonad contract...");

    // Deploy contract
    const contract = await WWEMonad.deploy();
    console.log("Waiting for deployment transaction to be mined...");
    
    // Wait for deployment to complete
    await contract.deployed();

    // Get deployed contract address
    const contractAddress = contract.address;
    console.log(`🎮 WWE Monad contract deployed to: ${contractAddress}`);

    // Update .env file with the new contract address
    try {
      let envFile = fs.readFileSync(CONTRACT_ADDRESS_PATH, 'utf8');
      envFile = envFile.replace(
        /CONTRACT_ADDRESS=.*/g,
        `CONTRACT_ADDRESS=${contractAddress}`
      );
      fs.writeFileSync(CONTRACT_ADDRESS_PATH, envFile);
      console.log("✅ .env file updated with new contract address");
    } catch (error) {
      console.error("❌ Failed to update .env file with contract address:", error);
      console.log(`Please manually update CONTRACT_ADDRESS in your .env file to: ${contractAddress}`);
    }

    // Verification instructions
    console.log("\n✨ Next steps:");
    console.log("1. Visit https://explorer.monad.xyz/address/" + contractAddress);
    console.log("2. Update your frontend with the new contract address");
    console.log("3. Run tests with: npx hardhat run scripts/test-contract.js --network monadTestnet\n");

    return contractAddress;
  } catch (error) {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }
}

// Execute main function and handle errors
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment error:", error);
    process.exit(1);
  }); 