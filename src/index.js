import Game from './game/Game.js';
import BlockchainManager from './blockchain/BlockchainManager.js';
import './styles/main.css';

// Initialize and start the game when the page is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM loaded, initializing blockchain manager");
    
    // Initialize blockchain manager
    const blockchainManager = new BlockchainManager();
    
    // Make sure the transaction indicator is visible
    const transactionIndicator = document.getElementById('transaction-indicator');
    if (transactionIndicator) {
        transactionIndicator.style.display = 'block';
        transactionIndicator.style.visibility = 'visible';
        transactionIndicator.style.opacity = '1';
        transactionIndicator.style.zIndex = '10000';
    }
    
    // Initialize transaction count and list
    let transactionCount = 0;
    const transactionCountElement = document.getElementById('transaction-count');
    const transactionList = document.getElementById('transaction-list');
    const contractAddressElement = document.getElementById('contract-address');
    const connectionStatus = document.getElementById('connection-status');
    
    // Generate a random transaction hash for visual purposes
    const generateRandomHash = () => {
        const chars = '0123456789abcdef';
        let hash = '0x';
        for (let i = 0; i < 40; i++) {
            hash += chars[Math.floor(Math.random() * chars.length)];
        }
        return hash;
    };
    
    // Update transaction UI when a new transaction occurs
    const updateTransactionUI = (transaction) => {
        // Update transaction count
        transactionCount++;
        if (transactionCountElement) {
            transactionCountElement.textContent = `MONAD Transactions: ${transactionCount}`;
        }
        
        // Add transaction to list
        if (transactionList) {
            // Create transaction item element
            const item = document.createElement('div');
            item.className = 'transaction-item';
            
            // Create transaction hash with link to Monad explorer
            const hashElement = document.createElement('div');
            hashElement.className = 'tx-hash';
            const hashLink = document.createElement('a');
            hashLink.href = `https://explorer.monad.xyz/tx/${transaction.hash}`;
            hashLink.target = '_blank';
            hashLink.textContent = `${transaction.hash.substring(0, 6)}...${transaction.hash.substring(transaction.hash.length - 4)}`;
            hashElement.appendChild(hashLink);
            
            // Create transaction type element
            const typeElement = document.createElement('div');
            typeElement.className = 'tx-type';
            typeElement.textContent = transaction.actionType || 'Transaction';
            
            // Create transaction status element
            const statusElement = document.createElement('div');
            statusElement.className = `tx-status ${transaction.status}`;
            statusElement.textContent = transaction.status === 'confirmed' ? '✓' : (transaction.status === 'pending' ? '⏳' : '⚠️');
            
            // Add elements to item
            item.appendChild(hashElement);
            item.appendChild(typeElement);
            item.appendChild(statusElement);
            
            // Add item to list
            transactionList.prepend(item);
            
            // Limit to 10 items
            while (transactionList.children.length > 10) {
                transactionList.removeChild(transactionList.lastChild);
            }
        }
    };
    
    // Force a few transactions to appear right away
    const addMockTransaction = () => {
        const transaction = {
            hash: generateRandomHash(),
            actionType: ['Character Selection', 'Game Start', 'Move Recorded'][Math.floor(Math.random() * 3)],
            status: Math.random() > 0.2 ? 'confirmed' : 'pending',
            timestamp: Date.now(),
        };
        updateTransactionUI(transaction);
    };
    
    // Add a few initial transactions
    for (let i = 0; i < 3; i++) {
        setTimeout(() => {
            addMockTransaction();
        }, i * 1000);
    }
    
    // Initialize blockchain and connect
    blockchainManager.initialize().then(() => {
        console.log('Blockchain manager initialized');
        
        // Update contract address in UI
        if (contractAddressElement && blockchainManager.contractAddress) {
            const shortAddress = `${blockchainManager.contractAddress.substring(0, 6)}...${blockchainManager.contractAddress.substring(blockchainManager.contractAddress.length - 4)}`;
            contractAddressElement.textContent = shortAddress;
            
            // Add click event to copy address
            contractAddressElement.style.cursor = 'pointer';
            contractAddressElement.title = 'Click to copy contract address';
            contractAddressElement.addEventListener('click', () => {
                navigator.clipboard.writeText(blockchainManager.contractAddress);
                alert('Contract address copied to clipboard!');
            });
        }
        
        // Update connection status
        const updateConnectionStatus = () => {
            if (connectionStatus) {
                connectionStatus.textContent = 'Connected to MONAD Testnet';
                connectionStatus.style.color = '#4CAF50';
            }
        };
        updateConnectionStatus();
        
        // Subscribe to blockchain events
        blockchainManager.onTransaction((transaction) => {
            console.log('Transaction received:', transaction);
            updateTransactionUI(transaction);
        });
        
        // Start game after blockchain is initialized
        const game = new Game(blockchainManager);
        game.initialize();
    }).catch(error => {
        console.error('Error initializing blockchain:', error);
        if (connectionStatus) {
            connectionStatus.textContent = 'Failed to connect to blockchain';
            connectionStatus.style.color = '#f44336';
        }
    });
    
    // Setup Twitter share button with direct event listeners
    const twitterShareButton = document.getElementById('twitter-share');
    if (twitterShareButton) {
        console.log('Found Twitter share button, attaching event listener');
        twitterShareButton.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Twitter share button clicked directly');
            
            // Create the share URL
            const gameUrl = "https://wwecryptotwitter.netlify.app";
            const text = `Play this game and John Cena might follow you! ${gameUrl}`;
            const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
            
            // Open Twitter intent in a popup window
            const width = 575, height = 400;
            const left = (window.innerWidth - width) / 2;
            const top = (window.innerHeight - height) / 2;
            const opts = `status=1,width=${width},height=${height},top=${top},left=${left}`;
            
            window.open(twitterUrl, 'twitter', opts);
            console.log('Opened Twitter share window');
            
            return false;
        });
    } else {
        // Fallback for when the button might be added later (e.g., after game over)
        document.addEventListener('click', function(e) {
            const target = e.target.closest('#twitter-share');
            if (target) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Twitter share button clicked via delegation');
                
                // Create the share URL
                const gameUrl = "https://wwecryptotwitter.netlify.app";
                const text = `Play this game and John Cena might follow you! ${gameUrl}`;
                const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
                
                // Open Twitter intent in a popup window
                const width = 575, height = 400;
                const left = (window.innerWidth - width) / 2;
                const top = (window.innerHeight - height) / 2;
                const opts = `status=1,width=${width},height=${height},top=${top},left=${left}`;
                
                window.open(twitterUrl, 'twitter', opts);
                console.log('Opened Twitter share window');
                
                return false;
            }
        });
    }
}); 