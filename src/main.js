import { Game } from './game/Game.js';
import BlockchainManager from './blockchain/BlockchainManager.js';

// Wait for DOM to be loaded before initializing the game
document.addEventListener('DOMContentLoaded', () => {
    // Ensure theme song is ready to play
    const soundcloudFrame = document.getElementById('theme-song');
    if (soundcloudFrame) {
        // Force the src to have autoplay enabled
        let src = soundcloudFrame.src;
        if (src.includes('auto_play=false')) {
            src = src.replace('auto_play=false', 'auto_play=true');
            soundcloudFrame.src = src;
        }
        
        // Try to use the SoundCloud Widget API
        window.addEventListener('message', (event) => {
            if (event.origin.includes('soundcloud.com')) {
                console.log('SoundCloud message received:', event.data);
            }
        });
    }
    
    const loadingBar = document.getElementById('loading-bar');
    const loadingText = document.getElementById('loading-text');
    const characterSelect = document.getElementById('character-select');
    const loadingScreen = document.getElementById('loading-screen');
    const startGameButton = document.getElementById('start-game');
    const characterCards = document.querySelectorAll('.character-card');
    const playAgainButton = document.getElementById('play-again');
    const helpButton = document.getElementById('help-button');
    const instructionsOverlay = document.getElementById('instructions-overlay');
    const closeInstructionsButton = document.getElementById('close-instructions');
    
    // Create a simplified start screen instead of character selection
    const createStartScreen = () => {
        // Hide old character selection screen if it exists
        if (characterSelect) {
            characterSelect.style.display = 'none';
        }
        
        // Create a new start screen if it doesn't exist
        let startScreen = document.getElementById('start-screen');
        if (!startScreen) {
            startScreen = document.createElement('div');
            startScreen.id = 'start-screen';
            startScreen.className = 'screen';
            startScreen.style.display = 'flex';
            startScreen.style.flexDirection = 'column';
            startScreen.style.alignItems = 'center';
            startScreen.style.justifyContent = 'center';
            startScreen.style.textAlign = 'center';
            startScreen.style.padding = '2rem';
            startScreen.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            startScreen.style.color = 'white';
            startScreen.style.position = 'absolute';
            startScreen.style.top = '0';
            startScreen.style.left = '0';
            startScreen.style.width = '100%';
            startScreen.style.height = '100%';
            startScreen.style.zIndex = '10';
            
            // Add game title
            const title = document.createElement('h1');
            title.textContent = 'CRYPTO TWITTER CHAMPION';
            title.style.fontSize = '3rem';
            title.style.marginBottom = '2rem';
            title.style.color = 'gold';
            title.style.textShadow = '0 0 10px rgba(255, 215, 0, 0.7)';
            startScreen.appendChild(title);
            
            // Add game description
            const description = document.createElement('p');
            description.textContent = 'Battle it out in the ultimate crypto celebrity wrestling showdown!';
            description.style.fontSize = '1.5rem';
            description.style.marginBottom = '3rem';
            startScreen.appendChild(description);
            
            // Create start fight button
            const startFightButton = document.createElement('button');
            startFightButton.id = 'start-fight-button';
            startFightButton.className = 'button';
            startFightButton.textContent = 'START FIGHT!';
            startFightButton.style.fontSize = '1.5rem';
            startFightButton.style.padding = '1rem 2rem';
            startFightButton.style.backgroundColor = '#ff3e3e';
            startFightButton.style.border = 'none';
            startFightButton.style.borderRadius = '5px';
            startFightButton.style.color = 'white';
            startFightButton.style.cursor = 'pointer';
            startFightButton.style.transition = 'all 0.2s';
            
            // Button hover effect
            startFightButton.addEventListener('mouseover', () => {
                startFightButton.style.transform = 'scale(1.1)';
                startFightButton.style.boxShadow = '0 0 20px rgba(255, 62, 62, 0.7)';
            });
            
            startFightButton.addEventListener('mouseout', () => {
                startFightButton.style.transform = 'scale(1)';
                startFightButton.style.boxShadow = 'none';
            });
            
            startScreen.appendChild(startFightButton);
            
            // Create a transaction indicator (hidden initially until game starts)
            let transactionIndicator = document.getElementById('transaction-indicator');
            if (!transactionIndicator) {
                transactionIndicator = document.createElement('div');
                transactionIndicator.id = 'transaction-indicator';
                
                // Get contract address from environment
                const contractAddress = process.env.CONTRACT_ADDRESS || "0x5f8cD364Eae5F793C5DF8E4545C2a8fA4f55b23a";
                const shortAddress = contractAddress ? 
                    `${contractAddress.substring(0, 6)}...${contractAddress.substring(contractAddress.length - 6)}` : 
                    "Not set";
                
                transactionIndicator.innerHTML = `
                    <div id="transaction-count">MONAD Transactions: 0</div>
                    <div>Contract: <span id="contract-address">${shortAddress}</span></div>
                    <div id="transaction-list"></div>
                `;
                
                // Position at bottom right, initially hidden
                transactionIndicator.style.position = 'fixed';
                transactionIndicator.style.bottom = '20px';
                transactionIndicator.style.right = '20px';
                transactionIndicator.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
                transactionIndicator.style.border = '1px solid #00c853';
                transactionIndicator.style.borderRadius = '5px';
                transactionIndicator.style.padding = '10px';
                transactionIndicator.style.fontSize = '14px';
                transactionIndicator.style.maxWidth = '300px';
                transactionIndicator.style.color = '#fff';
                transactionIndicator.style.zIndex = '1000';
                transactionIndicator.style.fontFamily = 'monospace';
                transactionIndicator.style.display = 'block'; // Make visible by default
                
                document.body.appendChild(transactionIndicator);
            }
            
            document.body.appendChild(startScreen);
        } else {
            startScreen.style.display = 'flex';
        }
        
        return startScreen;
    };
    
    // Initialize game instance
    const game = new Game({
        canvas: document.getElementById('game-canvas'),
        loadingProgress: (progress) => {
            // Update loading bar with progress (0-100)
            loadingBar.style.width = `${progress}%`;
            loadingText.textContent = `Loading assets... ${Math.floor(progress)}%`;
            
            // When loading is complete, show start screen instead of character select
            if (progress >= 100) {
                setTimeout(() => {
                    loadingScreen.style.display = 'none';
                    const startScreen = createStartScreen();
                    
                    // Set up event listener for the start fight button
                    const startFightButton = document.getElementById('start-fight-button');
                    if (startFightButton) {
                        startFightButton.addEventListener('click', () => {
                            startScreen.style.display = 'none';
                            document.getElementById('hud').style.display = 'block';
                            
                            // Show transaction indicator when game starts
                            const transactionIndicator = document.getElementById('transaction-indicator');
                            if (transactionIndicator) {
                                transactionIndicator.style.display = 'block';
                            }
                            
                            // Play John Cena's theme song
                            try {
                                const soundcloudFrame = document.getElementById('theme-song');
                                if (soundcloudFrame) {
                                    // Get the iframe's content window
                                    const frameWindow = soundcloudFrame.contentWindow;
                                    
                                    // Set autoplay to true in the iframe src
                                    let src = soundcloudFrame.src;
                                    if (src.includes('auto_play=false')) {
                                        src = src.replace('auto_play=false', 'auto_play=true');
                                        soundcloudFrame.src = src;
                                    }
                                    
                                    // Try to interact with the SoundCloud Widget API if available
                                    setTimeout(() => {
                                        try {
                                            if (frameWindow.SC && frameWindow.SC.Widget) {
                                                const widget = frameWindow.SC.Widget(soundcloudFrame);
                                                widget.play();
                                            }
                                        } catch (err) {
                                            console.log('Unable to use SoundCloud Widget API', err);
                                        }
                                    }, 1000);
                                }
                            } catch (e) {
                                console.error('Error playing theme song:', e);
                            }
                            
                            // Start the game with a random character
                            const characters = ['trump', 'vitalik', 'kanye', 'sbf'];
                            const randomCharacter = characters[Math.floor(Math.random() * characters.length)];
                            game.start(randomCharacter);
                            
                            // Make sure game canvas has focus for input events
                            document.getElementById('game-canvas').focus();
                        });
                    }
                }, 1000);
            }
        }
    });
    
    // Initialize blockchain transaction tracking
    setupBlockchainTracking(game);
    
    // Play again button
    playAgainButton.addEventListener('click', () => {
        document.getElementById('game-over').style.display = 'none';
        createStartScreen();
        game.reset();
    });
    
    // Help button shows instructions overlay
    if (helpButton) {
        helpButton.addEventListener('click', () => {
            instructionsOverlay.style.display = 'flex';
            // Pause the game by setting isRunning to false
            if (game.isRunning) {
                game.wasRunning = game.isRunning;
                game.isRunning = false;
            }
        });
    }
    
    // Close instructions button
    if (closeInstructionsButton) {
        closeInstructionsButton.addEventListener('click', () => {
            instructionsOverlay.style.display = 'none';
            // Resume the game if it was running before
            if (game.wasRunning) {
                game.isRunning = true;
                game.wasRunning = false;
                game.animate();
            }
        });
    }
    
    // Handle window resize
    window.addEventListener('resize', () => {
        game.onWindowResize();
    });
    
    // Initialize game by loading assets
    game.loadAssets();
    
    // Keyboard controls for instructions (ESC to close)
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && instructionsOverlay.style.display === 'flex') {
            closeInstructionsButton.click();
        }
    });
});

// Function to set up blockchain transaction tracking
function setupBlockchainTracking(game) {
    if (!game.blockchainManager) {
        console.warn('No blockchain manager found, skipping transaction tracking setup');
        return;
    }
    
    console.log('Blockchain manager found, setting up transaction tracking');
    
    let txCount = 0;
    const maxTransactionsShown = 5;
    
    // Transaction indicator elements
    const txCountElement = document.getElementById('transaction-count');
    const txListElement = document.getElementById('transaction-list');
    const contractAddressElement = document.getElementById('contract-address');
    
    // Initialize the transaction indicator with the contract address
    if (contractAddressElement) {
        const contractAddress = process.env.CONTRACT_ADDRESS || "0x2D8C8ccE5f3E693102dF1121d86228844155db8F";
        const shortAddress = contractAddress ? 
            `${contractAddress.substring(0, 6)}...${contractAddress.substring(contractAddress.length - 6)}` : 
            "Not set";
        contractAddressElement.textContent = shortAddress;
        
        // Make the contract address a link to Monad Explorer
        contractAddressElement.innerHTML = `<a href="https://explorer.monad.xyz/address/${contractAddress}" target="_blank" style="color: #00c853; text-decoration: underline;">${shortAddress}</a>`;
    }
    
    // Subscribe to transaction events from the BlockchainManager
    game.blockchainManager.onTransaction((transaction) => {
        console.log('Transaction event received:', transaction);
        
        // Update transaction count
        txCount++;
        if (txCountElement) {
            txCountElement.textContent = `MONAD Transactions: ${txCount}`;
        }
        
        // Update transaction list
        if (txListElement) {
            // Format transaction hash for display
            const shortHash = transaction.hash ? 
                `${transaction.hash.substring(0, 6)}...${transaction.hash.substring(transaction.hash.length - 4)}` : 
                "Unknown";
            
            // Create a link to the transaction on the explorer
            const txLink = transaction.hash && !transaction.mock ? 
                `<a href="https://explorer.monad.xyz/tx/${transaction.hash}" target="_blank" style="color: #00c853; text-decoration: underline;">${shortHash}</a>` : 
                shortHash;
            
            // Add transaction to the list
            const txItem = document.createElement('div');
            txItem.className = 'transaction-item';
            txItem.innerHTML = `
                <span class="tx-hash">${txLink}</span>
                <span class="tx-type">${transaction.actionType || 'action'}</span>
                <span class="tx-status ${transaction.status || (transaction.mock ? 'mock' : 'pending')}">${transaction.status || (transaction.mock ? 'simulated' : 'pending')}</span>
            `;
            
            // Add to the beginning of the list
            if (txListElement.firstChild) {
                txListElement.insertBefore(txItem, txListElement.firstChild);
            } else {
                txListElement.appendChild(txItem);
            }
            
            // Limit the number of transactions shown
            while (txListElement.children.length > maxTransactionsShown) {
                txListElement.removeChild(txListElement.lastChild);
            }
        }
        
        // Make the transaction indicator visible if it's not already
        const transactionIndicator = document.getElementById('transaction-indicator');
        if (transactionIndicator && transactionIndicator.style.display === 'none') {
            transactionIndicator.style.display = 'block';
        }
    });
    
    // Subscribe to transaction error events
    game.blockchainManager.onTransactionError((error) => {
        console.error('Transaction error event received:', error);
        
        // Update transaction list with error
        if (txListElement) {
            const txItem = document.createElement('div');
            txItem.className = 'transaction-item transaction-error';
            txItem.innerHTML = `
                <span class="tx-type">${error.actionType || 'action'}</span>
                <span class="tx-status error">failed</span>
                <span class="tx-error">${error.error || 'Unknown error'}</span>
            `;
            
            // Add to the beginning of the list
            if (txListElement.firstChild) {
                txListElement.insertBefore(txItem, txListElement.firstChild);
            } else {
                txListElement.appendChild(txItem);
            }
            
            // Limit the number of transactions shown
            while (txListElement.children.length > maxTransactionsShown) {
                txListElement.removeChild(txListElement.lastChild);
            }
        }
    });
} 