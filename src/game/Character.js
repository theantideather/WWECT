import * as THREE from 'three';
import gsap from 'gsap';

export class Character {
    constructor(id, config, scene, physics) {
        this.id = id;
        this.config = config;
        this.scene = scene;
        this.physics = physics;
        
        // Character state
        this.health = config.health;
        this.clout = 0; // for special moves
        this.isPlayer = false;
        this.isAI = false;
        this.state = 'idle'; // idle, walking, attacking, special, hit, defeated
        this.direction = new THREE.Vector3(0, 0, 1);
        this.velocity = new THREE.Vector3();
        this.position = new THREE.Vector3();
        this.targetPosition = null;
        this.attackTarget = null;
        this.attackCooldown = 0;
        this.specialCooldown = 0;
        
        // Wakanda energy system
        this.wakandaEnergy = 0; // 0-100%
        this.wakandaEnergyMax = 100;
        this.canUseWakandaEnergy = false;
        
        // Mesh and body references
        this.mesh = null;
        this.body = null;
        this.mixer = null; // for animations
        this.animations = {};
        
        // Special move properties
        this.specialMoves = {
            trump: {
                name: 'MAGA Slam',
                damage: 30,
                range: 2,
                cooldown: 5000,
                animation: 'magaSlam'
            },
            vitalik: {
                name: 'Smart Contract Throw',
                damage: 25,
                range: 3,
                cooldown: 4000,
                animation: 'smartContractThrow'
            },
            kanye: {
                name: '808 Dropkick',
                damage: 35,
                range: 2.5,
                cooldown: 6000,
                animation: '808Dropkick'
            },
            sbf: {
                name: 'Alameda Suplex',
                damage: 20,
                range: 1.5,
                cooldown: 3000,
                animation: 'alamedaSuplex'
            }
        };
        
        // Jump and movement properties
        this.isJumping = false;
        this.jumpHeight = 0;
        this.jumpVelocity = 0;
        this.jumpSpeed = 0.4; // Increased jump height
        this.gravity = 0.02; // Stronger gravity for faster falls
        this.movementSpeed = config.speed * 0.4; // Increased base speed by 2.5x
        this.sprintMultiplier = 1.5; // For sprinting
        
        // Visual effect tracking
        this.hitEffects = [];
        this.punchEffects = [];
        this.isAnimating = false;
        
        // Defeat tracking
        this.defeatedBy = null;
    }
    
    createPlaceholder(color, position) {
        // Create a character model instead of a simple cube
        // We'll create a humanoid figure with head, torso, arms and legs
        
        // Create a group to hold all parts of the character
        this.mesh = new THREE.Group();
        this.mesh.position.copy(position);
        this.position.copy(position);
        
        // Store character reference in mesh.userData for ray casting and AI detection
        this.mesh.userData.character = this;
        
        // Character base color (with some custom variations per character)
        let baseColor = color;
        let headColor = color;
        let limbColor = color;
        
        // Custom colors and attributes based on character
        switch(this.id) {
            case 'trump':
                // Orange body, yellow hair
                headColor = 0xFFD700; // Gold for hair
                break;
            case 'vitalik':
                // Purple hoodie
                limbColor = 0x6b46c1; // Darker purple for limbs
                break;
            case 'kanye':
                // Dark outfit
                limbColor = 0x111111; // Almost black limbs
                break;
            case 'sbf':
                // Light sea green with more pastel clothing
                limbColor = 0x66cdaa; // Medium aquamarine limbs
                break;
        }
        
        // Create parts with improved proportions
        const head = new THREE.Mesh(
            new THREE.SphereGeometry(0.25, 16, 16),
            new THREE.MeshPhongMaterial({ color: headColor })
        );
        head.position.y = 0.5; // Position head above torso
        
        const torso = new THREE.Mesh(
            new THREE.BoxGeometry(0.6, 0.8, 0.3),
            new THREE.MeshPhongMaterial({ color: baseColor })
        );
        torso.position.y = 0; // Center of the character
        
        // Create limbs
        const leftArm = new THREE.Mesh(
            new THREE.BoxGeometry(0.2, 0.6, 0.2),
            new THREE.MeshPhongMaterial({ color: limbColor })
        );
        leftArm.position.set(-0.4, 0, 0); // Left of torso
        leftArm.rotation.z = Math.PI / 4; // Angle arm slightly outward
        
        const rightArm = new THREE.Mesh(
            new THREE.BoxGeometry(0.2, 0.6, 0.2),
            new THREE.MeshPhongMaterial({ color: limbColor })
        );
        rightArm.position.set(0.4, 0, 0); // Right of torso
        rightArm.rotation.z = -Math.PI / 4; // Angle arm slightly outward
        
        const leftLeg = new THREE.Mesh(
            new THREE.BoxGeometry(0.2, 0.6, 0.2),
            new THREE.MeshPhongMaterial({ color: limbColor })
        );
        leftLeg.position.set(-0.2, -0.7, 0); // Below torso, left side
        
        const rightLeg = new THREE.Mesh(
            new THREE.BoxGeometry(0.2, 0.6, 0.2),
            new THREE.MeshPhongMaterial({ color: limbColor })
        );
        rightLeg.position.set(0.2, -0.7, 0); // Below torso, right side
        
        // Add all parts to the mesh
        this.mesh.add(head);
        this.mesh.add(torso);
        this.mesh.add(leftArm);
        this.mesh.add(rightArm);
        this.mesh.add(leftLeg);
        this.mesh.add(rightLeg);
        
        // Store references to parts for animation
        this.parts = {
            head,
            torso,
            leftArm,
            rightArm,
            leftLeg,
            rightLeg
        };
        
        // Add to scene
        this.scene.add(this.mesh);
        
        // Add character details like face, clothes, etc.
        this.addCharacterDetails();
        
        // Create a physics body for this character
        this.body = this.physics.createBody(this.mesh, {
            type: 'dynamic',
            radius: 0.8, // Collision radius
            character: this // Reference to this character
        });
        
        // Create nameplate above character
        this.createNameSprite(this.config.name);
        
        // Create 3D health bar above character
        this.createHealthBar();
        
        // Create attack radius indicator
        this.createAttackRadiusIndicator();
        
        // Set initial health display
        this.updateHealthDisplay();
    }
    
    addCharacterDetails() {
        // Add unique details to each character
        switch(this.id) {
            case 'trump':
                // Add hair
                const hairGeometry = new THREE.BoxGeometry(0.4, 0.2, 0.4);
                const hairMaterial = new THREE.MeshPhongMaterial({ 
                    color: 0xFFD700,
                    shininess: 100
                });
                const hair = new THREE.Mesh(hairGeometry, hairMaterial);
                hair.position.set(0, 0.95, 0);
                this.mesh.add(hair);
                
                // Add swept hair tuft in front
                const hairTuftGeometry = new THREE.BoxGeometry(0.3, 0.1, 0.2);
                const hairTuft = new THREE.Mesh(hairTuftGeometry, hairMaterial);
                hairTuft.position.set(0, 0.95, 0.23);
                hairTuft.rotation.x = Math.PI / 6;
                this.mesh.add(hairTuft);
                
                // Add red tie
                const tieGeometry = new THREE.BoxGeometry(0.1, 0.4, 0.05);
                const tieMaterial = new THREE.MeshPhongMaterial({ 
                    color: 0xFF0000,
                    shininess: 50
                });
                const tie = new THREE.Mesh(tieGeometry, tieMaterial);
                tie.position.set(0, 0.1, 0.18);
                this.mesh.add(tie);
                
                // Add suit jacket
                const jacketGeometry = new THREE.BoxGeometry(0.7, 0.85, 0.4);
                const jacketMaterial = new THREE.MeshPhongMaterial({ 
                    color: 0x000080, // Navy blue
                    shininess: 30
                });
                const jacket = new THREE.Mesh(jacketGeometry, jacketMaterial);
                jacket.position.set(0, 0.2, 0);
                jacket.position.z = -0.05; // Slightly behind torso
                this.mesh.add(jacket);
                
                // Add eyebrows (angry expression)
                const eyebrowGeometry = new THREE.BoxGeometry(0.1, 0.03, 0.03);
                const eyebrowMaterial = new THREE.MeshPhongMaterial({ color: 0xD4AF37 });
                
                // Left eyebrow (angled down on outside)
                const leftEyebrow = new THREE.Mesh(eyebrowGeometry, eyebrowMaterial);
                leftEyebrow.position.set(-0.1, 0.9, 0.3);
                leftEyebrow.rotation.z = -Math.PI / 8;
                this.mesh.add(leftEyebrow);
                
                // Right eyebrow (angled down on outside)
                const rightEyebrow = new THREE.Mesh(eyebrowGeometry, eyebrowMaterial);
                rightEyebrow.position.set(0.1, 0.9, 0.3);
                rightEyebrow.rotation.z = Math.PI / 8;
                this.mesh.add(rightEyebrow);
                
                // Add American flag pin
                const pinGeometry = new THREE.BoxGeometry(0.08, 0.08, 0.03);
                const pinMaterial = new THREE.MeshPhongMaterial({ color: 0xCC0000 });
                const pin = new THREE.Mesh(pinGeometry, pinMaterial);
                pin.position.set(-0.25, 0.4, 0.18);
                this.mesh.add(pin);
                
                break;
                
            case 'vitalik':
                // Add Ethereum logo on chest
                const logoGeometry = new THREE.CircleGeometry(0.15, 8);
                const logoMaterial = new THREE.MeshPhongMaterial({ 
                    color: 0xC3D7DF,
                    shininess: 100
                });
                const logo = new THREE.Mesh(logoGeometry, logoMaterial);
                logo.position.set(0, 0.2, 0.16);
                this.mesh.add(logo);
                
                // Add hoodie
                const hoodieGeometry = new THREE.SphereGeometry(0.35, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
                const hoodieMaterial = new THREE.MeshPhongMaterial({ 
                    color: 0x9370DB, 
                    side: THREE.DoubleSide,
                    shininess: 10
                });
                const hoodie = new THREE.Mesh(hoodieGeometry, hoodieMaterial);
                hoodie.position.set(0, 0.8, 0);
                hoodie.rotation.x = Math.PI / 6;
                this.mesh.add(hoodie);
                
                // Add longer hair
                const vitalikHairGeometry = new THREE.SphereGeometry(0.33, 8, 8);
                const vitalikHairMaterial = new THREE.MeshPhongMaterial({ color: 0x8B4513 });
                const vitalikHair = new THREE.Mesh(vitalikHairGeometry, vitalikHairMaterial);
                vitalikHair.position.set(0, 0.82, 0);
                vitalikHair.scale.set(1, 0.7, 1);
                this.mesh.add(vitalikHair);
                
                // Add laptop
                const laptopGeometry = new THREE.BoxGeometry(0.3, 0.02, 0.2);
                const laptopMaterial = new THREE.MeshPhongMaterial({ 
                    color: 0x333333,
                    shininess: 80
                });
                const laptop = new THREE.Mesh(laptopGeometry, laptopMaterial);
                laptop.position.set(-0.35, 0.15, 0.15);
                // Add to left arm instead of directly to body for better positioning
                this.parts.leftArm.add(laptop);
                
                // Add glasses
                const glassesFrameGeometry = new THREE.BoxGeometry(0.3, 0.05, 0.05);
                const glassesFrameMaterial = new THREE.MeshPhongMaterial({ color: 0x000000 });
                const glassesFrame = new THREE.Mesh(glassesFrameGeometry, glassesFrameMaterial);
                glassesFrame.position.set(0, 0.87, 0.3);
                this.mesh.add(glassesFrame);
                
                break;
                
            case 'kanye':
                // Add sunglasses
                const glassesGeometry = new THREE.BoxGeometry(0.5, 0.1, 0.1);
                const glassesMaterial = new THREE.MeshPhongMaterial({ 
                    color: 0x000000,
                    shininess: 100
                });
                const glasses = new THREE.Mesh(glassesGeometry, glassesMaterial);
                glasses.position.set(0, 0.85, 0.2);
                this.mesh.add(glasses);
                
                // Add mic
                const micStandGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.8, 8);
                const micStandMaterial = new THREE.MeshPhongMaterial({ 
                    color: 0x333333,
                    shininess: 80
                });
                const micStand = new THREE.Mesh(micStandGeometry, micStandMaterial);
                micStand.position.set(0, -0.2, 0);
                
                const micHeadGeometry = new THREE.SphereGeometry(0.07, 16, 16);
                const micHeadMaterial = new THREE.MeshPhongMaterial({ 
                    color: 0x888888,
                    shininess: 100
                });
                const micHead = new THREE.Mesh(micHeadGeometry, micHeadMaterial);
                micHead.position.set(0, 0.4, 0);
                micStand.add(micHead);
                
                // Add mic to right hand
                micStand.position.set(0.4, 0, 0.3);
                micStand.rotation.x = -Math.PI / 4;
                this.parts.rightArm.add(micStand);
                
                // Add Yeezy shoes
                const leftShoeGeometry = new THREE.BoxGeometry(0.15, 0.1, 0.3);
                const shoesMaterial = new THREE.MeshPhongMaterial({ 
                    color: 0xF5F5DC, // Beige
                    shininess: 30
                });
                const leftShoe = new THREE.Mesh(leftShoeGeometry, shoesMaterial);
                leftShoe.position.set(0, -0.35, 0.05);
                this.parts.leftLeg.add(leftShoe);
                
                const rightShoe = new THREE.Mesh(leftShoeGeometry, shoesMaterial);
                rightShoe.position.set(0, -0.35, 0.05);
                this.parts.rightLeg.add(rightShoe);
                
                // Add necklace with pendant
                const necklaceGeometry = new THREE.TorusGeometry(0.15, 0.02, 8, 16, Math.PI);
                const necklaceMaterial = new THREE.MeshPhongMaterial({ 
                    color: 0xFFD700, // Gold
                    shininess: 100
                });
                const necklace = new THREE.Mesh(necklaceGeometry, necklaceMaterial);
                necklace.position.set(0, 0.5, 0.15);
                necklace.rotation.x = Math.PI/2;
                this.mesh.add(necklace);
                
                const pendantGeometry = new THREE.SphereGeometry(0.06, 8, 8);
                const pendant = new THREE.Mesh(pendantGeometry, necklaceMaterial);
                pendant.position.set(0, 0.35, 0.2);
                this.mesh.add(pendant);
                
                break;
                
            case 'sbf':
                // Add messy hair
                const messyHairGeometry = new THREE.SphereGeometry(0.34, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2);
                const messyHairMaterial = new THREE.MeshPhongMaterial({ 
                    color: 0x8B4513,
                    shininess: 5 // Dull, messy hair
                });
                const messyHair = new THREE.Mesh(messyHairGeometry, messyHairMaterial);
                messyHair.position.set(0, 0.82, 0);
                messyHair.scale.set(1, 0.7, 1);
                this.mesh.add(messyHair);
                
                // Add additional messy hair tufts
                const hairTuft1 = new THREE.Mesh(
                    new THREE.SphereGeometry(0.1, 6, 6),
                    messyHairMaterial
                );
                hairTuft1.position.set(0.2, 0.9, 0);
                this.mesh.add(hairTuft1);
                
                const hairTuft2 = new THREE.Mesh(
                    new THREE.SphereGeometry(0.12, 6, 6),
                    messyHairMaterial
                );
                hairTuft2.position.set(-0.15, 0.95, 0.1);
                this.mesh.add(hairTuft2);
                
                // Add FTX logo on shirt
                const ftxGeometry = new THREE.BoxGeometry(0.3, 0.1, 0.05);
                const ftxMaterial = new THREE.MeshPhongMaterial({ 
                    color: 0x00A4FF,
                    shininess: 50
                });
                const ftx = new THREE.Mesh(ftxGeometry, ftxMaterial);
                ftx.position.set(0, 0.3, 0.18);
                this.mesh.add(ftx);
                
                // Add prison jumpsuit
                const jumpsuitGeometry = new THREE.BoxGeometry(0.65, 0.85, 0.35);
                const jumpsuitMaterial = new THREE.MeshPhongMaterial({ 
                    color: 0xFFA500, // Orange
                    shininess: 10
                });
                const jumpsuit = new THREE.Mesh(jumpsuitGeometry, jumpsuitMaterial);
                jumpsuit.position.set(0, 0.2, 0);
                jumpsuit.position.z = -0.05;
                this.mesh.add(jumpsuit);
                
                // Add ankle monitor
                const monitorGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.1, 8);
                const monitorMaterial = new THREE.MeshPhongMaterial({ 
                    color: 0x333333,
                    shininess: 50
                });
                const monitor = new THREE.Mesh(monitorGeometry, monitorMaterial);
                monitor.position.set(0, -0.3, 0);
                this.parts.rightLeg.add(monitor);
                
                // Add blinking light to monitor
                const lightGeometry = new THREE.SphereGeometry(0.02, 8, 8);
                const lightMaterial = new THREE.MeshBasicMaterial({ color: 0xFF0000 });
                const light = new THREE.Mesh(lightGeometry, lightMaterial);
                light.position.set(0, 0, 0.1);
                monitor.add(light);
                
                // Blink the light
                setInterval(() => {
                    light.visible = !light.visible;
                }, 1000);
                
                break;
        }
    }
    
    createNameSprite(name) {
        // Create a canvas texture for the name label
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 64;
        
        // Draw text
        context.fillStyle = '#000000';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.font = 'bold 24px Arial';
        context.fillStyle = '#ffffff';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(name, canvas.width / 2, canvas.height / 2);
        
        // Create sprite material
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ 
            map: texture,
            transparent: true
        });
        
        // Create sprite
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(2, 0.5, 1);
        
        return sprite;
    }
    
    loadModel(modelPath) {
        // This would load the actual 3D model in a real implementation
        console.log(`Loading model: ${modelPath} for ${this.id}`);
    }
    
    startAI() {
        this.isAI = true;
        console.log(`AI started for ${this.id}`);
        this.aiInterval = setInterval(() => this.updateAI(), 500);
    }
    
    updateAI() {
        if (!this.isAI || this.health <= 0) return;
        
        // Simple AI behavior
        const random = Math.random();
        
        // Find player character
        let playerCharacter = null;
        this.scene.traverse(obj => {
            if (obj.userData && obj.userData.character && obj.userData.character.isPlayer) {
                playerCharacter = obj.userData.character;
            }
        });
        
        // Debug info
        if (playerCharacter) {
            console.log(`AI ${this.id} found player ${playerCharacter.id} at position ${playerCharacter.position.x.toFixed(2)}, ${playerCharacter.position.y.toFixed(2)}, ${playerCharacter.position.z.toFixed(2)}`);
        } else {
            console.log(`AI ${this.id} could not find player character`);
        }
        
        if (playerCharacter && playerCharacter.health > 0) {
            // Calculate distance to player
            const distToPlayer = this.position.distanceTo(playerCharacter.position);
            console.log(`AI ${this.id} distance to player: ${distToPlayer.toFixed(2)}`);
            
            if (distToPlayer < 2) {
                // Close enough to attack player
                console.log(`AI ${this.id} attacking player!`);
                this.attack();
                return;
            } else if (distToPlayer < 10) {
                // Move towards player
                this.targetPosition = playerCharacter.position.clone();
                this.state = 'walking';
                console.log(`AI ${this.id} moving towards player`);
                return;
            }
        }
        
        // If no player found or player is too far, do random behaviors
        if (random < 0.3) {
            // Move to random position
            const x = (Math.random() - 0.5) * 10;
            const z = (Math.random() - 0.5) * 10;
            this.targetPosition = new THREE.Vector3(x, 0, z);
            this.state = 'walking';
            console.log(`AI ${this.id} moving to random position: ${x}, 0, ${z}`);
        } else if (random < 0.6) {
            // Find closest character to attack
            let closestDist = Infinity;
            let closestChar = null;
            
            // First try to find player character specifically
            for (let i = 0; i < this.scene.children.length; i++) {
                const obj = this.scene.children[i];
                if (obj.userData && obj.userData.character && 
                    obj.userData.character !== this && 
                    obj.userData.character.health > 0 &&
                    obj.userData.character.isPlayer) {
                    
                    const dist = this.position.distanceTo(obj.userData.character.position);
                    closestDist = dist;
                    closestChar = obj.userData.character;
                    break; // Prioritize player character
                }
            }
            
            // If no player found, look for any character
            if (!closestChar) {
                for (let i = 0; i < this.scene.children.length; i++) {
                    const obj = this.scene.children[i];
                    if (obj.userData && obj.userData.character && 
                        obj.userData.character !== this && 
                        obj.userData.character.health > 0) {
                        
                        const dist = this.position.distanceTo(obj.userData.character.position);
                        if (dist < closestDist) {
                            closestDist = dist;
                            closestChar = obj.userData.character;
                        }
                    }
                }
            }
            
            if (closestChar && closestDist < 5) {
                this.attackTarget = closestChar;
                console.log(`AI ${this.id} targeting ${closestChar.id} at distance ${closestDist}`);
                
                if (closestDist < 2) {
                    // Close enough to attack
                    if (this.clout >= 100 && this.specialCooldown <= 0) {
                        this.useSpecialMove();
                        console.log(`AI ${this.id} using special move!`);
                    } else {
                        this.attack();
                        console.log(`AI ${this.id} attacking!`);
                    }
                } else {
                    // Move towards target
                    this.targetPosition = closestChar.position.clone();
                    this.state = 'walking';
                    console.log(`AI ${this.id} moving towards ${closestChar.id}`);
                }
            }
        } else if (random < 0.7) {
            // Jump sometimes
            this.jump();
            console.log(`AI ${this.id} jumping`);
        } else {
            // Idle
            this.state = 'idle';
            this.targetPosition = null;
        }
    }
    
    moveTowards(targetPosition, deltaTime) {
        // Increased base speed
        const speed = this.movementSpeed * (this.isPlayer ? this.sprintMultiplier : 1);
        const direction = new THREE.Vector3()
            .subVectors(targetPosition, this.position)
            .normalize();
            
        // Only move in XZ plane
        direction.y = 0;
        
        // Calculate movement this frame using properly scaled delta time
        const movement = direction.multiplyScalar(speed * deltaTime * 60); // Scale to ~60fps equivalent
        
        // Apply velocity influence (from collisions, etc)
        if (this.velocity.lengthSq() > 0.0001) {
            // Dampen velocity over time
            this.velocity.multiplyScalar(0.9);
            movement.add(this.velocity.clone().multiplyScalar(deltaTime * 60));
            
            // Reset velocity if it gets too small
            if (this.velocity.lengthSq() < 0.0001) {
                this.velocity.set(0, 0, 0);
            }
        }
        
        // Update position
        this.position.add(movement);
        
        // Update mesh position
        if (this.mesh) {
            this.mesh.position.copy(this.position);
            
            // Apply jump height
            this.mesh.position.y += this.jumpHeight;
            
            // Rotate mesh to face direction of movement
            if (movement.lengthSq() > 0.0001) {
                const lookTarget = new THREE.Vector3()
                    .addVectors(this.position, direction);
                this.mesh.lookAt(lookTarget);
                
                // Add walking animation - move legs and arms more dramatically
                if (this.parts && !this.isJumping) {
                    // Use current time for consistent animation across frame rates
                    const time = Date.now() * 0.01;
                    const walkCycle = Math.sin(time * (speed * 2)); // Speed affects cycle
                    
                    // More dramatic leg movement
                    this.parts.leftLeg.position.y = -0.4 + walkCycle * 0.15;
                    this.parts.rightLeg.position.y = -0.4 + Math.sin(time * (speed * 2) + Math.PI) * 0.15;
                    
                    // Arm swing with walking
                    this.parts.leftArm.rotation.z = -Math.PI / 4 + walkCycle * 0.2;
                    this.parts.rightArm.rotation.z = Math.PI / 4 + Math.sin(time * (speed * 2) + Math.PI) * 0.2;
                    
                    // Body bob for more natural movement
                    this.mesh.position.y = this.position.y + Math.abs(Math.sin(time * speed)) * 0.05;
                }
            }
        }
        
        // Update physics body
        if (this.body) {
            this.physics.updateBody(this.body, this.position);
        }
        
        // Check if we've reached the target
        const distanceToTarget = this.position.distanceTo(targetPosition);
        if (distanceToTarget < 0.5) {
            return true; // reached target
        }
        
        // Detect if character is near a rope (simplified example)
        const RING_SIZE = 10;
        const ROPE_PROXIMITY = 0.5;
        
        // Check if character is near ring boundary
        if (Math.abs(this.position.x) > RING_SIZE - ROPE_PROXIMITY || 
            Math.abs(this.position.z) > RING_SIZE - ROPE_PROXIMITY) {
            
            // If velocity is significant, treat it as a rope bounce
            if (this.velocity.lengthSq() > 0.5) {
                this.bounceOffRope();
            }
        }
        
        return false;
    }
    
    jump() {
        if (this.isJumping) return;
        
        this.isJumping = true;
        this.jumpVelocity = this.jumpSpeed;
        
        // Jump visual effect - compress before jumping
        if (this.parts) {
            // Squish character slightly before jumping
            this.mesh.scale.y = 0.8;
            this.mesh.scale.x = 1.2;
            this.mesh.scale.z = 1.2;
            
            // Then expand quickly for jump
            setTimeout(() => {
                this.mesh.scale.set(1, 1, 1);
                
                // Raise arms up for jump
                const originalRotation = {
                    leftArmX: this.parts.leftArm.rotation.x,
                    leftArmZ: this.parts.leftArm.rotation.z,
                    rightArmX: this.parts.rightArm.rotation.x,
                    rightArmZ: this.parts.rightArm.rotation.z
                };
                
                // Raise arms
                this.parts.leftArm.rotation.x = -Math.PI / 2;
                this.parts.rightArm.rotation.x = -Math.PI / 2;
                
                // Return arms to normal on landing
                const checkForLanding = setInterval(() => {
                    if (!this.isJumping) {
                        clearInterval(checkForLanding);
                        this.parts.leftArm.rotation.x = originalRotation.leftArmX;
                        this.parts.leftArm.rotation.z = originalRotation.leftArmZ;
                        this.parts.rightArm.rotation.x = originalRotation.rightArmX;
                        this.parts.rightArm.rotation.z = originalRotation.rightArmZ;
                    }
                }, 100);
            }, 100);
            
            // Create a small dust particle effect at the feet
            this.createJumpDustEffect();
        }
    }
    
    createJumpDustEffect() {
        // Create dust particles for jump
        const particleCount = 10;
        const particles = [];
        
        for (let i = 0; i < particleCount; i++) {
            // Small dust particle
            const size = Math.random() * 0.1 + 0.05;
            const geometry = new THREE.SphereGeometry(size, 4, 4);
            const material = new THREE.MeshBasicMaterial({ 
                color: 0xCCCCCC,
                transparent: true,
                opacity: 0.7
            });
            
            const particle = new THREE.Mesh(geometry, material);
            
            // Place at character's feet with random offset
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * 0.5;
            particle.position.set(
                this.position.x + Math.cos(angle) * distance,
                0.05, // Slightly above ground
                this.position.z + Math.sin(angle) * distance
            );
            
            // Random velocity
            particle.userData.velocity = {
                x: (Math.random() - 0.5) * 0.05,
                y: Math.random() * 0.05 + 0.02,
                z: (Math.random() - 0.5) * 0.05
            };
            
            // Track lifetime
            particle.userData.life = 1.0; // 1 second
            
            this.scene.add(particle);
            particles.push(particle);
        }
        
        // Remove particles after animation
        const animateParticles = () => {
            let allDead = true;
            
            particles.forEach(particle => {
                if (particle.userData.life > 0) {
                    allDead = false;
                    
                    // Update position
                    particle.position.x += particle.userData.velocity.x;
                    particle.position.y += particle.userData.velocity.y;
                    particle.position.z += particle.userData.velocity.z;
                    
                    // Apply gravity
                    particle.userData.velocity.y -= 0.002;
                    
                    // Fade out
                    particle.userData.life -= 0.02;
                    particle.material.opacity = particle.userData.life * 0.7;
                    
                    // Slow down
                    particle.userData.velocity.x *= 0.95;
                    particle.userData.velocity.z *= 0.95;
                    
                    // Scale down
                    particle.scale.multiplyScalar(0.98);
                    
                } else if (particle.parent) {
                    // Remove dead particles
                    this.scene.remove(particle);
                }
            });
            
            if (!allDead) {
                requestAnimationFrame(animateParticles);
            }
        };
        
        animateParticles();
    }
    
    attack() {
        if (this.attackCooldown > 0 || this.health <= 0) return;
        
        // Set attack cooldown (500ms)
        this.attackCooldown = 500;
        
        this.state = 'attacking';
        console.log(`${this.id} is attacking!`);
        
        // Animate the attack - swing arms forward
        if (this.parts) {
            // Use simple manual animation instead of gsap
            const originalRotationX = {
                left: this.parts.leftArm.rotation.x,
                right: this.parts.rightArm.rotation.x
            };
            
            // Store mesh original rotation
            const originalMeshRotationY = this.mesh.rotation.y;
            
            // Quick side-to-side body twist for more dynamic punch
            const punchSide = Math.random() > 0.5 ? 1 : -1; // Randomly choose left or right punch
            
            // Body twist
            this.mesh.rotation.y = originalMeshRotationY + (punchSide * Math.PI / 8);
            
            // Prepare punch
            if (punchSide > 0) {
                // Right punch
                this.parts.rightArm.rotation.x = -Math.PI / 3;
                this.parts.rightArm.rotation.z = 0;
            } else {
                // Left punch
                this.parts.leftArm.rotation.x = -Math.PI / 3;
                this.parts.leftArm.rotation.z = 0;
            }
            
            // Execute punch after short delay
            setTimeout(() => {
                if (punchSide > 0) {
                    // Right arm extended punch
                    this.parts.rightArm.rotation.x = -Math.PI / 2;
                    this.parts.rightArm.rotation.z = -Math.PI / 8;
                    
                    // Create punch effect
                    this.createPunchEffect('right');
                } else {
                    // Left arm extended punch
                    this.parts.leftArm.rotation.x = -Math.PI / 2;
                    this.parts.leftArm.rotation.z = Math.PI / 8;
                    
                    // Create punch effect
                    this.createPunchEffect('left');
                }
                
                // Play punch whoosh sound
                if (this.scene.parent && this.scene.parent.soundManager) {
                    this.scene.parent.soundManager.play('hit');
                }
                
                // Find targets in range via direct scanning instead of physics
                const ATTACK_RANGE = 2.5; // Slightly increased range
                const targets = [];
                
                // Scan for potential targets
                this.scene.traverse(obj => {
                    if (obj.userData && obj.userData.character && 
                        obj.userData.character !== this && 
                        obj.userData.character.health > 0) {
                        
                        const dist = this.position.distanceTo(obj.userData.character.position);
                        if (dist <= ATTACK_RANGE) {
                            targets.push(obj.userData.character);
                        }
                    }
                });
                
                console.log(`${this.id} attack found ${targets.length} potential targets`);
                
                targets.forEach(target => {
                    // Deal damage
                    const damage = 10 * this.config.strength;
                    console.log(`${this.id} dealing ${damage} damage to ${target.id}`);
                    target.takeDamage(damage, this);
                    
                    // Gain clout
                    this.gainClout(10);
                });
                
                // Return to normal position after punch
                setTimeout(() => {
                    // Reset arm positions
                    if (punchSide > 0) {
                        this.parts.rightArm.rotation.x = originalRotationX.right;
                        this.parts.rightArm.rotation.z = -Math.PI / 4;
                    } else {
                        this.parts.leftArm.rotation.x = originalRotationX.left;
                        this.parts.leftArm.rotation.z = Math.PI / 4;
                    }
                    
                    // Reset body rotation
                    this.mesh.rotation.y = originalMeshRotationY;
                    
                    // Return to idle state if not moving
                    if (this.state === 'attacking') {
                        this.state = 'idle';
                    }
                }, 200);
            }, 100);
        } else {
            // No mesh parts available, just handle the attack logic
            console.log(`${this.id} has no mesh parts for attack animation`);
            
            // Find targets in range directly
            const ATTACK_RANGE = 2.5;
            
            // Scan for potential targets
            this.scene.traverse(obj => {
                if (obj.userData && obj.userData.character && 
                    obj.userData.character !== this && 
                    obj.userData.character.health > 0) {
                    
                    const dist = this.position.distanceTo(obj.userData.character.position);
                    if (dist <= ATTACK_RANGE) {
                        const damage = 10 * this.config.strength;
                        console.log(`${this.id} dealing ${damage} damage to ${obj.userData.character.id}`);
                        obj.userData.character.takeDamage(damage, this);
                        this.gainClout(10);
                    }
                }
            });
            
            // Return to idle state after a delay
            setTimeout(() => {
                if (this.state === 'attacking') {
                    this.state = 'idle';
                }
            }, 300);
        }
    }
    
    createPunchEffect(side) {
        // Create visual impact effect for punch
        const geometry = new THREE.SphereGeometry(0.2, 8, 8);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0xFFFFFF,
            transparent: true,
            opacity: 0.7
        });
        
        const effect = new THREE.Mesh(geometry, material);
        
        // Position based on which arm is punching
        const punchOffset = side === 'right' ? 
            new THREE.Vector3(0.7, 0.2, 0.5) : 
            new THREE.Vector3(-0.7, 0.2, 0.5);
            
        // Convert from local to world space
        const worldPos = new THREE.Vector3();
        this.mesh.localToWorld(punchOffset.clone());
        worldPos.copy(this.mesh.position).add(punchOffset);
        
        effect.position.copy(worldPos);
        
        this.scene.add(effect);
        
        // Animate the effect
        let size = 0.1;
        const expandAndFade = () => {
            size += 0.05;
            effect.scale.set(size, size, size);
            effect.material.opacity -= 0.1;
            
            if (effect.material.opacity > 0) {
                requestAnimationFrame(expandAndFade);
            } else {
                this.scene.remove(effect);
            }
        };
        
        expandAndFade();
    }
    
    useSpecialMove() {
        if (this.specialCooldown > 0 || this.health <= 0) return;
        
        // Set special move cooldown
        this.specialCooldown = 5000; // 5 seconds
        
        // Update special move UI indicator
        if (this.isPlayer) {
            const specialMoveElement = document.getElementById('special-move-indicator');
            if (specialMoveElement) {
                specialMoveElement.style.opacity = '0.3';
                setTimeout(() => {
                    specialMoveElement.style.opacity = '1';
                }, this.specialCooldown);
            }
        }
        
        console.log(`${this.id} is using special move: ${this.config.specialMove}!`);
        this.state = 'special';
        
        // Create visual effect for the special move
        this.createSpecialMoveEffect();
        
        // Play special move sound
        if (this.scene.parent && this.scene.parent.soundManager) {
            this.scene.parent.soundManager.play('special_move');
        }
        
        // Different special moves based on character
        switch (this.id) {
            case 'trump':
                // MAGA Slam - area attack that affects all characters within range
                this.executeTrumpSpecial();
                break;
                
            case 'vitalik':
                // Smart Contract Throw - targeted attack with high precision and range
                this.executeVitalikSpecial();
                break;
                
            case 'kanye':
                // 808 Dropkick - spinning attack with medium range
                this.executeKanyeSpecial();
                break;
                
            case 'sbf':
                // Alameda Suplex - high damage to nearest opponent
                this.executeSBFSpecial();
                break;
        }
        
        // Reset clout meter
        this.clout = 0;
    }
    
    executeTrumpSpecial() {
        // MAGA Slam - area attack that affects all characters within range
        
        // Visual: Create shockwave effect
        this.createShockwaveEffect();
        
        // Find all characters within range 
        const RANGE = 5; // Larger area of effect
        const DAMAGE = 30;
        
        this.scene.traverse(obj => {
            if (obj.userData && obj.userData.character && 
                obj.userData.character !== this && 
                obj.userData.character.health > 0) {
                
                const target = obj.userData.character;
                const distance = this.position.distanceTo(target.position);
                
                if (distance <= RANGE) {
                    // Deal damage with falloff based on distance
                    const falloff = 1 - (distance / RANGE);
                    const actualDamage = Math.round(DAMAGE * falloff);
                    
                    target.takeDamage(actualDamage, this);
                    
                    // Knockback effect - push character away
                    const direction = new THREE.Vector3().subVectors(target.position, this.position).normalize();
                    target.velocity.add(direction.multiplyScalar(falloff * 1.5));
                }
            }
        });
        
        // Character animation - jump up and slam down
        if (this.mesh) {
            // Jump up
            const jumpHeight = 2;
            const duration = 1000; // ms
            const startTime = Date.now();
            
            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                if (progress < 0.5) {
                    // Going up
                    const upProgress = progress * 2; // 0 to 1 in first half
                    this.mesh.position.y = this.position.y + (jumpHeight * Math.sin(upProgress * Math.PI / 2));
                } else {
                    // Coming down
                    const downProgress = (progress - 0.5) * 2; // 0 to 1 in second half
                    this.mesh.position.y = this.position.y + (jumpHeight * Math.cos(downProgress * Math.PI / 2));
                }
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    this.mesh.position.y = this.position.y;
                    this.state = 'idle';
                }
            };
            
            animate();
        }
    }
    
    executeVitalikSpecial() {
        // Smart Contract Throw - targeted attack with high precision and range
        
        // Find closest target
        let closestTarget = null;
        let closestDistance = Infinity;
        
        this.scene.traverse(obj => {
            if (obj.userData && obj.userData.character && 
                obj.userData.character !== this && 
                obj.userData.character.health > 0) {
                
                const target = obj.userData.character;
                const distance = this.position.distanceTo(target.position);
                
                if (distance < closestDistance && distance <= 8) { // Long range
                    closestDistance = distance;
                    closestTarget = target;
                }
            }
        });
        
        if (closestTarget) {
            // Visual: Create energy beam effect
            this.createEnergyBeamEffect(closestTarget.position);
            
            // Deal high damage
            closestTarget.takeDamage(40, this);
            
            // Animation: character extends arms forward
            if (this.parts) {
                const originalRotation = {
                    left: this.parts.leftArm.rotation.clone(),
                    right: this.parts.rightArm.rotation.clone()
                };
                
                // Point both arms toward target
                this.parts.leftArm.rotation.set(-Math.PI / 2, 0, 0);
                this.parts.rightArm.rotation.set(-Math.PI / 2, 0, 0);
                
                // Look at target
                const lookDirection = new THREE.Vector3().subVectors(closestTarget.position, this.position);
                if (lookDirection.length() > 0.1) {
                    lookDirection.y = 0; // Keep upright
                    this.mesh.lookAt(this.position.clone().add(lookDirection));
                }
                
                // Return to normal pose after animation
                setTimeout(() => {
                    this.parts.leftArm.rotation.copy(originalRotation.left);
                    this.parts.rightArm.rotation.copy(originalRotation.right);
                    this.state = 'idle';
                }, 1000);
            }
        } else {
            // No target found, just do a visual effect
            this.createEnergyBeamEffect(this.position.clone().add(new THREE.Vector3(0, 0, -5)));
            setTimeout(() => { this.state = 'idle'; }, 1000);
        }
    }
    
    executeKanyeSpecial() {
        // 808 Dropkick - spinning attack that hits all enemies in medium range
        
        // Visual: Create spiral effect
        this.createSpiralEffect();
        
        // Find all targets within range
        const RANGE = 4;
        const DAMAGE = 35;
        
        // Animation: spin rapidly
        if (this.mesh) {
            const totalSpins = 3;
            const duration = 1500; // ms
            const startTime = Date.now();
            const startRotation = this.mesh.rotation.y;
            
            // Track which enemies have been hit
            const hitEnemies = new Set();
            
            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // Spin the character
                this.mesh.rotation.y = startRotation + (progress * Math.PI * 2 * totalSpins);
                
                // Apply damage at certain points during the spin
                if (progress > 0.25 && progress < 0.75) {
                    this.scene.traverse(obj => {
                        if (obj.userData && obj.userData.character && 
                            obj.userData.character !== this && 
                            obj.userData.character.health > 0) {
                            
                            const target = obj.userData.character;
                            const targetId = target.id;
                            
                            if (!hitEnemies.has(targetId)) {
                                const distance = this.position.distanceTo(target.position);
                                
                                if (distance <= RANGE) {
                                    target.takeDamage(DAMAGE, this);
                                    hitEnemies.add(targetId);
                                    
                                    // Apply knockback
                                    const direction = new THREE.Vector3().subVectors(target.position, this.position).normalize();
                                    target.velocity.add(direction.multiplyScalar(1.0));
                                }
                            }
                        }
                    });
                }
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    this.state = 'idle';
                }
            };
            
            animate();
        }
    }
    
    executeSBFSpecial() {
        // Alameda Suplex - grabs the nearest enemy and deals massive damage
        
        // Find closest target
        let closestTarget = null;
        let closestDistance = Infinity;
        
        this.scene.traverse(obj => {
            if (obj.userData && obj.userData.character && 
                obj.userData.character !== this && 
                obj.userData.character.health > 0) {
                
                const target = obj.userData.character;
                const distance = this.position.distanceTo(target.position);
                
                if (distance < closestDistance && distance <= 3) { // Short range
                    closestDistance = distance;
                    closestTarget = target;
                }
            }
        });
        
        if (closestTarget) {
            // Visual: Grab target and suplex animation
            this.createGrabEffect(closestTarget);
            
            // Animation sequence
            const duration = 1500; // ms
            const startTime = Date.now();
            const startPos = {
                self: this.position.clone(),
                target: closestTarget.position.clone()
            };
            
            // Disable target controls temporarily
            const targetWasPlayer = closestTarget.isPlayer;
            if (targetWasPlayer) {
                // Temporarily disable player controls
                closestTarget.isPlayer = false;
            }
            
            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                if (progress < 0.3) {
                    // Phase 1: Move toward each other
                    const p = progress / 0.3;
                    const midPoint = startPos.self.clone().add(startPos.target).multiplyScalar(0.5);
                    
                    // Move both characters to midpoint
                    this.mesh.position.lerp(midPoint, p);
                    closestTarget.mesh.position.lerp(midPoint, p);
                } else if (progress < 0.7) {
                    // Phase 2: Lifting and flipping
                    const p = (progress - 0.3) / 0.4;
                    
                    // SBF lifts target
                    closestTarget.mesh.position.y = this.mesh.position.y + 1.5 * Math.sin(p * Math.PI);
                    
                    // Target is being flipped
                    closestTarget.mesh.rotation.x = p * Math.PI;
                } else {
                    // Phase 3: Slam down
                    const p = (progress - 0.7) / 0.3;
                    
                    // Target slams down
                    closestTarget.mesh.position.y = this.mesh.position.y + 1.5 * (1 - p);
                    
                    // Apply damage at the moment of impact
                    if (p > 0.8 && !closestTarget.damaged) {
                        closestTarget.damaged = true;
                        closestTarget.takeDamage(50, this); // Massive damage
                        
                        // Create impact effect
                        this.createShockwaveEffect(closestTarget.position);
                    }
                }
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    // Reset target
                    closestTarget.mesh.rotation.x = 0;
                    closestTarget.position.copy(closestTarget.mesh.position);
                    
                    // Restore player status if needed
                    if (targetWasPlayer) {
                        closestTarget.isPlayer = true;
                    }
                    
                    this.state = 'idle';
                    closestTarget.damaged = false;
                }
            };
            
            animate();
        } else {
            // No target in range, just do a visual effect
            this.createSpiralEffect();
            setTimeout(() => { this.state = 'idle'; }, 1000);
        }
    }
    
    createEnergyBeamEffect(targetPosition) {
        // Create an energy beam from character to target
        const beamStart = new THREE.Vector3(0, 0.5, 0).applyMatrix4(this.mesh.matrixWorld);
        const beamEnd = targetPosition.clone();
        
        // Calculate beam direction and length
        const beamDirection = new THREE.Vector3().subVectors(beamEnd, beamStart).normalize();
        const beamLength = beamStart.distanceTo(beamEnd);
        
        // Create beam geometry
        const beamGeometry = new THREE.CylinderGeometry(0.1, 0.1, beamLength, 8);
        beamGeometry.translate(0, beamLength / 2, 0); // Move origin to one end
        beamGeometry.rotateX(Math.PI / 2); // Align with Z axis
        
        // Custom shader material with glow effect
        const beamMaterial = new THREE.MeshBasicMaterial({
            color: 0x9370db, // Purple
            transparent: true,
            opacity: 0.8
        });
        
        // Create beam mesh
        const beam = new THREE.Mesh(beamGeometry, beamMaterial);
        beam.position.copy(beamStart);
        
        // Orient beam to point at target
        beam.lookAt(beamEnd);
        
        // Add to scene
        this.scene.add(beam);
        
        // Beam animation - fade out and pulse
        const duration = 1000; // ms
        const startTime = Date.now();
        
        const animateBeam = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Pulse effect
            const pulse = Math.sin(progress * Math.PI * 8) * 0.5 + 0.5;
            beam.scale.set(1 + (pulse * 0.5), 1, 1 + (pulse * 0.5));
            
            // Fade out toward the end
            if (progress > 0.7) {
                const fade = 1 - ((progress - 0.7) / 0.3);
                beamMaterial.opacity = fade * 0.8;
            }
            
            if (progress < 1) {
                requestAnimationFrame(animateBeam);
            } else {
                // Remove beam
                this.scene.remove(beam);
                beam.geometry.dispose();
                beamMaterial.dispose();
            }
        };
        
        // Start animation
        animateBeam();
    }
    
    createGrabEffect(target) {
        // Create visual link between characters to show grab
        const lineGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, 0)
        ]);
        
        const lineMaterial = new THREE.LineBasicMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 0.6,
            linewidth: 2
        });
        
        const line = new THREE.Line(lineGeometry, lineMaterial);
        this.scene.add(line);
        
        // Animation for the line
        const duration = 500; // ms
        const startTime = Date.now();
        
        const animateLine = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Update line positions to connect characters
            const positions = line.geometry.attributes.position.array;
            
            // Start position - character hand
            const handPos = new THREE.Vector3(0.4, 0.2, 0).applyMatrix4(this.mesh.matrixWorld);
            positions[0] = handPos.x;
            positions[1] = handPos.y;
            positions[2] = handPos.z;
            
            // End position - target
            const targetPos = new THREE.Vector3(0, 0, 0).applyMatrix4(target.mesh.matrixWorld);
            positions[3] = targetPos.x;
            positions[4] = targetPos.y;
            positions[5] = targetPos.z;
            
            // Update line geometry
            line.geometry.attributes.position.needsUpdate = true;
            
            // Fade out toward the end
            if (progress > 0.7) {
                const fade = 1 - ((progress - 0.7) / 0.3);
                lineMaterial.opacity = fade * 0.6;
            }
            
            if (progress < 1) {
                requestAnimationFrame(animateLine);
            } else {
                // Remove line
                this.scene.remove(line);
                line.geometry.dispose();
                lineMaterial.dispose();
            }
        };
        
        // Start animation
        animateLine();
    }
    
    createSpecialMoveEffect() {
        // Create glowing aura effect
        const particleCount = 20;
        const particles = [];
        
        for (let i = 0; i < particleCount; i++) {
            // Small glow particle
            const size = Math.random() * 0.2 + 0.1;
            const geometry = new THREE.SphereGeometry(size, 8, 8);
            
            // Color based on character
            let color;
            switch(this.id) {
                case 'trump': color = 0xFF4500; break; // Orange
                case 'vitalik': color = 0x9370DB; break; // Purple
                case 'kanye': color = 0x2F4F4F; break; // Dark slate
                case 'sbf': color = 0x20B2AA; break; // Light sea green
                default: color = 0xFFFFFF; // White
            }
            
            const material = new THREE.MeshBasicMaterial({ 
                color,
                transparent: true,
                opacity: 0.7
            });
            
            const particle = new THREE.Mesh(geometry, material);
            
            // Random position around character
            const radius = 1;
            const angle = Math.random() * Math.PI * 2;
            const height = Math.random() * 2;
            
            particle.position.set(
                this.position.x + Math.cos(angle) * radius,
                this.position.y + height,
                this.position.z + Math.sin(angle) * radius
            );
            
            // Track lifetime and position
            particle.userData = {
                life: 1.0, // 1 second
                angle: angle,
                radius: radius,
                height: height,
                originalY: this.position.y + height
            };
            
            this.scene.add(particle);
            particles.push(particle);
        }
        
        // Animate the particles
        const animateParticles = () => {
            let allDead = true;
            
            particles.forEach((particle, index) => {
                if (particle.userData.life > 0) {
                    allDead = false;
                    
                    // Update position - spiral around character
                    const newAngle = particle.userData.angle + 0.05;
                    particle.userData.angle = newAngle;
                    
                    particle.position.x = this.position.x + Math.cos(newAngle) * particle.userData.radius;
                    particle.position.z = this.position.z + Math.sin(newAngle) * particle.userData.radius;
                    
                    // Bob up and down
                    particle.position.y = this.position.y + Math.sin(newAngle * 2) * 0.2;
                    
                    // Fade out
                    particle.userData.life -= 0.01;
                    particle.material.opacity = particle.userData.life * 0.7;
                    
                } else if (particle.parent) {
                    // Remove dead particles
                    this.scene.remove(particle);
                }
            });
            
            if (!allDead) {
                requestAnimationFrame(animateParticles);
            }
        };
        
        animateParticles();
    }
    
    createShockwaveEffect(position) {
        // Create ring shockwave when landing from MAGA Slam
        const geometry = new THREE.RingGeometry(0.1, 0.5, 32);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0xFF4500, 
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide
        });
        
        const ring = new THREE.Mesh(geometry, material);
        ring.rotation.x = Math.PI / 2; // Lay flat
        ring.position.set(position.x, 0.05, position.z);
        
        this.scene.add(ring);
        
        // Animate expanding ring
        let scale = 1;
        const expandRing = () => {
            scale += 0.2;
            ring.scale.set(scale, scale, 1);
            ring.material.opacity -= 0.02;
            
            if (ring.material.opacity > 0) {
                requestAnimationFrame(expandRing);
            } else {
                this.scene.remove(ring);
            }
        };
        
        expandRing();
    }
    
    createSpiralEffect() {
        // Create spiral effect for Vitalik's special
        const particleCount = 30;
        const particles = [];
        
        for (let i = 0; i < particleCount; i++) {
            const geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
            const material = new THREE.MeshBasicMaterial({ 
                color: 0x9370DB,
                transparent: true,
                opacity: 0.7
            });
            
            const particle = new THREE.Mesh(geometry, material);
            
            // Arrange in a spiral
            const angle = (i / particleCount) * Math.PI * 4;
            const radius = (i / particleCount) * 3;
            
            particle.position.set(
                this.position.x + Math.cos(angle) * radius,
                this.position.y + 1,
                this.position.z + Math.sin(angle) * radius
            );
            
            particle.userData = {
                angle: angle,
                radius: radius,
                life: 1.0
            };
            
            this.scene.add(particle);
            particles.push(particle);
        }
        
        // Animate the spiral
        const animateSpiral = () => {
            let allDead = true;
            
            particles.forEach(particle => {
                if (particle.userData.life > 0) {
                    allDead = false;
                    
                    // Spin and expand
                    particle.userData.angle += 0.1;
                    particle.userData.radius += 0.05;
                    
                    particle.position.x = this.position.x + Math.cos(particle.userData.angle) * particle.userData.radius;
                    particle.position.z = this.position.z + Math.sin(particle.userData.angle) * particle.userData.radius;
                    
                    // Fade out
                    particle.userData.life -= 0.02;
                    particle.material.opacity = particle.userData.life * 0.7;
                    
                } else if (particle.parent) {
                    this.scene.remove(particle);
                }
            });
            
            if (!allDead) {
                requestAnimationFrame(animateSpiral);
            }
        };
        
        animateSpiral();
    }
    
    takeDamage(amount, attacker) {
        if (this.health <= 0) return;
        
        console.log(`${this.id} taking ${amount} damage from ${attacker.id}`);
        
        // Store previous health for Wakanda energy calculation
        const previousHealth = this.health;
        
        this.health -= amount;
        
        // Clamp health to min 0
        if (this.health < 0) this.health = 0;
        
        // Update health display
        this.updateHealthDisplay();
        
        // Charge Wakanda energy if player takes damage - MUCH FASTER now
        if (this.isPlayer && this.health > 0) {
            // Convert damage to Wakanda energy - GREATLY increased scaling factor
            const energyGain = (amount / this.config.health) * 100; // 4x faster than before
            this.wakandaEnergy = Math.min(100, this.wakandaEnergy + energyGain);
            
            // Update Wakanda ring visual if it exists
            this.updateWakandaRingVisual();
        }
        
        // Visual feedback for taking damage
        if (this.mesh) {
            // Flash red
            this.mesh.children.forEach(child => {
                if (child.material && child.material.color) {
                    const originalColor = child.material.color.clone();
                    child.material.color.set(0xff0000);
                    setTimeout(() => {
                        child.material.color.copy(originalColor);
                    }, 200);
                }
            });
            
            // Create hit impact effect
            this.createHitEffect(attacker.position);
            
            // Create damage indicator
            this.createDamageIndicator(new THREE.Vector3(
                this.position.x, 
                this.position.y + 1.5, 
                this.position.z
            ));
            
            // Knock back character in direction away from attacker
            const knockbackDirection = new THREE.Vector3().subVectors(this.position, attacker.position).normalize();
            this.velocity.add(knockbackDirection.multiplyScalar(0.1 * amount / 10)); // Scale by damage
        }
        
        if (this.health <= 0) {
            console.log(`${this.id} has been defeated by ${attacker.id}!`);
            this.state = 'defeated';
            this.defeatedBy = attacker;
            
            // Show battle notification
            if (this.scene.parent) {
                // If the player defeated someone
                if (attacker.isPlayer) {
                    this.scene.parent.showBattleNotification(`You defeated ${this.config.name}!`);
                } 
                // If the player was defeated
                else if (this.isPlayer) {
                    this.scene.parent.showBattleNotification(`${attacker.config.name} defeated you!`);
                } 
                // If AI defeated another AI
                else {
                    this.scene.parent.showBattleNotification(`${attacker.config.name} defeated ${this.config.name}!`);
                }
            }
            
            // Character is defeated - fall down
            if (this.mesh) {
                // Manual animation to fall down
                this.isAnimating = true;
                
                // Play defeated sound
                if (this.scene.parent && this.scene.parent.soundManager) {
                    this.scene.parent.soundManager.play('hit');
                }
                
                const animateFall = () => {
                    // Increment x rotation for falling down
                    this.mesh.rotation.x += 0.1;
                    
                    if (this.mesh.rotation.x < Math.PI / 2) {
                        requestAnimationFrame(animateFall);
                    } else {
                        // Finalize defeat
                        this.mesh.rotation.x = Math.PI / 2;
                        this.isAnimating = false;
                        
                        // Record KO if available in blockchain manager
                        if (this.scene.parent && this.scene.parent.blockchainManager) {
                            this.scene.parent.blockchainManager.recordKO(attacker.id, this.id);
                        }
                    }
                };
                
                // Start fall animation
                animateFall();
            }
        } else {
            // Not defeated, play hit animation
            if (this.mesh) {
                this.isAnimating = true;
                
                const animateHit = () => {
                    // Small recoil animation
                    this.mesh.position.x += this.velocity.x * 0.1;
                    this.mesh.position.z += this.velocity.z * 0.1;
                    
                    // Damp velocity
                    this.velocity.multiplyScalar(0.8);
                    
                    if (this.velocity.lengthSq() > 0.001) {
                        requestAnimationFrame(animateHit);
                    } else {
                        this.isAnimating = false;
                    }
                };
                
                // Start hit animation
                animateHit();
            }
        }
    }
    
    createHitEffect(attackerPosition) {
        // Direction from attacker to this character
        const direction = new THREE.Vector3().subVectors(this.position, attackerPosition).normalize();
        
        // Create impact effect at hit point
        const geometry = new THREE.SphereGeometry(0.15, 8, 8);
        const material = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 0.8
        });
        
        const hitEffect = new THREE.Mesh(geometry, material);
        
        // Position effect between characters, closer to target
        const hitPoint = new THREE.Vector3().copy(this.position).sub(direction.clone().multiplyScalar(0.5));
        hitPoint.y += 0.8; // Position at body height
        hitEffect.position.copy(hitPoint);
        
        this.scene.add(hitEffect);
        this.hitEffects.push(hitEffect);
        
        // Create flying text damage indicator
        this.createDamageIndicator(hitPoint);
        
        // Animate hit effect
        let scale = 1;
        const animateHit = () => {
            scale += 0.1;
            hitEffect.scale.set(scale, scale, scale);
            hitEffect.material.opacity -= 0.1;
            
            if (hitEffect.material.opacity > 0) {
                requestAnimationFrame(animateHit);
            } else {
                this.scene.remove(hitEffect);
                this.hitEffects = this.hitEffects.filter(effect => effect !== hitEffect);
            }
        };
        
        animateHit();
    }
    
    createDamageIndicator(position) {
        // Create a text sprite for damage
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 128;
        canvas.height = 64;
        
        // Draw damage text
        context.fillStyle = '#000000';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.globalAlpha = 0; // Transparent background
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.globalAlpha = 1;
        context.font = 'bold 40px Arial';
        context.fillStyle = '#ff0000';
        context.strokeStyle = '#ffffff';
        context.lineWidth = 3;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.strokeText('-10', canvas.width / 2, canvas.height / 2);
        context.fillText('-10', canvas.width / 2, canvas.height / 2);
        
        // Create sprite material
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true
        });
        
        // Create sprite
        const sprite = new THREE.Sprite(material);
        sprite.position.copy(position);
        sprite.position.y += 0.5; // Start above hit point
        sprite.scale.set(1, 0.5, 1);
        
        this.scene.add(sprite);
        
        // Animate rising and fading
        let lifespan = 1.0;
        const animateText = () => {
            sprite.position.y += 0.02;
            lifespan -= 0.03;
            sprite.material.opacity = lifespan;
            
            if (lifespan > 0) {
                requestAnimationFrame(animateText);
            } else {
                this.scene.remove(sprite);
            }
        };
        
        animateText();
    }
    
    gainClout(amount) {
        this.clout += amount;
        if (this.clout > 100) this.clout = 100;
    }
    
    update(deltaTime = 0.016) {
        // Skip update if defeated
        if (this.state === 'defeated') return;
        
        // Update cooldowns
        if (this.attackCooldown > 0) {
            this.attackCooldown -= deltaTime * 1000;
        }
        
        if (this.specialCooldown > 0) {
            this.specialCooldown -= deltaTime * 1000;
        }
        
        // Add passive Wakanda energy gain for player - get energy just by staying alive
        if (this.isPlayer && this.wakandaEnergy < 100) {
            this.wakandaEnergy = Math.min(100, this.wakandaEnergy + (20 * deltaTime)); // Gain 20% per second
            this.updateWakandaRingVisual();
        }
        
        // Make health bar face the camera
        if (this.healthBarContainer && this.scene.parent && this.scene.parent.camera) {
            this.healthBarContainer.lookAt(this.scene.parent.camera.position);
        }
        
        // Update attack radius indicator
        this.updateAttackRadiusColor();
        
        // Handle jumping physics
        if (this.isJumping) {
            // Apply gravity to jump velocity
            this.jumpVelocity -= this.gravity * deltaTime * 60;
            
            // Update jump height
            this.jumpHeight += this.jumpVelocity * deltaTime * 60;
            
            // If we hit the ground, stop jumping
            if (this.jumpHeight <= 0) {
                this.jumpHeight = 0;
                this.jumpVelocity = 0;
                this.isJumping = false;
                
                // Create landing effect
                if (this.velocity.y < -0.1) {
                    this.createJumpDustEffect();
                }
            }
            
            // Update mesh position with jump height
            if (this.mesh) {
                this.mesh.position.y = this.position.y + this.jumpHeight;
            }
        }
        
        // Check for Wakanda energy release with shift key - lowered threshold to 50%
        if (this.isPlayer && this.wakandaEnergy >= 50) {
            if (this.scene.parent && this.scene.parent.gameControls) {
                const controls = this.scene.parent.gameControls;
                if (controls.keys && controls.keys.shift) {
                    this.releaseWakandaEnergy();
                }
            }
        }
        
        // Handle state machine
        switch (this.state) {
            case 'idle':
                // Small idle animation - subtle bob up and down
                if (this.parts && !this.isJumping) {
                    const time = Date.now() * 0.001;
                    this.mesh.position.y = this.position.y + Math.sin(time) * 0.03;
                    
                    // Subtle breathing animation
                    const breatheScale = 1 + Math.sin(time * 2) * 0.01;
                    this.parts.torso.scale.x = breatheScale;
                    this.parts.torso.scale.z = breatheScale;
                }
                break;
                
            case 'walking':
                if (this.targetPosition) {
                    const reached = this.moveTowards(this.targetPosition, deltaTime);
                    if (reached) {
                        this.state = 'idle';
                        this.targetPosition = null;
                    }
                }
                break;
                
            case 'attacking':
                // Animation happens in the attack method
                // Just wait for animation to complete
                break;
                
            case 'special':
                // Animation happens in the useSpecialMove method
                // Just wait for animation to complete
                break;
                
            case 'hit':
                // Animation happens in the takeDamage method
                // Just wait for animation to complete
                break;
        }
    }
    
    reset() {
        // Reset character state
        this.health = this.config.health;
        this.clout = 0;
        this.state = 'idle';
        this.targetPosition = null;
        this.attackTarget = null;
        this.isJumping = false;
        this.jumpHeight = 0;
        this.jumpVelocity = 0;
        
        // Reset position
        if (this.id === 'trump') {
            this.position.set(-5, 0, -5);
        } else if (this.id === 'vitalik') {
            this.position.set(5, 0, -5);
        } else if (this.id === 'kanye') {
            this.position.set(-5, 0, 5);
        } else if (this.id === 'sbf') {
            this.position.set(5, 0, 5);
        }
        
        if (this.mesh) {
            this.mesh.position.copy(this.position);
            this.mesh.rotation.set(0, 0, 0);
            
            // Reset parts rotations
            if (this.parts) {
                this.parts.leftArm.rotation.set(0, 0, -Math.PI / 4);
                this.parts.rightArm.rotation.set(0, 0, Math.PI / 4);
                this.parts.leftLeg.position.y = -0.4;
                this.parts.rightLeg.position.y = -0.4;
            }
        }
        
        // Update physics body
        if (this.body) {
            this.physics.updateBody(this.body, this.position);
        }
        
        // Clear AI if active
        if (this.isAI) {
            clearInterval(this.aiInterval);
            this.isAI = false;
        }
    }
    
    updateHealthDisplay() {
        // Update floating 3D health bar
        if (this.healthBarMesh) {
            const healthPercent = this.health / this.config.health;
            this.healthBarMesh.scale.x = Math.max(0.01, healthPercent); // Ensure scale is never 0
            
            // Change color based on health remaining
            if (healthPercent > 0.6) {
                this.healthBarMesh.material.color.setHex(0x00ff00); // Green
            } else if (healthPercent > 0.3) {
                this.healthBarMesh.material.color.setHex(0xffff00); // Yellow
            } else {
                this.healthBarMesh.material.color.setHex(0xff0000); // Red
            }
        }
        
        // Update health bar in HUD for player
        if (this.isPlayer) {
            const healthContainer = document.querySelector('.health-container');
            if (healthContainer) {
                const healthBar = healthContainer.querySelector('.health-bar');
                if (healthBar) {
                    const healthPercent = (this.health / this.config.health) * 100;
                    healthBar.style.width = `${healthPercent}%`;
                    console.log(`Setting ${this.id} health display to ${healthPercent}%`);
                }
            }
        }
    }
    
    createHealthBar() {
        // Create container for health bar
        this.healthBarContainer = new THREE.Group();
        this.healthBarContainer.position.y = 1.8; // Position above character
        
        // Background bar (black)
        const backgroundBar = new THREE.Mesh(
            new THREE.PlaneGeometry(1, 0.15),
            new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.7 })
        );
        
        // Health bar (green)
        this.healthBarMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(1, 0.15),
            new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.9 })
        );
        this.healthBarMesh.position.z = 0.01; // Slightly in front of background
        
        // Set the pivot point to the left side of the bar for easier scaling
        this.healthBarMesh.geometry.translate(0.5, 0, 0);
        this.healthBarMesh.position.x = -0.5;
        
        // Add bars to container
        this.healthBarContainer.add(backgroundBar);
        this.healthBarContainer.add(this.healthBarMesh);
        
        // Make health bar always face the camera
        this.healthBarContainer.renderOrder = 999; // Ensure it renders on top
        
        // Add to character mesh
        this.mesh.add(this.healthBarContainer);
    }
    
    createAttackRadiusIndicator() {
        // Create a circle to represent the attack radius
        const ATTACK_RANGE = 2.5;
        const segments = 64;
        
        // Create circle geometry on the ground
        const circleGeometry = new THREE.CircleGeometry(ATTACK_RANGE, segments);
        circleGeometry.rotateX(-Math.PI / 2); // Rotate to be flat on the ground
        
        // Use a material that's slightly transparent and colored
        const circleMaterial = new THREE.MeshBasicMaterial({
            color: this.isPlayer ? 0x3498db : 0x95a5a6, // Blue for player, gray for AI
            transparent: true,
            opacity: 0.2,
            side: THREE.DoubleSide
        });
        
        this.attackRadiusIndicator = new THREE.Mesh(circleGeometry, circleMaterial);
        this.attackRadiusIndicator.position.y = 0.05; // Slightly above ground to avoid z-fighting
        
        // Create a ring at the edge of the circle for better visibility
        const ringGeometry = new THREE.RingGeometry(ATTACK_RANGE - 0.05, ATTACK_RANGE, segments);
        ringGeometry.rotateX(-Math.PI / 2);
        
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: this.isPlayer ? 0x3498db : 0x95a5a6,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide
        });
        
        this.attackRadiusRing = new THREE.Mesh(ringGeometry, ringMaterial);
        this.attackRadiusRing.position.y = 0.06; // Slightly above the circle
        
        // Add to mesh
        this.mesh.add(this.attackRadiusIndicator);
        this.mesh.add(this.attackRadiusRing);
        
        // Only show radius for player by default
        this.attackRadiusIndicator.visible = this.isPlayer;
        this.attackRadiusRing.visible = this.isPlayer;
        
        // Track if enemies are in range
        this.enemiesInRange = false;
        
        // Create Wakanda energy circle indicator (only for player)
        if (this.isPlayer) {
            // Create another ring to indicate Wakanda energy level
            const wakandaGeometry = new THREE.RingGeometry(ATTACK_RANGE + 0.1, ATTACK_RANGE + 0.15, segments);
            wakandaGeometry.rotateX(-Math.PI / 2);
            
            const wakandaMaterial = new THREE.MeshBasicMaterial({
                color: 0xf1c40f, // Yellow
                transparent: true,
                opacity: 0.7,
                side: THREE.DoubleSide
            });
            
            this.wakandaRing = new THREE.Mesh(wakandaGeometry, wakandaMaterial);
            this.wakandaRing.position.y = 0.07; // Slightly above other rings
            this.wakandaRing.scale.set(0.01, 0.01, 1); // Start very small
            
            this.mesh.add(this.wakandaRing);
        }
    }
    
    updateAttackRadiusColor() {
        // Check if any enemies are in attack range
        let enemiesInRange = false;
        const ATTACK_RANGE = 2.5;
        
        // Scan for potential targets
        this.scene.traverse(obj => {
            if (obj.userData && obj.userData.character && 
                obj.userData.character !== this && 
                obj.userData.character.health > 0) {
                
                const dist = this.position.distanceTo(obj.userData.character.position);
                if (dist <= ATTACK_RANGE) {
                    enemiesInRange = true;
                }
            }
        });
        
        // Update color if state changed
        if (enemiesInRange !== this.enemiesInRange) {
            this.enemiesInRange = enemiesInRange;
            
            const newCircleColor = enemiesInRange ? 0xff0000 : (this.isPlayer ? 0x3498db : 0x95a5a6);
            const newRingColor = enemiesInRange ? 0xff3333 : (this.isPlayer ? 0x3498db : 0x95a5a6);
            
            this.attackRadiusIndicator.material.color.setHex(newCircleColor);
            this.attackRadiusRing.material.color.setHex(newRingColor);
            
            // Make it more visible when enemies are in range
            this.attackRadiusIndicator.material.opacity = enemiesInRange ? 0.3 : 0.2;
            this.attackRadiusRing.material.opacity = enemiesInRange ? 0.7 : 0.5;
        }
    }
    
    pulseWakandaRing() {
        if (!this.wakandaRing || this.wakandaEnergy < 100) {
            this.wakandaPulsing = false;
            return;
        }
        
        const startTime = Date.now();
        const duration = 1500; // 1.5 seconds per pulse
        
        const animate = () => {
            if (!this.wakandaRing || this.wakandaEnergy < 100) {
                this.wakandaPulsing = false;
                return;
            }
            
            const elapsed = Date.now() - startTime;
            const progress = (elapsed % duration) / duration;
            
            // Pulse size
            const baseScale = 1.0;
            const pulseScale = Math.sin(progress * Math.PI) * 0.2 + baseScale;
            this.wakandaRing.scale.set(pulseScale, pulseScale, 1);
            
            // Pulse opacity
            const baseOpacity = 0.7;
            const pulseOpacity = Math.sin(progress * Math.PI) * 0.3 + baseOpacity;
            this.wakandaRing.material.opacity = pulseOpacity;
            
            requestAnimationFrame(animate);
        };
        
        animate();
    }
    
    releaseWakandaEnergy() {
        // Lower the threshold to 50% instead of 100%
        if (this.wakandaEnergy < 50 || !this.isPlayer) return;
        
        console.log(`${this.id} releasing Wakanda energy blast!`);
        
        // Create visual effect
        this.createWakandaBlast();
        
        // Deal damage to all enemies on the field
        this.scene.traverse(obj => {
            if (obj.userData && obj.userData.character && 
                obj.userData.character !== this && 
                obj.userData.character.health > 0) {
                
                const target = obj.userData.character;
                const distance = this.position.distanceTo(target.position);
                
                // Damage scales with proximity - more damage closer to the player
                const maxRange = 15; // Can hit anywhere in the arena
                // Scale damage based on how much energy we have (50-100%)
                const energyMultiplier = this.wakandaEnergy / 100;
                const baseDamage = 100 * energyMultiplier; // Higher base damage
                
                if (distance <= maxRange) {
                    // Calculate damage with distance falloff
                    const damageMultiplier = 1 - (distance / maxRange) * 0.5; // Reduced falloff - more damage at range
                    const damage = Math.round(baseDamage * damageMultiplier);
                    
                    // Apply damage with a small delay based on distance for shockwave effect
                    setTimeout(() => {
                        target.takeDamage(damage, this);
                        
                        // Apply strong knockback
                        const direction = new THREE.Vector3().subVectors(target.position, this.position).normalize();
                        target.velocity.add(direction.multiplyScalar(damageMultiplier * 2.5));
                    }, distance * 100); // Further enemies are hit later
                }
            }
        });
        
        // Reset Wakanda energy
        this.wakandaEnergy = 0;
        if (this.wakandaRing) {
            this.wakandaRing.scale.set(0.01, 0.01, 1);
            this.wakandaRing.material.color.set(0xf1c40f); // Reset to yellow
        }
        this.wakandaPulsing = false;
        
        // Show notification
        if (this.scene.parent) {
            this.scene.parent.showBattleNotification("WAKANDA FOREVER! Energy blast released!");
        }
    }
    
    createWakandaBlast() {
        // Create shockwave ring
        const segments = 64;
        const geometry = new THREE.RingGeometry(0.1, 0.5, segments);
        const material = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide
        });
        
        const ring = new THREE.Mesh(geometry, material);
        ring.rotation.x = Math.PI / 2; // Lay flat
        ring.position.copy(this.position);
        ring.position.y = 0.05; // Just above ground
        
        this.scene.add(ring);
        
        // Start with white flash around player
        this.createWhiteFlash();
        
        // Expanding shockwave animation
        const duration = 2000; // 2 seconds
        const maxSize = 15; // Max radius
        const startTime = Date.now();
        
        const expandRing = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Expand ring
            const size = progress * maxSize;
            ring.scale.set(size, size, 1);
            
            // Fade out toward the end
            if (progress > 0.5) {
                const fade = 1 - ((progress - 0.5) / 0.5);
                material.opacity = fade * 0.9;
            }
            
            if (progress < 1) {
                requestAnimationFrame(expandRing);
            } else {
                // Remove ring
                this.scene.remove(ring);
                ring.geometry.dispose();
                material.dispose();
            }
        };
        
        expandRing();
    }
    
    createWhiteFlash() {
        // Create white sphere around player
        const geometry = new THREE.SphereGeometry(1, 32, 32);
        const material = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 1
        });
        
        const sphere = new THREE.Mesh(geometry, material);
        sphere.position.copy(this.position);
        sphere.position.y += 0.5; // Center on player
        
        this.scene.add(sphere);
        
        // Flash animation
        const duration = 500; // 0.5 seconds
        const startTime = Date.now();
        
        const animateFlash = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Expand and fade
            const size = 1 + progress * 2;
            sphere.scale.set(size, size, size);
            
            material.opacity = 1 - progress;
            
            if (progress < 1) {
                requestAnimationFrame(animateFlash);
            } else {
                // Remove sphere
                this.scene.remove(sphere);
                geometry.dispose();
                material.dispose();
            }
        };
        
        animateFlash();
    }
    
    updateWakandaRingVisual() {
        if (!this.wakandaRing) return;

        // Scale up the ring based on energy percentage (0.01 to 1.0)
        const scale = 0.01 + (this.wakandaEnergy / 100) * 0.99;
        this.wakandaRing.scale.set(scale, scale, 1);
        
        // Change color from yellow to white as energy builds
        const energyProgress = this.wakandaEnergy / 100;
        const color = new THREE.Color(
            1,                          // R
            1,                          // G
            energyProgress * 0.8 + 0.2  // B (0.2 to 1.0)
        );
        this.wakandaRing.material.color = color;
        
        // Make it pulse when full
        if (this.wakandaEnergy >= 100 && !this.wakandaPulsing) {
            this.wakandaPulsing = true;
            this.pulseWakandaRing();
        }
    }
    
    // Add blockchain logging for rope bounce
    bounceOffRope() {
        if (this.isPlayer && this.scene && this.scene.parent) {
            const game = this.scene.parent;
            if (typeof game.logRopeBounceAction === 'function') {
                game.logRopeBounceAction();
            }
        }
    }
}

export default Character; 