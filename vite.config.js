import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'path';
import dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';
import etherResolver from './vite-import-resolver';

// Load environment variables
dotenvExpand.expand(dotenv.config());

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');
  
  console.log('Loaded env ENABLE_MOCK_MODE:', env.ENABLE_MOCK_MODE);
  
  // Default environment variables for Netlify
  const defaultEnv = {
    MONAD_TESTNET_RPC: "https://rpc.testnet-m1.monad.xyz/m1",
    CONTRACT_ADDRESS: "0x0000000000000000000000000000000000000000",
    WALLET_ADDRESS: "",
    ENABLE_MOCK_MODE: "true",
    PRIVATE_KEY: "",
    GAS_LIMIT: "3000000",
    MAX_PRIORITY_FEE_PER_GAS: "100000000000",
    MAX_FEE_PER_GAS: "100000000000",
    CHAIN_ID: "1331",
    MAX_TX_PER_MINUTE: "100",
    THROTTLE_INTERVAL: "5000",
  };
  
  // Use env variables or fallback to defaults
  const resolvedEnv = {};
  Object.keys(defaultEnv).forEach(key => {
    resolvedEnv[key] = env[key] || defaultEnv[key];
  });
  
  return {
    // Custom plugins
    plugins: [etherResolver()],
    
    // Expose .env variables to your Vite app
    define: {
      'process.env': {
        MONAD_TESTNET_RPC: JSON.stringify(resolvedEnv.MONAD_TESTNET_RPC),
        CONTRACT_ADDRESS: JSON.stringify(resolvedEnv.CONTRACT_ADDRESS),
        WALLET_ADDRESS: JSON.stringify(resolvedEnv.WALLET_ADDRESS),
        ENABLE_MOCK_MODE: JSON.stringify(resolvedEnv.ENABLE_MOCK_MODE === "true"),
        PRIVATE_KEY: JSON.stringify(resolvedEnv.PRIVATE_KEY),
        GAS_LIMIT: JSON.stringify(resolvedEnv.GAS_LIMIT),
        MAX_PRIORITY_FEE_PER_GAS: JSON.stringify(resolvedEnv.MAX_PRIORITY_FEE_PER_GAS),
        MAX_FEE_PER_GAS: JSON.stringify(resolvedEnv.MAX_FEE_PER_GAS),
        CHAIN_ID: JSON.stringify(resolvedEnv.CHAIN_ID),
        MAX_TX_PER_MINUTE: JSON.stringify(resolvedEnv.MAX_TX_PER_MINUTE),
        THROTTLE_INTERVAL: JSON.stringify(resolvedEnv.THROTTLE_INTERVAL),
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
          target: resolvedEnv.MONAD_TESTNET_RPC,
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
      emptyOutDir: true,
      commonjsOptions: {
        transformMixedEsModules: true,
      },
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor': ['three'],
          }
        },
        external: ['ethers']
      }
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        'ethers': resolve(__dirname, 'node_modules/ethers')
      }
    },
    optimizeDeps: {
      include: ['three'],
      exclude: ['ethers'],
      esbuildOptions: {
        target: 'es2020'
      }
    }
  };
}); 