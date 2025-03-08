const fs = require('fs');
const path = require('path');

// Create a minimal .env file with default values if none exists
// This ensures the build doesn't fail due to missing environment variables
function setupEnvFile() {
  const envPath = path.join(__dirname, '.env');
  
  // Check if .env file exists
  if (!fs.existsSync(envPath)) {
    console.log('Creating default .env file for build...');
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
  } else {
    console.log('Using existing .env file');
  }
}

// Patch vite.config.js to ensure it works with dotenv
function patchViteConfig() {
  const viteConfigPath = path.join(__dirname, 'vite.config.js');
  
  if (fs.existsSync(viteConfigPath)) {
    let viteConfig = fs.readFileSync(viteConfigPath, 'utf8');
    
    // Ensure dotenv is correctly loaded early in the file
    if (!viteConfig.includes('const dotenv = require(\'dotenv\')')) {
      viteConfig = `const dotenv = require('dotenv');
const dotenvExpand = require('dotenv-expand');
dotenvExpand.expand(dotenv.config());

${viteConfig}`;
      
      fs.writeFileSync(viteConfigPath, viteConfig);
      console.log('vite.config.js patched successfully');
    }
  }
}

// Run the setup functions
setupEnvFile();
patchViteConfig();

console.log('Netlify pre-build setup completed successfully'); 