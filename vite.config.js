import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');
  
  console.log('Loaded env ENABLE_MOCK_MODE:', env.ENABLE_MOCK_MODE);
  
  return {
    // Expose .env variables to your Vite app
    define: {
      'process.env': {
        MONAD_TESTNET_RPC: JSON.stringify(env.MONAD_TESTNET_RPC || "https://testnet-rpc.monad.xyz/"),
        CONTRACT_ADDRESS: JSON.stringify(env.CONTRACT_ADDRESS || ""),
        WALLET_ADDRESS: JSON.stringify(env.WALLET_ADDRESS || ""),
        ENABLE_MOCK_MODE: JSON.stringify(env.ENABLE_MOCK_MODE === "true"),
        PRIVATE_KEY: JSON.stringify(env.PRIVATE_KEY || ""),
        GAS_LIMIT: JSON.stringify(env.GAS_LIMIT || "3000000"),
        MAX_PRIORITY_FEE_PER_GAS: JSON.stringify(env.MAX_PRIORITY_FEE_PER_GAS || "100000000000"),
        MAX_FEE_PER_GAS: JSON.stringify(env.MAX_FEE_PER_GAS || "100000000000"),
        CHAIN_ID: JSON.stringify(env.CHAIN_ID || "10143"),
        MAX_TX_PER_MINUTE: JSON.stringify(env.MAX_TX_PER_MINUTE || "100"),
        THROTTLE_INTERVAL: JSON.stringify(env.THROTTLE_INTERVAL || "5000"),
      }
    },
    
    // Server configuration
    server: {
      port: 5173,
      strictPort: false,
      open: true,
      cors: true,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'X-Requested-With, Content-Type, Authorization'
      },
      proxy: {
        // Proxy Monad RPC requests if needed
        '/monad-rpc': {
          target: env.MONAD_TESTNET_RPC || 'https://testnet-rpc.monad.xyz/',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/monad-rpc/, ''),
          secure: false
        }
      }
    },
    
    // Build configuration
    build: {
      sourcemap: true,
      outDir: 'dist',
      commonjsOptions: {
        transformMixedEsModules: true,
      },
      rollupOptions: {
        output: {
          manualChunks: {
            'ethers': ['ethers'],
            'three': ['three'],
          }
        }
      }
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src')
      }
    },
    optimizeDeps: {
      include: ['three', 'ethers'],
      esbuildOptions: {
        target: 'es2020'
      }
    }
  };
}); 