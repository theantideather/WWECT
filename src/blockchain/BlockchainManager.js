// Use a more compatible way to import ethers
// This avoids ESM/CJS compatibility issues during the build process
let ethers;
try {
  // Try different import approaches to handle build environments
  if (typeof require !== 'undefined') {
    ethers = require('ethers');
  } else {
    import('ethers').then(module => {
      ethers = module;
    });
  }
} catch (error) {
  console.error('Error importing ethers:', error);
}

// Import configuration
import * as config from './config.js';

// BlockchainManager handles all blockchain interactions
class BlockchainManager {
    constructor() {
        console.log('🚀 Initializing BlockchainManager');
        this.connected = false;
        this.provider = null;
        this.signer = null;
        this.contract = null;
        this.wallet = null;
        this.network = 'Monad Testnet';
        
        // Transaction throttling
        this.pendingTransactions = [];
        this.recentTransactions = [];
        this.isSendingTransaction = false;
        
        // Use the environment variable for mock mode
        console.log('Raw ENABLE_MOCK_MODE value:', process.env.ENABLE_MOCK_MODE);
        this.mockMode = process.env.ENABLE_MOCK_MODE === true;
        console.log('Parsed mock mode:', this.mockMode);
        
        // Keep track of all transactions for UI display
        this.allTransactions = [];
        
        // Add event emitter for transaction events
        this.transactionEvents = {
            listeners: {},
            
            on: (event, callback) => {
                if (!this.transactionEvents.listeners[event]) {
                    this.transactionEvents.listeners[event] = [];
                }
                this.transactionEvents.listeners[event].push(callback);
            },
            
            emit: (event, data) => {
                if (this.transactionEvents.listeners[event]) {
                    this.transactionEvents.listeners[event].forEach(callback => callback(data));
                }
            }
        };
        
        // Initialize the connection
        this.initialize();
    }
    
    async initialize() {
        console.log('Initializing BlockchainManager');
        console.log('Environment variables:', {
            MONAD_TESTNET_RPC: process.env.MONAD_TESTNET_RPC,
            CONTRACT_ADDRESS: process.env.CONTRACT_ADDRESS,
            WALLET_ADDRESS: process.env.WALLET_ADDRESS,
            ENABLE_MOCK_MODE: process.env.ENABLE_MOCK_MODE,
            CHAIN_ID: process.env.CHAIN_ID
        });
        
        if (this.mockMode) {
            console.log('Running in mock mode - blockchain transactions will be simulated');
            this.connected = true;
            this.wallet = { address: config.WALLET_ADDRESS || process.env.WALLET_ADDRESS };
            return;
        }
        
        try {
            // Connect to Monad testnet
            const rpcUrl = config.MONAD_TESTNET_RPC || process.env.MONAD_TESTNET_RPC;
            if (!rpcUrl) {
                throw new Error("No RPC URL provided");
            }
            
            console.log('Connecting to RPC URL:', rpcUrl);
            // Use the ethers library after we've ensured it's loaded
            if (!ethers) {
                throw new Error("Ethers library not loaded yet");
            }
            this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
            
            // Use environment private key
            const privateKey = config.PRIVATE_KEY || process.env.PRIVATE_KEY;
            if (privateKey) {
                console.log('Using private key from environment');
                this.signer = new ethers.Wallet(privateKey, this.provider);
                this.wallet = {
                    address: this.signer.address
                };
                console.log('Wallet address:', this.wallet.address);
            } else {
                console.warn('No private key found in environment variables');
                this.wallet = { address: config.WALLET_ADDRESS || process.env.WALLET_ADDRESS || "0x0000000000000000000000000000000000000000" };
                console.log('Using fallback wallet address:', this.wallet.address);
            }
            
            // Initialize contract
            const contractAddress = config.CONTRACT_ADDRESS || process.env.CONTRACT_ADDRESS;
            if (contractAddress) {
                console.log('Initializing contract at:', contractAddress);
                this.contract = new ethers.Contract(
                    contractAddress,
                    config.WWEMONAD_ABI,
                    this.signer
                );
                console.log('Contract initialized');
                
                // Check contract connection
                try {
                    // Try a read-only call to verify contract connection
                    const owner = await this.contract.owner();
                    console.log('Connected to contract. Owner:', owner);
                } catch (e) {
                    console.error('Error checking contract connection:', e);
                    console.log('Contract might be invalid or not deployed');
                }
            } else {
                console.warn('No contract address provided, falling back to mock mode');
                this.mockMode = true;
                return;
            }
            
            this.connected = true;
            console.log(`Connected to ${this.network} with address ${this.wallet.address}`);
            
            // Start processing queued transactions
            this.startTransactionProcessor();
            
        } catch (error) {
            console.error('Failed to initialize blockchain connection:', error);
            console.error('Error details:', error.message);
            if (error.code) {
                console.error('Error code:', error.code);
            }
            console.log('Falling back to mock mode');
            this.mockMode = true; // Fall back to mock mode
        }
    }
    
    // Queue a transaction to log a game action
    async logAction(actionType, actionDetails = {}) {
        console.log(`BlockchainManager.logAction called with type: ${actionType}`, actionDetails);
        
        // Get current time
        const timestamp = Date.now();
        
        // Create action data JSON
        const actionData = JSON.stringify({
            type: actionType,
            details: actionDetails,
            timestamp
        });
        
        console.log('Action data:', actionData);
        
        if (this.mockMode) {
            console.log(`[MOCK] Logging action: ${actionData}`);
            const mockTxHash = `mock-tx-${timestamp}-${Math.random().toString(36).substring(2, 8)}`;
            
            // Add to transactions list for UI
            const mockTx = {
                hash: mockTxHash,
                actionType,
                timestamp,
                mock: true
            };
            
            this.allTransactions.unshift(mockTx);
            
            // Emit transaction event for UI updates
            this.transactionEvents.emit('transaction', mockTx);
            
            return { success: true, hash: mockTxHash };
        }
        
        // Check if we're connected
        if (!this.connected || !this.contract) {
            console.error('Not connected to blockchain');
            return { success: false, error: 'Not connected to blockchain' };
        }
        
        console.log('Queueing transaction for', actionType);
        
        // Add to pending transactions queue
        return new Promise((resolve, reject) => {
            this.pendingTransactions.push({
                actionType,
                actionData,
                resolve,
                reject,
                timestamp
            });
            
            // Immediately trigger processing if this is the only transaction
            if (this.pendingTransactions.length === 1 && !this.isSendingTransaction) {
                console.log('Immediately processing transaction');
                this.processNextTransaction();
            }
            
            console.log('Transaction queued. Pending count:', this.pendingTransactions.length);
        });
    }
    
    startTransactionProcessor() {
        setInterval(() => {
            this.processNextTransaction();
        }, parseInt(config.THROTTLE_INTERVAL || process.env.THROTTLE_INTERVAL || 5000));
        
        // Clean up old transactions from the recent list every minute
        setInterval(() => {
            const now = Date.now();
            this.recentTransactions = this.recentTransactions.filter(tx => 
                now - tx.timestamp < 60000 // Keep transactions from the last minute
            );
        }, 60000);
        
        console.log('Transaction processor started');
    }
    
    // Process the next transaction in the queue
    async processNextTransaction() {
        console.log('Processing next transaction, queue length:', this.pendingTransactions.length);
        
        if (this.isSendingTransaction) {
            console.log('Already processing a transaction, will try again later');
            return;
        }
        
        if (this.pendingTransactions.length === 0) {
            console.log('No pending transactions to process');
            return;
        }
        
        // Check if we're exceeding the rate limit
        const now = Date.now();
        const oneMinuteAgo = now - 60000;
        const recentTxCount = this.recentTransactions.filter(tx => tx.timestamp > oneMinuteAgo).length;
        
        if (recentTxCount >= config.MAX_TX_PER_MINUTE) {
            console.warn(`Transaction rate limit reached: ${recentTxCount}/${config.MAX_TX_PER_MINUTE} per minute`);
            // Try again in a bit
            setTimeout(() => this.processNextTransaction(), config.THROTTLE_INTERVAL);
            return;
        }
        
        // Set the flag to prevent concurrent processing
        this.isSendingTransaction = true;
        
        // Get the next transaction from the queue
        const tx = this.pendingTransactions.shift();
        console.log('Processing transaction:', tx.actionType);
        
        try {
            if (!ethers) {
                throw new Error("Ethers library not available");
            }
            // Prepare transaction parameters with appropriate gas settings
            const overrides = {
                gasLimit: ethers.utils.hexlify(parseInt(config.GAS_LIMIT)),
                maxFeePerGas: ethers.utils.parseUnits(
                    (config.MAX_FEE_PER_GAS || "100000000000").toString(), 
                    "wei"
                ),
                maxPriorityFeePerGas: ethers.utils.parseUnits(
                    (config.MAX_PRIORITY_FEE_PER_GAS || "100000000000").toString(), 
                    "wei"
                )
            };
            
            console.log('Transaction gas parameters:', {
                gasLimit: overrides.gasLimit.toString(),
                maxFeePerGas: ethers.utils.formatUnits(overrides.maxFeePerGas, "gwei") + " gwei",
                maxPriorityFeePerGas: ethers.utils.formatUnits(overrides.maxPriorityFeePerGas, "gwei") + " gwei"
            });
            
            // Call the contract method
            const transaction = await this.contract.logAction(tx.actionData, overrides);
            console.log('Transaction sent:', transaction.hash);
            
            // Add to all transactions list for UI
            const txObject = {
                hash: transaction.hash,
                actionType: tx.actionType,
                timestamp: tx.timestamp,
                status: 'pending'
            };
            
            this.allTransactions.unshift(txObject);
            
            // Add to recent transactions for rate limiting
            this.recentTransactions.push({
                hash: transaction.hash,
                timestamp: Date.now()
            });
            
            // Keep recent transactions list manageable
            if (this.recentTransactions.length > 100) {
                this.recentTransactions = this.recentTransactions.slice(0, 100);
            }
            
            // Wait for transaction to be mined
            console.log('Waiting for transaction to be mined...');
            const receipt = await transaction.wait();
            console.log('Transaction mined:', receipt);
            
            // Update transaction status
            const txIndex = this.allTransactions.findIndex(t => t.hash === transaction.hash);
            if (txIndex !== -1) {
                this.allTransactions[txIndex].status = 'confirmed';
                this.allTransactions[txIndex].blockNumber = receipt.blockNumber;
                this.allTransactions[txIndex].gasUsed = receipt.gasUsed.toString();
            }
            
            // Emit transaction event for UI updates
            this.transactionEvents.emit('transaction', {
                ...txObject,
                status: 'confirmed',
                receipt
            });
            
            // Reset the flag
            this.isSendingTransaction = false;
            
            // Resolve the promise with success
            tx.resolve({ success: true, hash: transaction.hash, receipt });
            
            // Try to process the next transaction immediately
            if (this.pendingTransactions.length > 0) {
                this.processNextTransaction();
            }
            
        } catch (error) {
            console.error('Error processing transaction:', error);
            console.error('Error details:', error.message);
            if (error.code) {
                console.error('Error code:', error.code);
            }
            
            // Create error transaction for UI
            const errorTx = {
                hash: `error-${Date.now()}`,
                actionType: tx.actionType,
                timestamp: tx.timestamp,
                status: 'error',
                error: error.message
            };
            
            this.allTransactions.unshift(errorTx);
            
            // Emit transaction error event for UI updates
            this.transactionEvents.emit('transactionError', errorTx);
            
            // Reset the flag
            this.isSendingTransaction = false;
            
            // Reject the promise with error
            tx.reject({ success: false, error: error.message });
            
            // Try to process the next transaction after a short delay
            if (this.pendingTransactions.length > 0) {
                setTimeout(() => this.processNextTransaction(), 1000);
            }
        }
    }
    
    // Method to mint a championship trophy
    async mintChampionshipTrophy(winnerAddress) {
        console.log(`Minting championship trophy for ${winnerAddress}`);
        
        if (this.mockMode) {
            console.log(`[MOCK] Minting championship trophy for ${winnerAddress}`);
            const mockTxHash = `mock-mint-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
            
            // Add to transactions list for UI
            const mockTx = {
                hash: mockTxHash,
                actionType: 'mintTrophy',
                timestamp: Date.now(),
                recipient: winnerAddress,
                mock: true
            };
            
            this.allTransactions.unshift(mockTx);
            
            // Emit transaction event for UI updates
            this.transactionEvents.emit('transaction', mockTx);
            
            return { success: true, hash: mockTxHash };
        }
        
        // Check if we're connected
        if (!this.connected || !this.contract) {
            console.error('Not connected to blockchain');
            return { success: false, error: 'Not connected to blockchain' };
        }
        
        try {
            if (!ethers) {
                throw new Error("Ethers library not available");
            }
            // Prepare transaction parameters with appropriate gas settings
            const overrides = {
                gasLimit: ethers.utils.hexlify(parseInt(config.GAS_LIMIT || process.env.GAS_LIMIT || 3000000)),
                maxFeePerGas: ethers.utils.parseUnits(
                    (config.MAX_FEE_PER_GAS || process.env.MAX_FEE_PER_GAS || "100000000000").toString(), 
                    "wei"
                ),
                maxPriorityFeePerGas: ethers.utils.parseUnits(
                    (config.MAX_PRIORITY_FEE_PER_GAS || process.env.MAX_PRIORITY_FEE_PER_GAS || "100000000000").toString(), 
                    "wei"
                )
            };
            
            console.log('Trophy minting gas parameters:', {
                gasLimit: overrides.gasLimit.toString(),
                maxFeePerGas: ethers.utils.formatUnits(overrides.maxFeePerGas, "gwei") + " gwei",
                maxPriorityFeePerGas: ethers.utils.formatUnits(overrides.maxPriorityFeePerGas, "gwei") + " gwei"
            });
            
            // Call the contract method to mint trophy
            const transaction = await this.contract.mintTrophy(winnerAddress, overrides);
            console.log('Trophy mint transaction sent:', transaction.hash);
            
            // Add to all transactions list for UI
            const txObject = {
                hash: transaction.hash,
                actionType: 'mintTrophy',
                timestamp: Date.now(),
                recipient: winnerAddress,
                status: 'pending'
            };
            
            this.allTransactions.unshift(txObject);
            
            // Emit transaction event for UI updates
            this.transactionEvents.emit('transaction', txObject);
            
            // Wait for transaction to be mined
            console.log('Waiting for trophy mint transaction to be mined...');
            const receipt = await transaction.wait();
            console.log('Trophy mint transaction mined:', receipt);
            
            // Update transaction status
            const txIndex = this.allTransactions.findIndex(t => t.hash === transaction.hash);
            if (txIndex !== -1) {
                this.allTransactions[txIndex].status = 'confirmed';
                this.allTransactions[txIndex].blockNumber = receipt.blockNumber;
                this.allTransactions[txIndex].gasUsed = receipt.gasUsed.toString();
            }
            
            // Emit transaction event for UI updates
            this.transactionEvents.emit('transaction', {
                ...txObject,
                status: 'confirmed',
                receipt
            });
            
            return { success: true, hash: transaction.hash, receipt };
            
        } catch (error) {
            console.error('Error minting trophy:', error);
            console.error('Error details:', error.message);
            if (error.code) {
                console.error('Error code:', error.code);
            }
            
            // Add to all transactions with error
            const errorTx = {
                actionType: 'mintTrophy',
                timestamp: Date.now(),
                recipient: winnerAddress,
                status: 'error',
                error: error.message
            };
            
            this.allTransactions.unshift(errorTx);
            
            // Emit transaction error event
            this.transactionEvents.emit('transactionError', errorTx);
            
            return { success: false, error: error.message };
        }
    }
    
    // Helper method to get the MONAD cost for an action
    getActionCost(actionType) {
        return config.ACTION_COSTS[actionType] || 0;
    }
    
    // Get recent transactions for UI display
    getTransactions(limit = 10) {
        return this.allTransactions.slice(0, limit);
    }
    
    // Custom method to record a knockout
    async recordKO(attackerId, victimId) {
        return this.logAction('knockout', { 
            attackerId, 
            victimId, 
            timestamp: Date.now() 
        });
    }
    
    // Utility methods
    
    /**
     * Generates a transaction hash that looks like a real one
     */
    generateMockTransactionHash() {
        const characters = '0123456789abcdef';
        let hash = '0x';
        for (let i = 0; i < 64; i++) {
            hash += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return hash;
    }
    
    /**
     * Manually emit a transaction event (useful for mock transactions)
     * @param {Object} transaction The transaction to emit
     */
    emitTransactionEvent(transaction) {
        // Add this transaction to our internal list
        this.allTransactions.push(transaction);
        
        // Emit the transaction event
        this.transactionEvents.emit('transaction', transaction);
        
        return transaction;
    }
    
    /**
     * Subscribe to transaction events
     * @param {Function} callback Function to call when a transaction occurs
     */
    onTransaction(callback) {
        this.transactionEvents.on('transaction', callback);
    }
    
    // Add method to subscribe to transaction error events
    onTransactionError(callback) {
        this.transactionEvents.on('transactionError', callback);
    }
}

export default BlockchainManager; 