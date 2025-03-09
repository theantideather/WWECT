import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { RingEnvironment } from './RingEnvironment.js';
import { Character } from './Character.js';
import { Physics } from './Physics.js';
import { Controls } from './Controls.js';
import { SoundManager } from './SoundManager.js';
import BlockchainManager from '../blockchain/BlockchainManager.js';

export class Game {
    constructor(options) {
        this.options = options;
        this.canvas = options.canvas;
        this.loadingProgress = options.loadingProgress || (() => {});
        
        // Game state
        this.isRunning = false;
        this.wasRunning = false; // Track if game was running before pause
        this.players = [];
        this.selectedCharacter = null;
        this.totalAssets = 0;
        this.loadedAssets = 0;
        this.gameStartTime = 0; // Track when the game started
        this.minGameDuration = 15000; // Minimum 15 seconds before game can end
        
        // Initialize blockchain manager for recording actions on Monad
        this.blockchainManager = new BlockchainManager();
        console.log('BlockchainManager initialized in Game:', this.blockchainManager);
        
        // Three.js components
        this.scene = new THREE.Scene();
        
        // Add camera pivot for following player
        this.cameraPivot = new THREE.Object3D();
        this.scene.add(this.cameraPivot);
        
        // Camera is now a child of the pivot, making rotation around player easier
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 7, 12); // Slightly higher and further back
        this.cameraPivot.add(this.camera);
        
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: this.canvas,
            antialias: true
        });
        
        // Initialize renderer
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // Apply CRT shader effect for retro look
        this.applyCRTEffect();
        
        // Set camera to look at pivot center
        this.camera.lookAt(this.cameraPivot.position);
        
        // Maintain mouse controls for orbit during gameplay
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.1; // More responsive
        this.controls.minPolarAngle = 0.1; // Limit how far up can look
        this.controls.maxPolarAngle = Math.PI / 2 - 0.1; // Limit how far down can look
        this.controls.minDistance = 5; // Can zoom in closer
        this.controls.maxDistance = 20; // Limit zoom out
        this.controls.rotateSpeed = 1.5; // Faster rotation
        this.controls.enablePan = false; // Disable panning to focus on rotation
        
        // Initialize sub-systems
        this.environment = new RingEnvironment(this.scene);
        this.physics = new Physics();
        this.gameControls = new Controls();
        this.soundManager = new SoundManager();
        
        // Setup lighting
        this.setupLighting();
        
        // Start animation loop
        this.animate = this.animate.bind(this);
        
        // Update controls hint in UI
        this.updateControlsHint();
        
        // Last frame time for smoother animations
        this.lastFrameTime = performance.now();
        
        // Create/update HUD elements
        this.setupHUD();
        
        // Start generating visual transactions immediately
        if (this.blockchainManager) {
            console.log('Starting blockchain transaction visualization');
            this.blockchainManager.startVisualMockTransactions();
        }
    }
    
    setupHUD() {
        // Create HUD container if it doesn't exist
        let hud = document.getElementById('hud');
        if (!hud) {
            hud = document.createElement('div');
            hud.id = 'hud';
            hud.style.position = 'absolute';
            hud.style.top = '0';
            hud.style.left = '0';
            hud.style.width = '100%';
            hud.style.height = '100%';
            hud.style.pointerEvents = 'none';
            hud.style.display = 'none';
            document.body.appendChild(hud);
        }
        
        // Create special move indicator
        let specialMoveIndicator = document.getElementById('special-move-indicator');
        if (!specialMoveIndicator) {
            specialMoveIndicator = document.createElement('div');
            specialMoveIndicator.id = 'special-move-indicator';
            specialMoveIndicator.style.position = 'absolute';
            specialMoveIndicator.style.bottom = '20px';
            specialMoveIndicator.style.right = '20px';
            specialMoveIndicator.style.width = '60px';
            specialMoveIndicator.style.height = '60px';
            specialMoveIndicator.style.borderRadius = '50%';
            specialMoveIndicator.style.backgroundColor = 'rgba(255, 215, 0, 0.7)';
            specialMoveIndicator.style.border = '3px solid gold';
            specialMoveIndicator.style.boxShadow = '0 0 10px gold';
            specialMoveIndicator.style.display = 'flex';
            specialMoveIndicator.style.alignItems = 'center';
            specialMoveIndicator.style.justifyContent = 'center';
            specialMoveIndicator.style.fontWeight = 'bold';
            specialMoveIndicator.style.fontSize = '10px';
            specialMoveIndicator.style.color = 'white';
            specialMoveIndicator.style.textShadow = '0 0 3px black';
            specialMoveIndicator.style.transition = 'all 0.3s';
            specialMoveIndicator.innerHTML = 'SPECIAL<br>MOVE';
            hud.appendChild(specialMoveIndicator);
        }
        
        // Create battle notifications area
        let battleNotifications = document.getElementById('battle-notifications');
        if (!battleNotifications) {
            battleNotifications = document.createElement('div');
            battleNotifications.id = 'battle-notifications';
            battleNotifications.style.position = 'absolute';
            battleNotifications.style.top = '20px';
            battleNotifications.style.right = '20px';
            battleNotifications.style.width = '300px';
            battleNotifications.style.maxHeight = '200px';
            battleNotifications.style.overflowY = 'hidden';
            battleNotifications.style.display = 'flex';
            battleNotifications.style.flexDirection = 'column-reverse'; // New messages at top
            hud.appendChild(battleNotifications);
        }
        
        // Create Wakanda energy meter
        let wakandaEnergy = document.getElementById('wakanda-energy');
        if (!wakandaEnergy) {
            wakandaEnergy = document.createElement('div');
            wakandaEnergy.id = 'wakanda-energy';
            wakandaEnergy.style.position = 'absolute';
            wakandaEnergy.style.top = '100px';
            wakandaEnergy.style.left = '20px';
            wakandaEnergy.style.width = '200px';
            wakandaEnergy.style.padding = '10px';
            wakandaEnergy.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            wakandaEnergy.style.borderRadius = '5px';
            wakandaEnergy.style.color = 'white';
            
            // Add title
            const title = document.createElement('div');
            title.style.fontWeight = 'bold';
            title.style.marginBottom = '5px';
            title.textContent = 'WAKANDA ENERGY';
            wakandaEnergy.appendChild(title);
            
            // Add energy bar container
            const energyBarContainer = document.createElement('div');
            energyBarContainer.style.width = '100%';
            energyBarContainer.style.height = '15px';
            energyBarContainer.style.backgroundColor = '#333';
            energyBarContainer.style.borderRadius = '10px';
            energyBarContainer.style.overflow = 'hidden';
            
            // Add energy bar
            const energyBar = document.createElement('div');
            energyBar.id = 'wakanda-energy-bar';
            energyBar.style.width = '0%';
            energyBar.style.height = '100%';
            energyBar.style.background = 'linear-gradient(to right, #f1c40f, #ffffff)';
            energyBar.style.transition = 'width 0.3s';
            
            energyBarContainer.appendChild(energyBar);
            wakandaEnergy.appendChild(energyBarContainer);
            
            // Add status text
            const statusText = document.createElement('div');
            statusText.id = 'wakanda-status';
            statusText.style.fontSize = '12px';
            statusText.style.marginTop = '5px';
            statusText.textContent = 'Energy: 0% - Collecting...';
            wakandaEnergy.appendChild(statusText);
            
            hud.appendChild(wakandaEnergy);
        }
        
        // Create controls hint
        this.updateControlsHint();
    }
    
    updateControlsHint() {
        // Update the controls hint in the UI to include jumping
        let hud = document.getElementById('hud');
        if (!hud) return;
        
        let controlsHint = document.getElementById('controls-hint');
        if (!controlsHint) {
            controlsHint = document.createElement('div');
            controlsHint.id = 'controls-hint';
            controlsHint.style.position = 'absolute';
            controlsHint.style.bottom = '20px';
            controlsHint.style.left = '20px';
            controlsHint.style.padding = '10px';
            controlsHint.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            controlsHint.style.color = 'white';
            controlsHint.style.borderRadius = '5px';
            controlsHint.style.fontSize = '14px';
            hud.appendChild(controlsHint);
        }
        
        controlsHint.innerHTML = '<p>WASD/Arrows: Move | E: Attack | SPACE: Special | W/Up: Jump | Mouse: Camera</p>';
    }
    
    setupLighting() {
        // Main directional light (simulates a spotlight)
        const mainLight = new THREE.DirectionalLight(0xffffff, 1);
        mainLight.position.set(0, 30, 0);
        mainLight.castShadow = true;
        mainLight.shadow.mapSize.width = 2048;
        mainLight.shadow.mapSize.height = 2048;
        mainLight.shadow.camera.near = 0.5;
        mainLight.shadow.camera.far = 50;
        mainLight.shadow.camera.left = -20;
        mainLight.shadow.camera.right = 20;
        mainLight.shadow.camera.top = 20;
        mainLight.shadow.camera.bottom = -20;
        this.scene.add(mainLight);
        
        // Add colored spotlights for WWE-style lighting
        const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00];
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2;
            const spotLight = new THREE.SpotLight(colors[i], 0.8);
            spotLight.position.set(Math.sin(angle) * 15, 20, Math.cos(angle) * 15);
            spotLight.angle = Math.PI / 6;
            spotLight.penumbra = 0.2;
            spotLight.decay = 2;
            spotLight.distance = 50;
            spotLight.castShadow = true;
            spotLight.shadow.mapSize.width = 1024;
            spotLight.shadow.mapSize.height = 1024;
            this.scene.add(spotLight);
        }
        
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
        this.scene.add(ambientLight);
    }
    
    applyCRTEffect() {
        // Add post-processing for CRT effect (simplified version)
        const scanlineOverlay = document.createElement('div');
        scanlineOverlay.style.position = 'absolute';
        scanlineOverlay.style.top = '0';
        scanlineOverlay.style.left = '0';
        scanlineOverlay.style.width = '100%';
        scanlineOverlay.style.height = '100%';
        scanlineOverlay.style.backgroundImage = 'linear-gradient(transparent 50%, rgba(0, 0, 0, 0.1) 50%)';
        scanlineOverlay.style.backgroundSize = '100% 4px';
        scanlineOverlay.style.pointerEvents = 'none';
        scanlineOverlay.style.zIndex = '3';
        this.canvas.parentNode.appendChild(scanlineOverlay);
        
        // Add subtle vignette effect
        this.renderer.domElement.style.boxShadow = 'inset 0 0 100px rgba(0, 0, 0, 0.7)';
    }
    
    loadAssets() {
        // List of assets to load
        const assets = [
            { type: 'model', id: 'ring', path: '/assets/models/ring.glb' },
            { type: 'model', id: 'trump', path: '/assets/models/trump.glb' },
            { type: 'model', id: 'vitalik', path: '/assets/models/vitalik.glb' },
            { type: 'model', id: 'kanye', path: '/assets/models/kanye.glb' },
            { type: 'model', id: 'sbf', path: '/assets/models/sbf.glb' },
            { type: 'texture', id: 'crowd', path: '/assets/textures/crowd.jpg' },
            { type: 'texture', id: 'floor', path: '/assets/textures/ring_floor.jpg' },
            { type: 'audio', id: 'crowd_cheer', path: '/assets/audio/crowd_cheer.mp3' },
            { type: 'audio', id: 'hit', path: '/assets/audio/hit.mp3' },
            { type: 'audio', id: 'special_move', path: '/assets/audio/special_move.mp3' }
        ];
        
        this.totalAssets = assets.length;
        this.loadedAssets = 0;
        
        // Since we don't have actual assets yet, simulate loading progress
        // In a real implementation, you'd load actual assets
        let progress = 0;
        const interval = setInterval(() => {
            progress += 5;
            this.loadingProgress(progress);
            
            if (progress >= 100) {
                clearInterval(interval);
                this.onAssetsLoaded();
            }
        }, 200);
    }
    
    onAssetsLoaded() {
        // Initialize the environment
        this.environment.create();
        
        // Create placeholder fighters
        this.createPlaceholderFighters();
        
        // Ready to start the game when user selects a character
        console.log('Assets loaded, ready to start game');
    }
    
    createPlaceholderFighters() {
        // Create placeholder fighters since we don't have real models yet
        const characterConfigs = {
            trump: {
                name: 'Donald Trump',
                color: 0xff4500, // Orange
                specialMove: 'MAGA Slam',
                health: 100,
                speed: 0.8,
                strength: 1.2
            },
            vitalik: {
                name: 'Vitalik Buterin',
                color: 0x9370db, // Purple
                specialMove: 'Smart Contract Throw',
                health: 90,
                speed: 1.2,
                strength: 0.9
            },
            kanye: {
                name: 'Kanye West',
                color: 0x2f4f4f, // Dark slate
                specialMove: '808 Dropkick',
                health: 95,
                speed: 1.0,
                strength: 1.0
            },
            sbf: {
                name: 'Sam Bankman-Fried',
                color: 0x20b2aa, // Light sea green
                specialMove: 'Alameda Suplex',
                health: 85,
                speed: 0.9,
                strength: 0.8
            }
        };
        
        // Create simple placeholder characters
        const positions = [
            new THREE.Vector3(-5, 0, -5),
            new THREE.Vector3(5, 0, -5),
            new THREE.Vector3(-5, 0, 5),
            new THREE.Vector3(5, 0, 5)
        ];
        
        let i = 0;
        for (const [id, config] of Object.entries(characterConfigs)) {
            const character = new Character(id, config, this.scene, this.physics);
            character.createPlaceholder(config.color, positions[i]);
            this.players.push(character);
            console.log(`Created character: ${id} at position ${positions[i].x}, ${positions[i].y}, ${positions[i].z}`);
            i++;
        }
    }
    
    start(selectedCharacterId) {
        console.log('Starting game with character:', selectedCharacterId);
        
        // Ensure transactions are being generated
        if (this.blockchainManager) {
            this.blockchainManager.startVisualMockTransactions();
            
            // Log a game start action to generate an immediate transaction
            this.blockchainManager.logAction('Game Start', {
                characterId: selectedCharacterId || 'default',
                timestamp: Date.now()
            });
        }
        
        this.selectedCharacter = selectedCharacterId;
        this.isRunning = true;
        this.gameStartTime = performance.now(); // Record game start time
        console.log(`Starting game with character ID: ${selectedCharacterId}`);
        
        // Set player's character
        const player = this.players.find(p => p.id === selectedCharacterId);
        if (player) {
            player.isPlayer = true;
            
            // Position camera pivot at player position
            this.cameraPivot.position.copy(player.position);
            // Add slight vertical offset for better view
            this.cameraPivot.position.y = 1;
            
            // Keep reference to player's character for camera following
            this.playerCharacter = player;
            
            // Enable orbit controls for camera rotation around player
            this.controls.enabled = true;
            // Adjust target to be player position
            this.controls.target.copy(this.cameraPivot.position);
            
            // Attach game controls to player
            this.gameControls.attachCharacter(player);
            
            // Make attack radius indicator visible for player
            if (player.attackRadiusIndicator) {
                player.attackRadiusIndicator.visible = true;
                player.attackRadiusRing.visible = true;
            }
            
            // Update HUD with player name and health
            this.updatePlayerHUD(player);
            
            console.log(`Player character set: ${player.config.name}`);
        } else {
            console.error(`Could not find character with ID: ${selectedCharacterId}`);
            // Fall back to first character
            if (this.players.length > 0) {
                this.players[0].isPlayer = true;
                this.playerCharacter = this.players[0];
                this.gameControls.attachCharacter(this.players[0]);
                
                // Make attack radius indicator visible for player
                if (this.players[0].attackRadiusIndicator) {
                    this.players[0].attackRadiusIndicator.visible = true;
                    this.players[0].attackRadiusRing.visible = true;
                }
                
                // Update HUD with player name and health
                this.updatePlayerHUD(this.players[0]);
                
                console.log(`Falling back to character: ${this.players[0].config.name}`);
            }
        }
        
        // Start AI for non-player characters
        this.players.forEach(p => {
            if (!p.isPlayer) {
                p.isAI = true;
                p.startAI();
                console.log(`Starting AI for: ${p.config.name}`);
            }
        });
        
        // Start physics simulation
        this.physics.start();
        
        // Start animation loop
        this.animate();
        
        // Play crowd sound
        this.soundManager.play('crowd_cheer');
        
        console.log(`Game started with character: ${selectedCharacterId}`);
    }
    
    updatePlayerHUD(player) {
        let hud = document.getElementById('hud');
        if (!hud) return;
        
        // Create/update player info section
        let playerInfo = document.getElementById('player-info');
        if (!playerInfo) {
            playerInfo = document.createElement('div');
            playerInfo.id = 'player-info';
            playerInfo.style.position = 'absolute';
            playerInfo.style.top = '20px';
            playerInfo.style.left = '20px';
            playerInfo.style.padding = '10px';
            playerInfo.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            playerInfo.style.borderRadius = '5px';
            playerInfo.style.color = 'white';
            hud.appendChild(playerInfo);
        }
        
        // Update player name and character
        playerInfo.innerHTML = `
            <div style="display: flex; align-items: center;">
                <div style="width: 30px; height: 30px; border-radius: 50%; background-color: #${player.config.color.toString(16).padStart(6, '0')}; margin-right: 10px;"></div>
                <div>
                    <div style="font-weight: bold; font-size: 16px;">${player.config.name}</div>
                    <div style="font-size: 12px;">Special Move: ${player.config.specialMove}</div>
                </div>
            </div>
            <div class="health-container" style="margin-top: 5px; width: 200px; height: 15px; background-color: #333; border-radius: 10px; overflow: hidden;">
                <div class="health-bar" style="width: 100%; height: 100%; background-color: #2ecc71; transition: width 0.3s;"></div>
            </div>
        `;
    }
    
    updateHUD() {
        if (!this.isRunning) return;
        
        // Update player health bar
        if (this.playerCharacter) {
            const healthPercent = (this.playerCharacter.health / this.playerCharacter.config.health) * 100;
            const healthBar = document.querySelector('.health-bar');
            if (healthBar) {
                healthBar.style.width = `${healthPercent}%`;
                
                // Change color based on health
                if (healthPercent > 60) {
                    healthBar.style.backgroundColor = '#2ecc71'; // Green
                } else if (healthPercent > 30) {
                    healthBar.style.backgroundColor = '#f39c12'; // Orange
                } else {
                    healthBar.style.backgroundColor = '#e74c3c'; // Red
                }
            }
            
            // Update Wakanda energy bar
            const wakandaEnergyBar = document.getElementById('wakanda-energy-bar');
            const wakandaStatus = document.getElementById('wakanda-status');
            
            if (wakandaEnergyBar && wakandaStatus && this.playerCharacter.wakandaEnergy !== undefined) {
                const energyPercent = this.playerCharacter.wakandaEnergy;
                wakandaEnergyBar.style.width = `${energyPercent}%`;
                
                // Update status text - adapted for 50% threshold
                if (energyPercent < 25) {
                    wakandaStatus.textContent = 'Energy: ' + energyPercent.toFixed(0) + '% - Collecting...';
                    wakandaStatus.style.color = 'white';
                    wakandaStatus.style.fontWeight = 'normal';
                } else if (energyPercent < 50) {
                    wakandaStatus.textContent = 'Energy: ' + energyPercent.toFixed(0) + '% - Almost Ready!';
                    wakandaStatus.style.color = 'white';
                    wakandaStatus.style.fontWeight = 'normal';
                } else {
                    wakandaStatus.textContent = 'ENERGY READY! - Press SHIFT to Release!';
                    wakandaStatus.style.color = '#f1c40f';
                    wakandaStatus.style.fontWeight = 'bold';
                    
                    // Add pulsing effect to text
                    if (!wakandaStatus.classList.contains('pulsing')) {
                        wakandaStatus.classList.add('pulsing');
                        
                        // Create style for pulsing if it doesn't exist
                        if (!document.getElementById('pulse-animation')) {
                            const style = document.createElement('style');
                            style.id = 'pulse-animation';
                            style.innerHTML = `
                                @keyframes pulse {
                                    0% { transform: scale(1); }
                                    50% { transform: scale(1.05); }
                                    100% { transform: scale(1); }
                                }
                                .pulsing {
                                    animation: pulse 1s infinite;
                                    transform-origin: center;
                                }
                            `;
                            document.head.appendChild(style);
                        }
                    }
                }
            }
        }
        
        // Any additional HUD updates can go here
    }
    
    reset() {
        // Reset all characters
        this.players.forEach(player => {
            player.reset();
            player.isPlayer = false;
        });
        
        // Reset game state
        this.isRunning = false;
        this.selectedCharacter = null;
        
        // Reset HUD
        document.getElementById('hud').style.display = 'none';
        
        // Re-enable orbit controls
        this.controls.enabled = true;
        
        console.log('Game reset');
    }
    
    onWindowResize() {
        // Update camera aspect ratio
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        
        // Update renderer size
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    animate() {
        if (!this.isRunning) return;
        
        requestAnimationFrame(this.animate);
        
        // Calculate delta time for smooth animation regardless of frame rate
        const currentTime = performance.now();
        const deltaTime = (currentTime - this.lastFrameTime) / 1000; // Convert to seconds
        this.lastFrameTime = currentTime;
        
        // Update camera position to follow player
        if (this.playerCharacter && this.playerCharacter.health > 0) {
            // Smoothly move camera pivot to player position
            this.cameraPivot.position.lerp(
                new THREE.Vector3(
                    this.playerCharacter.position.x,
                    this.playerCharacter.position.y + 1, // Add height offset
                    this.playerCharacter.position.z
                ), 
                0.1 // Smoothing factor
            );
            
            // Update orbit controls target
            this.controls.target.copy(this.cameraPivot.position);
        }
        
        // Update controls - always use for camera orbiting
        this.controls.update();
        
        // Update physics
        this.physics.update(deltaTime);
        
        // Update all players with proper delta time
        this.players.forEach(player => player.update(deltaTime));
        
        // Update game controls (for player character)
        this.gameControls.update(deltaTime);
        
        // Update HUD
        this.updateHUD();
        
        // Check for victories/defeats
        this.checkGameState();
        
        // Render scene
        this.renderer.render(this.scene, this.camera);
    }
    
    checkGameState() {
        // Don't check for game end until minimum game duration has passed
        const currentTime = performance.now();
        const gameElapsedTime = currentTime - this.gameStartTime;
        
        if (gameElapsedTime < this.minGameDuration) {
            console.log(`Game has only been running for ${Math.round(gameElapsedTime/1000)} seconds, minimum is ${this.minGameDuration/1000} seconds`);
            return; // Too early to end the game
        }
        
        // Make sure at least some characters have taken damage
        const damagedPlayers = this.players.filter(p => p.health < p.config.health);
        if (damagedPlayers.length === 0) {
            console.log("No players have taken damage yet, continuing game");
            return; // No one has taken damage yet
        }
        
        // Check if player has been defeated
        if (this.playerCharacter && this.playerCharacter.health <= 0 && !this.playerDefeatedMessageShown) {
            this.showGameOverMessage('YOU LOST!', 'Your fighter has been defeated.', 'rgba(200, 0, 0, 0.8)');
            this.playerDefeatedMessageShown = true;
        }
        
        // Check if game is over (1 or fewer players standing)
        const activePlayers = this.players.filter(p => p.health > 0);
        
        if (activePlayers.length <= 1) {
            // Game over!
            const winner = activePlayers[0];
            
            if (winner) {
                this.endGame(winner);
            } else {
                // Draw (everyone lost)
                this.endGame(null);
            }
        }
    }
    
    showGameOverMessage(title, message, backgroundColor) {
        let gameOverMessage = document.getElementById('game-over-message');
        if (!gameOverMessage) {
            gameOverMessage = document.createElement('div');
            gameOverMessage.id = 'game-over-message';
            gameOverMessage.style.position = 'absolute';
            gameOverMessage.style.top = '50%';
            gameOverMessage.style.left = '50%';
            gameOverMessage.style.transform = 'translate(-50%, -50%)';
            gameOverMessage.style.padding = '30px';
            gameOverMessage.style.borderRadius = '10px';
            gameOverMessage.style.color = 'white';
            gameOverMessage.style.textAlign = 'center';
            gameOverMessage.style.zIndex = '1000';
            gameOverMessage.style.fontFamily = 'Arial, sans-serif';
            gameOverMessage.style.opacity = '0';
            gameOverMessage.style.transition = 'opacity 1s';
            document.body.appendChild(gameOverMessage);
        }
        
        gameOverMessage.style.backgroundColor = backgroundColor || 'rgba(0, 0, 0, 0.8)';
        gameOverMessage.innerHTML = `
            <h1 style="font-size: 48px; margin-bottom: 20px;">${title}</h1>
            <p style="font-size: 24px; margin-bottom: 30px;">${message}</p>
        `;
        
        // Fade in the message
        setTimeout(() => {
            gameOverMessage.style.opacity = '1';
        }, 100);
        
        // Fade out after 3 seconds
        setTimeout(() => {
            gameOverMessage.style.opacity = '0';
        }, 3000);
    }
    
    endGame(winner) {
        this.isRunning = false;
        
        // Show appropriate game over screen
        if (winner && winner.isPlayer) {
            // Player won! Show championship celebration
            this.showChampionshipCelebration(winner);
            
            // Mint championship trophy NFT
            this.blockchainManager.logAction('championship', {
                winnerName: winner.config.name,
                winnerId: winner.id,
                opponents: this.players.filter(p => p.id !== winner.id).map(p => p.id)
            }).then(() => {
                // After logging the win, mint the NFT
                // Note: In a real implementation, you'd use the user's actual wallet address
                const winnerAddress = process.env.WALLET_ADDRESS || this.blockchainManager.wallet?.address;
                if (winnerAddress) {
                    return this.blockchainManager.mintChampionshipTrophy(winnerAddress);
                }
            }).catch(err => console.error('Failed to mint trophy:', err));
        } else if (winner) {
            // AI won
            this.showGameOverMessage('GAME OVER', `${winner.config.name} is the champion!`, 'rgba(0, 0, 150, 0.8)');
        } else {
            // Draw - everyone lost
            this.showGameOverMessage('DRAW', 'All fighters have been defeated!', 'rgba(100, 100, 100, 0.8)');
        }
        
        // Show game over screen
        const gameOverScreen = document.getElementById('game-over');
        const winnerDisplay = document.getElementById('winner-display');
        const transactionStatus = document.getElementById('transaction-status');
        
        if (gameOverScreen) {
            setTimeout(() => {
                gameOverScreen.style.display = 'flex';
            }, 5000); // Show after the celebration/message
        }
        
        if (winner && winnerDisplay) {
            // Display winner
            winnerDisplay.style.backgroundColor = `#${winner.config.color.toString(16).padStart(6, '0')}`;
            winnerDisplay.innerHTML = `<h3>${winner.config.name}</h3><p>Champion!</p>`;
            
            // If winner is player, mint NFT
            if (winner.isPlayer) {
                transactionStatus.textContent = 'Minting your champion NFT on Monad Testnet...';
            }
        }
        
        // Setup Twitter share button
        const twitterShareButton = document.getElementById('twitter-share');
        if (twitterShareButton) {
            console.log('Setting up Twitter share button in game over screen');
            twitterShareButton.onclick = function(e) {
                e.preventDefault();
                
                const gameUrl = "https://wwecryptotwitter.netlify.app";
                const winnerName = winner ? winner.name : "a new champion";
                const text = `Play this game and John Cena might follow you! ${gameUrl}`;
                const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
                
                window.open(twitterUrl, '_blank');
                console.log('Opened Twitter share from game over screen');
                return false;
            };
        }
    }
    
    showChampionshipCelebration(winner) {
        // Create championship celebration overlay
        let celebration = document.getElementById('championship-celebration');
        if (!celebration) {
            celebration = document.createElement('div');
            celebration.id = 'championship-celebration';
            celebration.style.position = 'absolute';
            celebration.style.top = '0';
            celebration.style.left = '0';
            celebration.style.width = '100%';
            celebration.style.height = '100%';
            celebration.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            celebration.style.display = 'flex';
            celebration.style.flexDirection = 'column';
            celebration.style.justifyContent = 'center';
            celebration.style.alignItems = 'center';
            celebration.style.color = 'white';
            celebration.style.fontFamily = 'Arial, sans-serif';
            celebration.style.zIndex = '1000';
            celebration.style.opacity = '0';
            celebration.style.transition = 'opacity 1s';
            
            document.body.appendChild(celebration);
        }
        
        // WWE style championship message
        celebration.innerHTML = `
            <h1 style="font-size: 72px; color: gold; text-shadow: 0 0 20px gold; margin-bottom: 30px;">CHAMPION!</h1>
            <div style="position: relative; width: 300px; height: 300px; margin-bottom: 40px;">
                <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-color: ${new THREE.Color(winner.config.color).getStyle()}; border-radius: 50%; box-shadow: 0 0 50px gold;"></div>
                <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; width: 100%;">
                    <h2 style="font-size: 32px; margin-bottom: 10px;">${winner.config.name}</h2>
                    <p style="font-size: 24px;">Champion!</p>
                </div>
            </div>
            <div style="background-color: rgba(0, 0, 0, 0.7); padding: 20px; border-radius: 10px; text-align: center; max-width: 80%;">
                <h3 style="font-size: 36px; color: gold; margin-bottom: 20px;">ROYAL RUMBLE CHAMPION</h3>
                <p style="font-size: 24px; margin-bottom: 30px;">Congratulations! You are the last fighter standing!</p>
                <p style="font-size: 20px;">Minting Trophy NFT on Monat Testnet...</p>
            </div>
        `;
        
        // Create confetti particles
        for (let i = 0; i < 100; i++) {
            const confetti = document.createElement('div');
            confetti.style.position = 'absolute';
            confetti.style.width = `${Math.random() * 10 + 5}px`;
            confetti.style.height = `${Math.random() * 10 + 5}px`;
            confetti.style.backgroundColor = ['#f1c40f', '#e74c3c', '#3498db', '#2ecc71', '#9b59b6'][Math.floor(Math.random() * 5)];
            confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
            confetti.style.top = `${Math.random() * 100}%`;
            confetti.style.left = `${Math.random() * 100}%`;
            confetti.style.opacity = '0';
            confetti.style.transform = 'translateY(-100vh)';
            confetti.style.transition = `transform ${Math.random() * 3 + 2}s ease-out, opacity 0.5s`;
            
            celebration.appendChild(confetti);
            
            // Animate confetti falling
            setTimeout(() => {
                confetti.style.opacity = '1';
                confetti.style.transform = `translateY(${Math.random() * 100}vh) rotate(${Math.random() * 360}deg)`;
            }, Math.random() * 500);
        }
        
        // Fade in celebration
        setTimeout(() => {
            celebration.style.opacity = '1';
            
            // Play championship sound if available
            if (this.soundManager) {
                this.soundManager.play('crowd_cheer');
            }
        }, 100);
        
        // Fade out after 5 seconds
        setTimeout(() => {
            celebration.style.opacity = '0';
            setTimeout(() => {
                if (celebration.parentNode) {
                    celebration.parentNode.removeChild(celebration);
                }
            }, 1000);
        }, 5000);
    }
    
    // Show a battle notification when a player is defeated
    showBattleNotification(message, duration = 3000) {
        const battleNotifications = document.getElementById('battle-notifications');
        if (!battleNotifications) return;
        
        const notification = document.createElement('div');
        notification.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        notification.style.color = 'white';
        notification.style.padding = '10px';
        notification.style.marginBottom = '10px';
        notification.style.borderRadius = '5px';
        notification.style.borderLeft = '4px solid #f1c40f';
        notification.style.fontSize = '14px';
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s';
        notification.textContent = message;
        
        battleNotifications.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.opacity = '1';
        }, 50);
        
        // Remove after duration
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                if (battleNotifications.contains(notification)) {
                    battleNotifications.removeChild(notification);
                }
            }, 300);
        }, duration);
    }
    
    // Log movement action to blockchain
    logMovementAction(direction) {
        if (this.isRunning && this.blockchainManager) {
            console.log(`Logging movement action: ${direction}`);
            try {
                this.blockchainManager.logAction('move', {
                    direction,
                    characterId: this.playerCharacter?.id,
                    timestamp: Date.now()
                }).then(result => {
                    console.log('Movement logged to blockchain:', result);
                }).catch(error => {
                    console.error('Failed to log movement:', error);
                });
            } catch (error) {
                console.error('Error calling blockchain manager:', error);
            }
        }
    }
    
    // Log special move action to blockchain
    logSpecialMoveAction(moveType) {
        if (this.isRunning && this.blockchainManager) {
            console.log(`Logging special move: ${moveType}`);
            try {
                this.blockchainManager.logAction('special_move', {
                    moveType,
                    characterId: this.playerCharacter?.id,
                    timestamp: Date.now()
                }).then(result => {
                    console.log('Special move logged to blockchain:', result);
                }).catch(error => {
                    console.error('Failed to log special move:', error);
                });
            } catch (error) {
                console.error('Error calling blockchain manager:', error);
            }
        }
    }
    
    // Log grapple action to blockchain
    logGrappleAction(targetId) {
        if (this.isRunning && this.blockchainManager) {
            console.log(`Logging grapple action: ${targetId}`);
            try {
                this.blockchainManager.logAction('grapple', {
                    targetId,
                    characterId: this.playerCharacter?.id,
                    timestamp: Date.now()
                }).then(result => {
                    console.log('Grapple logged to blockchain:', result);
                }).catch(error => {
                    console.error('Failed to log grapple:', error);
                });
            } catch (error) {
                console.error('Error calling blockchain manager:', error);
            }
        }
    }
    
    // Log rope bounce action to blockchain
    logRopeBounceAction() {
        if (this.isRunning && this.blockchainManager) {
            console.log('Logging rope bounce action');
            try {
                this.blockchainManager.logAction('rope_bounce', {
                    characterId: this.playerCharacter?.id,
                    timestamp: Date.now()
                }).then(result => {
                    console.log('Rope bounce logged to blockchain:', result);
                }).catch(error => {
                    console.error('Failed to log rope bounce:', error);
                });
            } catch (error) {
                console.error('Error calling blockchain manager:', error);
            }
        }
    }
} 