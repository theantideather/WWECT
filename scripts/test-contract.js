// scripts/test-contract.js
const { ethers } = require("hardhat");
require("dotenv").config();

// Mock player actions
const ACTIONS = {
  MOVE: JSON.stringify({
    type: "move",
    details: { direction: "up", characterId: "trump" },
    timestamp: Date.now()
  }),
  SPECIAL_MOVE: JSON.stringify({
    type: "special_move",
    details: { moveType: "MAGA Slam", characterId: "trump" },
    timestamp: Date.now()
  }),
  GRAPPLE: JSON.stringify({
    type: "grapple",
    details: { targetId: "vitalik", characterId: "trump" },
    timestamp: Date.now()
  }),
  ROPE_BOUNCE: JSON.stringify({
    type: "rope_bounce",
    details: { direction: "north", characterId: "trump" },
    timestamp: Date.now()
  }),
  KNOCKOUT: JSON.stringify({
    type: "knockout",
    details: { attackerId: "trump", victimId: "vitalik" },
    timestamp: Date.now()
  }),
  CHAMPIONSHIP: JSON.stringify({
    type: "championship",
    details: { winner: "trump", losers: ["vitalik", "kanye", "sbf"] },
    timestamp: Date.now()
  })
};

// Test function
async function main() {
  // Get contract address from .env or command line
  const contractAddress = process.env.CONTRACT_ADDRESS;
  if (!contractAddress) {
    console.error("❌ CONTRACT_ADDRESS not found in .env file");
    process.exit(1);
  }

  console.log("🧪 Testing WWE Monad contract at:", contractAddress);

  try {
    // Get the contract instance
    const WWEMonad = await ethers.getContractFactory("WWEMonad");
    const contract = WWEMonad.attach(contractAddress);

    // Get test accounts
    const [deployer] = await ethers.getSigners();
    console.log(`Testing with account: ${deployer.address}`);

    // Test logging actions
    console.log("\n📝 Testing logging actions...");
    
    // Test move action
    let tx = await contract.logAction(ACTIONS.MOVE);
    await tx.wait();
    console.log("✅ Move action logged");
    
    // Test special move action
    tx = await contract.logAction(ACTIONS.SPECIAL_MOVE);
    await tx.wait();
    console.log("✅ Special move action logged");
    
    // Test grapple action
    tx = await contract.logAction(ACTIONS.GRAPPLE);
    await tx.wait();
    console.log("✅ Grapple action logged");
    
    // Test rope bounce action
    tx = await contract.logAction(ACTIONS.ROPE_BOUNCE);
    await tx.wait();
    console.log("✅ Rope bounce action logged");
    
    // Test knockout action
    tx = await contract.logAction(ACTIONS.KNOCKOUT);
    await tx.wait();
    console.log("✅ Knockout action logged");
    
    // Test championship action
    tx = await contract.logAction(ACTIONS.CHAMPIONSHIP);
    await tx.wait();
    console.log("✅ Championship action logged");

    // Test minting a trophy
    console.log("\n🏆 Testing trophy minting...");
    tx = await contract.mintTrophy(deployer.address);
    await tx.wait();
    console.log(`✅ Trophy minted for ${deployer.address}`);

    // Test getting player stats
    console.log("\n📊 Fetching player stats...");
    const stats = await contract.getPlayerStats(deployer.address);
    console.log("Player stats:");
    console.log("- Total moves:", stats.totalMoves.toString());
    console.log("- Special moves:", stats.specialMoves.toString());
    console.log("- Grapples:", stats.grapples.toString());
    console.log("- Rope bounces:", stats.ropeBounces.toString());
    console.log("- Knockouts:", stats.knockouts.toString());
    console.log("- Championships:", stats.championships.toString());
    console.log("- Last action timestamp:", new Date(stats.lastAction * 1000).toISOString());

    console.log("\n✨ All tests completed successfully!");
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }
}

// Execute main function
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  }); 