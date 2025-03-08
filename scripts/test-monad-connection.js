// Test script for Monad connection
const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("Testing Monad connection and contract...");

  // Load environment variables
  const PRIVATE_KEY = process.env.PRIVATE_KEY;
  const WALLET_ADDRESS = process.env.WALLET_ADDRESS;
  const MONAD_TESTNET_RPC = process.env.MONAD_TESTNET_RPC;
  const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
  
  console.log("Environment configuration:");
  console.log(`- MONAD_TESTNET_RPC: ${MONAD_TESTNET_RPC}`);
  console.log(`- CONTRACT_ADDRESS: ${CONTRACT_ADDRESS}`);
  console.log(`- WALLET_ADDRESS: ${WALLET_ADDRESS}`);
  console.log(`- PRIVATE_KEY: ${PRIVATE_KEY ? "Set (hidden)" : "Not set"}`);
  
  try {
    // Check provider connection
    console.log("\nConnecting to provider...");
    const provider = new ethers.providers.JsonRpcProvider(MONAD_TESTNET_RPC);
    const network = await provider.getNetwork();
    console.log(`Connected to network: ${network.name} (Chain ID: ${network.chainId})`);
    
    // Get the latest block
    const latestBlock = await provider.getBlockNumber();
    console.log(`Latest block number: ${latestBlock}`);
    
    const blockData = await provider.getBlock(latestBlock);
    console.log(`Latest block hash: ${blockData.hash}`);
    console.log(`Latest block timestamp: ${new Date(blockData.timestamp * 1000).toISOString()}`);
    
    // Test wallet connection
    console.log("\nChecking wallet...");
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    console.log(`Wallet address: ${wallet.address}`);
    
    const balance = await provider.getBalance(wallet.address);
    console.log(`Wallet balance: ${ethers.utils.formatEther(balance)} ETH`);
    
    // Test contract connection
    if (CONTRACT_ADDRESS) {
      console.log("\nChecking contract...");
      
      // Get contract ABI from the artifacts
      const WWEMonad = await ethers.getContractFactory("WWEMonad");
      
      // Connect to the deployed contract
      const contract = WWEMonad.attach(CONTRACT_ADDRESS).connect(wallet);
      console.log(`Connected to contract at: ${CONTRACT_ADDRESS}`);
      
      // Test contract read methods
      try {
        const owner = await contract.owner();
        console.log(`Contract owner: ${owner}`);
        
        // Try to get player stats for our address
        const playerStats = await contract.getPlayerStats(wallet.address);
        console.log("Player stats:");
        console.log(`- Total moves: ${playerStats.totalMoves.toString()}`);
        console.log(`- Special moves: ${playerStats.specialMoves.toString()}`);
        console.log(`- Grapples: ${playerStats.grapples.toString()}`);
        console.log(`- Rope bounces: ${playerStats.ropeBounces.toString()}`);
        console.log(`- Knockouts: ${playerStats.knockouts.toString()}`);
        console.log(`- Championships: ${playerStats.championships.toString()}`);
        
        // Test a simple log action transaction 
        console.log("\nTesting a simple transaction (logAction)...");
        const actionData = JSON.stringify({
          type: "test",
          details: { test: true, timestamp: Date.now() }
        });
        
        // Calculate gas parameters - using much higher values based on Monad requirements
        const gasLimit = ethers.utils.hexlify(3000000);
        const maxFeePerGas = ethers.utils.hexlify(100000000000);  // 100 gwei, much higher
        const maxPriorityFeePerGas = ethers.utils.hexlify(100000000000);  // 100 gwei
        
        // Get latest nonce
        const nonce = await provider.getTransactionCount(wallet.address, "pending");
        
        // Send transaction
        console.log("Sending transaction...");
        console.log(`Using nonce: ${nonce}`);
        console.log(`Gas parameters: maxFeePerGas=${maxFeePerGas}, maxPriorityFeePerGas=${maxPriorityFeePerGas}`);
        
        const tx = await contract.logAction(actionData, {
          gasLimit,
          maxFeePerGas,
          maxPriorityFeePerGas,
          nonce
        });
        
        console.log(`Transaction sent! Hash: ${tx.hash}`);
        console.log(`Waiting for transaction to be mined...`);
        
        // Wait for transaction receipt
        const receipt = await tx.wait();
        console.log(`Transaction mined in block: ${receipt.blockNumber}`);
        console.log(`Gas used: ${receipt.gasUsed.toString()}`);
        
        // Check if player stats updated
        console.log("\nChecking updated player stats...");
        const updatedStats = await contract.getPlayerStats(wallet.address);
        console.log(`Total moves (before): ${playerStats.totalMoves.toString()}`);
        console.log(`Total moves (after): ${updatedStats.totalMoves.toString()}`);
        
        // Verify transaction on block explorer
        console.log(`\nView your transaction on the explorer:`);
        console.log(`https://explorer.monad.xyz/tx/${tx.hash}`);
        
      } catch (contractError) {
        console.error("Error interacting with contract:", contractError);
      }
    } else {
      console.log("\nNo contract address provided. Skipping contract tests.");
    }
    
    console.log("\n✅ Connection test completed successfully!");
    
  } catch (error) {
    console.error("\n❌ Connection test failed:", error);
    console.error("Error details:", error.message);
    
    if (error.code) {
      console.error(`Error code: ${error.code}`);
      
      // Common error handling
      if (error.code === "NETWORK_ERROR") {
        console.log("\nPossible solutions:");
        console.log("1. Check if MONAD_TESTNET_RPC is correct");
        console.log("2. Check your internet connection");
        console.log("3. Verify that the Monad testnet is online");
      } else if (error.code === "INVALID_ARGUMENT") {
        console.log("\nPossible solutions:");
        console.log("1. Check if your PRIVATE_KEY is correctly formatted");
        console.log("2. Verify CONTRACT_ADDRESS format");
      }
    }
    
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Unhandled error:", error);
    process.exit(1);
  }); 