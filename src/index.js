import { Game } from './game/Game.js';
import BlockchainManager from './blockchain/BlockchainManager.js';
import './styles/main.css';

// Initialize and start the game when the page is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Create the game instance
    const game = new Game({
        containerId: 'game-container',
        debug: false
    });
    
    // Start the game
    game.start();
    
    // Get the transaction indicator or create one if it doesn't exist
    let transactionIndicator = document.getElementById('transaction-indicator');
    if (!transactionIndicator) {
        // Create transaction indicator
        transactionIndicator = document.createElement('div');
        transactionIndicator.id = 'transaction-indicator';
        
        // Get contract address from environment
        const contractAddress = process.env.CONTRACT_ADDRESS || "0x2D8C8ccE5f3E693102dF1121d86228844155db8F";
        const shortAddress = contractAddress ? 
            `${contractAddress.substring(0, 6)}...${contractAddress.substring(contractAddress.length - 6)}` : 
            "Not set";
        
        transactionIndicator.innerHTML = `
            <div id="transaction-count">MONAD Transactions: 0</div>
            <div>Contract: <span id="contract-address">${shortAddress}</span></div>
            <div id="connection-status">Connecting to blockchain...</div>
            <div id="transaction-list"></div>
        `;
        
        document.body.appendChild(transactionIndicator);
    }
    
    // Ensure the transaction indicator is visible
    transactionIndicator.style.display = 'block';
    transactionIndicator.style.zIndex = '10000';
    
    console.log('Transaction indicator initialized:', transactionIndicator);
    
    // Initialize transaction count
    let txCount = 0;
    const contractAddress = document.getElementById('contract-address');
    if (contractAddress) {
        const address = process.env.CONTRACT_ADDRESS || "0x2D8C8ccE5f3E693102dF1121d86228844155db8F";
        const shortAddress = address ? 
            `${address.substring(0, 6)}...${address.substring(address.length - 6)}` : 
            "Not set";
        contractAddress.innerHTML = `<a href="https://explorer.testnet.monad.xyz/address/${address}" target="_blank">${shortAddress}</a>`;
    }
    
    // Update connection status
    const updateConnectionStatus = () => {
        const status = document.getElementById('connection-status');
        const manager = game.blockchainManager;
        
        if (manager.mockMode) {
            status.textContent = 'Running in Mock Mode';
            status.style.color = '#f39c12';
        } else if (manager.connected) {
            status.textContent = `Connected to ${manager.network}`;
            status.style.color = '#2ecc71';
        } else {
            status.textContent = 'Disconnected';
            status.style.color = '#e74c3c';
        }
        
        console.log('Blockchain connection status:', status.textContent);
    };
    
    // Check connection status after a short delay
    setTimeout(updateConnectionStatus, 2000);
    
    // Subscribe to transaction events directly
    game.blockchainManager.onTransaction((transaction) => {
        console.log('Transaction event received:', transaction);
        
        // Update transaction count
        txCount++;
        const txCountElement = document.getElementById('transaction-count');
        if (txCountElement) {
            txCountElement.textContent = `MONAD Transactions: ${txCount}`;
        }
        
        // Update transaction list
        const txList = document.getElementById('transaction-list');
        if (txList) {
            const monadLink = transaction.hash && !transaction.mock ? 
                `<a href="https://explorer.testnet.monad.xyz/tx/${transaction.hash}" target="_blank">View on Monad Explorer</a>` : 
                '';
            
            const statusColor = transaction.status === 'confirmed' ? '#2ecc71' : 
                                transaction.status === 'pending' ? '#f39c12' : '#e74c3c';
            
            const statusText = transaction.status === 'confirmed' ? 'Confirmed' : 
                              transaction.status === 'pending' ? 'Pending' : 'Failed';
            
            const newTx = document.createElement('div');
            newTx.className = 'transaction-item';
            newTx.innerHTML = `
                <div class="tx-type">${transaction.actionType}</div>
                <div class="tx-status" style="color: ${statusColor}">${statusText}</div>
                <div class="tx-time">${new Date(transaction.timestamp).toLocaleTimeString()}</div>
                <div class="tx-hash">${monadLink}</div>
            `;
            
            // Insert at the top
            if (txList.firstChild) {
                txList.insertBefore(newTx, txList.firstChild);
            } else {
                txList.appendChild(newTx);
            }
            
            // Limit list to 10 items
            while (txList.children.length > 10) {
                txList.removeChild(txList.lastChild);
            }
        }
    });
}); 