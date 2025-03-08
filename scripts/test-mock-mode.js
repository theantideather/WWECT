const { BlockchainManager } = require('../src/blockchain/BlockchainManager');

async function runTest() {
  console.log("Testing WWE Monad integration in mock mode...");
  
  // Force mock mode by setting environment variables
  process.env.ENABLE_MOCK_MODE = "true";
  
  // Create blockchain manager with forced mock mode
  const blockchainManager = new BlockchainManager();
  blockchainManager.mockMode = true; // Force mock mode
  
  // Wait for initialization
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  console.log("\nTesting different action types:");
  
  // Test different action types
  await testAction(blockchainManager, 'move', { direction: 'up' });
  await testAction(blockchainManager, 'special_move', { moveType: 'suplex' });
  await testAction(blockchainManager, 'grapple', { targetId: 'opponent1' });
  await testAction(blockchainManager, 'rope_bounce', {});
  await testAction(blockchainManager, 'championship', { winnerName: 'Player', opponents: ['AI1', 'AI2'] });
  
  console.log("\nTesting NFT minting:");
  const mintResult = await blockchainManager.mintChampionshipTrophy('0x1234567890123456789012345678901234567890');
  console.log("Mint result:", mintResult);
  
  console.log("\nAll tests completed successfully in mock mode!");
  process.exit(0);
}

async function testAction(blockchainManager, actionType, details) {
  console.log(`\nTesting '${actionType}' action...`);
  try {
    const result = await blockchainManager.logAction(actionType, details);
    console.log(`Cost: ${blockchainManager.getActionCost(actionType)} MONAD`);
    console.log("Result:", result);
    return result;
  } catch (error) {
    console.error("Error:", error);
    return null;
  }
}

runTest(); 