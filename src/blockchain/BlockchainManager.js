import { ethers } from 'ethers';
import { 
    CONTRACT_ADDRESS, 
    MONAD_TESTNET_RPC, 
    WALLET_ADDRESS,
    GAS_LIMIT,
    MAX_PRIORITY_FEE_PER_GAS,
    ENABLE_MOCK_MODE,
    THROTTLE_INTERVAL,
    MAX_TX_PER_MINUTE,
    WWEMONAD_ABI,
    ACTION_COSTS,
    PRIVATE_KEY,
    MAX_FEE_PER_GAS
} from './config.js';

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
        this.mockMode = process.env.ENABLE_MOCK_MODE === "true";
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
            this.wallet = { address: WALLET_ADDRESS || process.env.WALLET_ADDRESS };
            return;
        }
        
        try {
            // Connect to Monad testnet
            const rpcUrl = MONAD_TESTNET_RPC || process.env.MONAD_TESTNET_RPC;
            if (!rpcUrl) {
                throw new Error("No RPC URL provided");
            }
            
            console.log('Connecting to RPC URL:', rpcUrl);
            this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
            
            // Use environment private key
            const privateKey = PRIVATE_KEY || process.env.PRIVATE_KEY;
            if (privateKey) {
                console.log('Using private key from environment');
                this.signer = new ethers.Wallet(privateKey, this.provider);
                this.wallet = {
                    address: this.signer.address
                };
                console.log('Wallet address:', this.wallet.address);
            } else {
                console.warn('No private key found in environment variables');
                this.wallet = { address: WALLET_ADDRESS || process.env.WALLET_ADDRESS || "0x0000000000000000000000000000000000000000" };
                console.log('Using fallback wallet address:', this.wallet.address);
            }
            
            // Initialize contract
            const contractAddress = CONTRACT_ADDRESS || process.env.CONTRACT_ADDRESS;
            if (contractAddress) {
                console.log('Initializing contract at:', contractAddress);
                this.contract = new ethers.Contract(
                    contractAddress,
                    WWEMONAD_ABI,
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
        }, parseInt(THROTTLE_INTERVAL || process.env.THROTTLE_INTERVAL || 5000));
        
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
        
        if (recentTxCount >= MAX_TX_PER_MINUTE) {
            console.warn(`Transaction rate limit reached: ${recentTxCount}/${MAX_TX_PER_MINUTE} per minute`);
            // Try again in a bit
            setTimeout(() => this.processNextTransaction(), THROTTLE_INTERVAL);
            return;
        }
        
        // Set the flag to prevent concurrent processing
        this.isSendingTransaction = true;
        
        // Get the next transaction from the queue
        const tx = this.pendingTransactions.shift();
        console.log('Processing transaction:', tx.actionType);
        
        try {
            // Prepare transaction parameters with appropriate gas settings
            const overrides = {
                gasLimit: ethers.utils.hexlify(parseInt(GAS_LIMIT)),
                maxFeePerGas: ethers.utils.parseUnits(
                    (MAX_FEE_PER_GAS || "100000000000").toString(), 
                    "wei"
                ),
                maxPriorityFeePerGas: ethers.utils.parseUnits(
                    (MAX_PRIORITY_FEE_PER_GAS || "100000000000").toString(), 
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
                this.recentTransactions = this.recentTransactions.slice(-100);
            }
            
            // Emit transaction event
            this.transactionEvents.emit('transaction', txObject);
            
            // Wait for transaction to be mined
            console.log('Waiting for transaction to be mined...');
            const receipt = await transaction.wait();
            console.log('Transaction mined in block:', receipt.blockNumber);
            
            // Update transaction status
            txObject.status = 'confirmed';
            txObject.blockNumber = receipt.blockNumber;
            
            // Re-emit transaction event with updated status
            this.transactionEvents.emit('transaction', txObject);
            
            // Resolve the promise
            tx.resolve({ 
                success: true, 
                hash: transaction.hash, 
                blockNumber: receipt.blockNumber 
            });
            
            console.log(`Transaction processed successfully: ${transaction.hash}`);
            
        } catch (error) {
            console.error('Error processing transaction:', error);
            console.error('Error message:', error.message);
            if (error.code) {
                console.error('Error code:', error.code);
            }
            
            // Create an error transaction object for UI
            const errorTx = {
                hash: null,
                actionType: tx.actionType,
                timestamp: tx.timestamp,
                status: 'error',
                error: error.message
            };
            
            this.allTransactions.unshift(errorTx);
            
            // Emit transaction error event
            this.transactionEvents.emit('transactionError', {
                actionType: tx.actionType,
                error: error.message,
                code: error.code
            });
            
            // Reject the promise
            tx.reject(error);
        } finally {
            // Reset flag to allow next transaction
            this.isSendingTransaction = false;
            
            // Process next transaction if any
            if (this.pendingTransactions.length > 0) {
                console.log('Processing next transaction in queue');
                setTimeout(() => this.processNextTransaction(), 1000);
            }
        }
    }
    
    // Method to mint a championship trophy
    async mintChampionshipTrophy(winnerAddress) {
        console.log(`Minting championship trophy for ${winnerAddress}`);
        
        if (this.mockMode) {
            console.log(`[MOCK] Minting trophy for: ${winnerAddress}`);
            const mockTxHash = `mock-trophy-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
            
            // Add to transactions list
            const mockTx = {
                hash: mockTxHash,
                actionType: 'mintTrophy',
                timestamp: Date.now(),
                recipient: winnerAddress,
                mock: true
            };
            
            this.allTransactions.unshift(mockTx);
            
            // Emit transaction event
            this.transactionEvents.emit('transaction', mockTx);
            
            return { success: true, hash: mockTxHash };
        }
        
        if (!this.connected || !this.contract) {
            console.error('Not connected to blockchain');
            return { success: false, error: 'Not connected to blockchain' };
        }
        
        try {
            // Prepare gas parameters - increased values for Monad compatibility
            const gasLimit = ethers.utils.hexlify(parseInt(GAS_LIMIT || process.env.GAS_LIMIT || 3000000));
            const maxFeePerGas = ethers.utils.hexlify(parseInt(MAX_FEE_PER_GAS || process.env.MAX_FEE_PER_GAS || 100000000000)); // 100 gwei
            const maxPriorityFeePerGas = ethers.utils.hexlify(parseInt(MAX_PRIORITY_FEE_PER_GAS || process.env.MAX_PRIORITY_FEE_PER_GAS || 100000000000)); // 100 gwei
            
            // Call the contract method
            const nonce = await this.provider.getTransactionCount(this.wallet.address, "pending");
            console.log('Using nonce:', nonce);
            
            const transaction = await this.contract.mintTrophy(winnerAddress, {
                gasLimit,
                maxFeePerGas,
                maxPriorityFeePerGas,
                nonce
            });
            
            console.log('Trophy mint transaction sent:', transaction.hash);
            
            // Track this transaction
            const txObject = {
                hash: transaction.hash,
                actionType: 'mintTrophy',
                timestamp: Date.now(),
                recipient: winnerAddress,
                status: 'pending'
            };
            
            this.allTransactions.unshift(txObject);
            
            // Emit transaction event
            this.transactionEvents.emit('transaction', txObject);
            
            // Wait for transaction to be mined
            const receipt = await transaction.wait();
            console.log('Trophy mint transaction mined:', receipt);
            
            // Update transaction status
            txObject.status = 'confirmed';
            txObject.blockNumber = receipt.blockNumber;
            
            // Re-emit transaction event
            this.transactionEvents.emit('transaction', txObject);
            
            return { 
                success: true, 
                hash: transaction.hash,
                receipt
            };
            
        } catch (error) {
            console.error('Error minting trophy:', error);
            
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
        return ACTION_COSTS[actionType] || 0;
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
    
    // Add method to subscribe to transaction events
    onTransaction(callback) {
        this.transactionEvents.on('transaction', callback);
    }
    
    // Add method to subscribe to transaction error events
    onTransactionError(callback) {
        this.transactionEvents.on('transactionError', callback);
    }
}

export default BlockchainManager; 