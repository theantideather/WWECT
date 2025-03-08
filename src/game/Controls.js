import * as THREE from 'three';

export class Controls {
    constructor() {
        // Input state
        this.keys = {
            w: false,
            a: false,
            s: false,
            d: false,
            e: false,
            space: false,
            arrowup: false,
            arrowdown: false,
            arrowleft: false,
            arrowright: false,
            shift: false // For sprinting
        };
        
        // Mouse state
        this.mouse = {
            x: 0,
            y: 0,
            down: false
        };
        
        // Controlled character
        this.character = null;
        
        // Direction vector for movement
        this.moveDirection = new THREE.Vector3();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Keyboard state tracking for responsive controls
        this.keyPressed = false;
        this.lastKeyTime = 0;
        this.doubleTapTime = 300; // ms to detect double tap
    }
    
    setupEventListeners() {
        // Keyboard events
        document.addEventListener('keydown', (event) => {
            this.onKeyDown(event.key.toLowerCase());
            console.log(`Key down: ${event.key.toLowerCase()}`); // Debug logging
        });
        
        document.addEventListener('keyup', (event) => {
            this.onKeyUp(event.key.toLowerCase());
        });
        
        // Mouse events - attach to the canvas for better precision
        const canvas = document.getElementById('game-canvas');
        
        if (canvas) {
            canvas.addEventListener('mousemove', (event) => {
                this.onMouseMove(event);
            });
            
            canvas.addEventListener('mousedown', (event) => {
                this.onMouseDown(event);
                console.log('Mouse down event detected'); // Debug logging
            });
            
            canvas.addEventListener('mouseup', (event) => {
                this.onMouseUp(event);
            });
            
            // Make sure canvas can receive focus for keyboard events
            canvas.setAttribute('tabindex', '1');
            
            // Ensure canvas has focus when clicked
            canvas.addEventListener('click', () => {
                canvas.focus();
            });
        } else {
            console.error('Game canvas not found!');
            // Fall back to document level events
            document.addEventListener('mousemove', (event) => {
                this.onMouseMove(event);
            });
            
            document.addEventListener('mousedown', (event) => {
                this.onMouseDown(event);
                console.log('Mouse down event detected (document)'); // Debug logging
            });
            
            document.addEventListener('mouseup', (event) => {
                this.onMouseUp(event);
            });
        }
    }
    
    onKeyDown(key) {
        // Map arrow keys
        if (key === 'arrowup' || key === 'up') key = 'arrowup';
        if (key === 'arrowdown' || key === 'down') key = 'arrowdown';
        if (key === 'arrowleft' || key === 'left') key = 'arrowleft';
        if (key === 'arrowright' || key === 'right') key = 'arrowright';
        if (key === 'shift') key = 'shift';
        if (key === ' ' || key === 'spacebar') key = 'space';
        
        // Track time for double-tap detection
        const now = Date.now();
        const sameKey = this.lastKeyCode === key;
        const isDoubleTap = sameKey && (now - this.lastKeyTime < this.doubleTapTime);
        
        this.lastKeyCode = key;
        this.lastKeyTime = now;
        
        // Update key state
        if (key in this.keys) {
            this.keys[key] = true;
            this.keyPressed = true;
        }
        
        // Log movement to blockchain
        if (this.character && this.scene && this.scene.parent) {
            const game = this.scene.parent;
            // Determine direction
            let direction = null;
            if (key === 'w' || key === 'arrowup') direction = 'up';
            if (key === 's' || key === 'arrowdown') direction = 'down';
            if (key === 'a' || key === 'arrowleft') direction = 'left';
            if (key === 'd' || key === 'arrowright') direction = 'right';
            
            if (direction && typeof game.logMovementAction === 'function') {
                game.logMovementAction(direction);
            }
        }
        
        // Handle special key inputs with blockchain logging
        if (key === 'e' && this.character) {
            this.character.attack();
            console.log('Attack command triggered'); // Debug logging
            
            // Log grapple action if close to another character
            const nearbyEnemies = this.findNearbyEnemies();
            if (nearbyEnemies.length > 0 && this.scene && this.scene.parent) {
                const game = this.scene.parent;
                if (typeof game.logGrappleAction === 'function') {
                    game.logGrappleAction(nearbyEnemies[0].id);
                }
            }
        }
        
        if (key === 'space' && this.character) {
            this.character.useSpecialMove();
            console.log('Special move command triggered'); // Debug logging
            
            // Log special move to blockchain
            if (this.scene && this.scene.parent) {
                const game = this.scene.parent;
                if (typeof game.logSpecialMoveAction === 'function') {
                    game.logSpecialMoveAction(this.character.id + '_special');
                }
            }
        }
        
        // Handle jumping
        if ((key === 'arrowup' || key === 'w') && this.character && !this.character.isJumping) {
            this.character.jump();
            console.log('Jump command triggered'); // Debug logging
        }
        
        // Handle Wakanda energy release - updated threshold to 50%
        if (key === 'shift' && this.character && this.character.wakandaEnergy >= 50) {
            this.character.releaseWakandaEnergy();
            console.log('Wakanda energy release triggered'); // Debug logging
        }
        
        // Handle double-tap sprint
        if (isDoubleTap && (key === 'w' || key === 's' || key === 'a' || key === 'd' || 
                            key === 'arrowup' || key === 'arrowdown' || key === 'arrowleft' || key === 'arrowright')) {
            // Set sprint flag
            this.sprinting = true;
            console.log('Sprint activated'); // Debug logging
            
            // Reset sprint after a delay
            clearTimeout(this.sprintTimeout);
            this.sprintTimeout = setTimeout(() => {
                this.sprinting = false;
            }, 1500); // Sprint for 1.5 seconds
        }
    }
    
    onKeyUp(key) {
        // Map arrow keys
        if (key === 'arrowup') key = 'arrowup';
        if (key === 'arrowdown') key = 'arrowdown';
        if (key === 'arrowleft') key = 'arrowleft';
        if (key === 'arrowright') key = 'arrowright';
        if (key === 'shift') key = 'shift';
        
        // Update key state
        if (key in this.keys) {
            this.keys[key] = false;
        }
        
        // Check if any movement keys are still pressed
        const movementKeys = ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'];
        this.keyPressed = movementKeys.some(k => this.keys[k]);
    }
    
    onMouseMove(event) {
        // Update mouse position
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    }
    
    onMouseDown(event) {
        this.mouse.down = true;
        
        // Left click (attack)
        if (event.button === 0 && this.character) {
            this.character.attack();
        }
    }
    
    onMouseUp(event) {
        this.mouse.down = false;
    }
    
    attachCharacter(character) {
        this.character = character;
    }
    
    detachCharacter() {
        this.character = null;
    }
    
    update(deltaTime = 0.016) {
        if (!this.character) return;
        
        // Calculate move direction from keys
        this.moveDirection.set(0, 0, 0);
        
        // WASD controls
        if (this.keys.w) this.moveDirection.z -= 1;
        if (this.keys.s) this.moveDirection.z += 1;
        if (this.keys.a) this.moveDirection.x -= 1;
        if (this.keys.d) this.moveDirection.x += 1;
        
        // Arrow key controls (alternative)
        if (this.keys.arrowup) this.moveDirection.z -= 1;
        if (this.keys.arrowdown) this.moveDirection.z += 1;
        if (this.keys.arrowleft) this.moveDirection.x -= 1;
        if (this.keys.arrowright) this.moveDirection.x += 1;
        
        // Normalize if we have diagonal movement
        if (this.moveDirection.lengthSq() > 0) {
            this.moveDirection.normalize();
            
            // Boost movement speed when shift is held or double-tap sprint is active
            if (this.keys.shift || this.sprinting) {
                this.character.sprintMultiplier = 2.0; // Even faster sprint
                
                // Create dust trail for sprinting
                if (Math.random() < 0.2 && !this.character.isJumping) {
                    this.character.createJumpDustEffect();
                }
            } else {
                this.character.sprintMultiplier = 1.5; // Normal movement boost
            }
            
            // Set character state to walking
            if (!this.character.isJumping) {
                this.character.state = 'walking';
            }
            
            // Calculate target position - move further when sprinting
            const moveDistance = this.character.movementSpeed * 
                                (this.keys.shift || this.sprinting ? 3 : 1.5);
                                
            const targetPosition = new THREE.Vector3()
                .copy(this.character.position)
                .add(this.moveDirection.clone().multiplyScalar(moveDistance));
            
            // Set character target position
            this.character.targetPosition = targetPosition;
            
            // Rotate character to face movement direction
            const lookTarget = new THREE.Vector3()
                .addVectors(this.character.position, this.moveDirection);
            
            if (this.character.mesh) {
                this.character.mesh.lookAt(lookTarget);
            }
        } else if (this.character.state === 'walking') {
            // If no movement keys are pressed but character is walking, stop
            this.character.state = 'idle';
            this.character.targetPosition = null;
            
            // Reset sprint multiplier
            this.character.sprintMultiplier = 1.5;
        }
        
        // Handle continuous keyboard input for special actions
        if (this.keys.space && this.character.clout >= 100 && this.character.specialCooldown <= 0) {
            this.character.useSpecialMove();
        }
    }
    
    // Helper method to find nearby enemies for grapple detection
    findNearbyEnemies() {
        if (!this.character || !this.scene) return [];
        
        const nearbyEnemies = [];
        const MAX_GRAPPLE_DISTANCE = 2; // Maximum distance for a grapple
        
        this.scene.traverse(obj => {
            if (obj.userData && obj.userData.character && 
                obj.userData.character !== this.character && 
                obj.userData.character.health > 0) {
                
                const distance = this.character.position.distanceTo(obj.userData.character.position);
                if (distance <= MAX_GRAPPLE_DISTANCE) {
                    nearbyEnemies.push(obj.userData.character);
                }
            }
        });
        
        return nearbyEnemies;
    }
}

export default Controls; 