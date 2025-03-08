// Configuration for Monad blockchain integration
export const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || "0x2D8C8ccE5f3E693102dF1121d86228844155db8F";
export const MONAD_TESTNET_RPC = process.env.MONAD_TESTNET_RPC || "https://testnet-rpc.monad.xyz";
export const WALLET_ADDRESS = process.env.WALLET_ADDRESS || "0x5f8cD364Eae5F793C5DF8E4545C2a8fA4f55b23a";
export const GAS_LIMIT = process.env.GAS_LIMIT || "3000000";
export const MAX_FEE_PER_GAS = process.env.MAX_FEE_PER_GAS || "100000000000";
export const MAX_PRIORITY_FEE_PER_GAS = process.env.MAX_PRIORITY_FEE_PER_GAS || "100000000000";
export const ENABLE_MOCK_MODE = process.env.ENABLE_MOCK_MODE === "true";
export const THROTTLE_INTERVAL = parseInt(process.env.THROTTLE_INTERVAL || "5000");
export const MAX_TX_PER_MINUTE = parseInt(process.env.MAX_TX_PER_MINUTE || "100");
export const NFT_METADATA_URI = process.env.NFT_METADATA_URI || "ipfs://QmTrophyMetadata/{id}.json";
export const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
export const CHAIN_ID = process.env.CHAIN_ID || "10143";

// WWE-specific action types and their MONAD costs
export const ACTION_COSTS = {
  "move": 8,            // Basic character movement (WASD)
  "special_move": 9,    // Special move execution
  "grapple": 7,         // Successful grapple
  "rope_bounce": 0.5,   // Ring rope bounce
  "championship": 50,   // Championship win (plus NFT mint)
  "knockout": 20        // Knocking out an opponent
};

// Define contract ABI for the WWEMonad contract
export const WWEMONAD_ABI = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "player",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "action",
        "type": "string"
      }
    ],
    "name": "ActionLogged",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "previousOwner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "OwnershipTransferred",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "player",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "TrophyMinted",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "CHAMPIONSHIP_TROPHY",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "player",
        "type": "address"
      }
    ],
    "name": "getPlayerStats",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "totalMoves",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "specialMoves",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "grapples",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "ropeBounces",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "knockouts",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "championships",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "lastAction",
            "type": "uint256"
          }
        ],
        "internalType": "struct WWEMonad.PlayerStats",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "action",
        "type": "string"
      }
    ],
    "name": "logAction",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "mintNewTrophy",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "winner",
        "type": "address"
      }
    ],
    "name": "mintTrophy",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "playerStats",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "totalMoves",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "specialMoves",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "grapples",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "ropeBounces",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "knockouts",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "championships",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "lastAction",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "renounceOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "_newBaseURI",
        "type": "string"
      }
    ],
    "name": "setBaseURI",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "transferOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_id",
        "type": "uint256"
      }
    ],
    "name": "uri",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
]; 