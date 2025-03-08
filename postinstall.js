// postinstall.js - Fixes any potential issues after npm install
const fs = require('fs');
const path = require('path');

console.log('Running postinstall script to fix any dependency issues...');

// Ensure ethers can be properly resolved
try {
  const ethersPath = path.join(__dirname, 'node_modules', 'ethers');
  if (fs.existsSync(ethersPath)) {
    console.log('Ethers package found, checking if it needs configuration tweaks...');
    
    // Check if package.json needs to be modified to handle ESM/CJS compatibility
    const pkgPath = path.join(ethersPath, 'package.json');
    if (fs.existsSync(pkgPath)) {
      let pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      let modified = false;
      
      // Ensure we have the correct browser field
      if (!pkg.browser || typeof pkg.browser !== 'object') {
        pkg.browser = pkg.browser || {};
        modified = true;
      }
      
      // Make sure the ESM related fields are properly set
      if (!pkg.module) {
        pkg.module = './lib.esm/index.js';
        modified = true;
      }
      
      if (modified) {
        console.log('Updating ethers package.json to improve compatibility...');
        fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
      }
    }
  } else {
    console.warn('Could not find ethers package, skipping configuration tweaks.');
  }
} catch (err) {
  console.error('Error fixing ethers package:', err);
}

// Create a .env file if it doesn't exist
try {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) {
    console.log('Creating a default .env file...');
    const defaultEnv = `# Monad Network Configuration
MONAD_TESTNET_RPC=https://rpc.testnet-m1.monad.xyz/m1
CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000
CHAIN_ID=1331

# Transaction Settings
GAS_LIMIT=3000000
MAX_FEE_PER_GAS=100000000000
MAX_PRIORITY_FEE_PER_GAS=100000000000
THROTTLE_INTERVAL=2000
MAX_TX_PER_MINUTE=30

# Game Settings
ENABLE_MOCK_MODE=true`;
    
    fs.writeFileSync(envPath, defaultEnv);
    console.log('.env file created successfully');
  }
} catch (err) {
  console.error('Error creating .env file:', err);
}

console.log('Postinstall script completed.'); 