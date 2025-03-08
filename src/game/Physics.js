import * as THREE from 'three';

export class Physics {
    constructor() {
        this.bodies = [];
        this.active = false;
    }
    
    start() {
        this.active = true;
    }
    
    stop() {
        this.active = false;
    }
    
    createBody(mesh, options) {
        // Create a physics body
        const body = {
            mesh,
            position: mesh.position.clone(),
            type: options.type || 'static',
            radius: options.radius || 0.5,
            height: options.height || 1,
            ...options
        };
        
        // Store reference to character if it's a character body
        if (options.character) {
            body.character = options.character;
        }
        
        // Store reference to the physics body in the mesh userData
        mesh.userData.physicsBody = body;
        
        // If it's a character body, also store reference to character
        if (options.character) {
            mesh.userData.character = options.character;
        }
        
        // Add body to list
        this.bodies.push(body);
        
        return body;
    }
    
    updateBody(body, position) {
        body.position.copy(position);
        body.mesh.position.copy(position);
    }
    
    update(deltaTime = 0.016) {
        if (!this.active) return;
        
        // Update all bodies
        for (let i = 0; i < this.bodies.length; i++) {
            const bodyA = this.bodies[i];
            
            // Skip static bodies
            if (bodyA.type === 'static') continue;
            
            // Check collisions with other bodies
            for (let j = i + 1; j < this.bodies.length; j++) {
                const bodyB = this.bodies[j];
                
                // Skip if both bodies are static
                if (bodyB.type === 'static') continue;
                
                // Check collision
                if (this.checkCollision(bodyA, bodyB)) {
                    // Handle collision
                    this.resolveCollision(bodyA, bodyB, deltaTime);
                }
            }
            
            // Check ring boundaries (20x20 ring)
            this.checkRingBoundaries(bodyA);
        }
    }
    
    checkCollision(bodyA, bodyB) {
        // Simple distance-based collision check
        const distance = bodyA.position.distanceTo(bodyB.position);
        const minDistance = bodyA.radius + bodyB.radius;
        
        return distance < minDistance;
    }
    
    resolveCollision(bodyA, bodyB, deltaTime) {
        // Simple collision resolution - push bodies apart
        const direction = new THREE.Vector3()
            .subVectors(bodyA.position, bodyB.position)
            .normalize();
        
        // Calculate overlap
        const distance = bodyA.position.distanceTo(bodyB.position);
        const overlap = (bodyA.radius + bodyB.radius) - distance;
        
        // Push apart based on mass (we'll assume equal mass for now)
        const pushFactor = overlap / 2;
        
        // Scale by deltaTime for consistent behavior at different frame rates
        const timeScaledPush = pushFactor * (deltaTime * 60); // Normalize to 60fps
        
        // Only resolve if both bodies are movable
        if (bodyA.type !== 'static') {
            bodyA.position.add(direction.clone().multiplyScalar(timeScaledPush));
            bodyA.mesh.position.copy(bodyA.position);
            
            // Apply a slight bounce effect for more dynamic interactions
            if (bodyA.character) {
                bodyA.character.velocity = direction.clone().multiplyScalar(2);
                bodyA.character.position.copy(bodyA.position);
            }
        }
        
        if (bodyB.type !== 'static') {
            bodyB.position.sub(direction.clone().multiplyScalar(timeScaledPush));
            bodyB.mesh.position.copy(bodyB.position);
            
            // Apply a slight bounce effect for the second character
            if (bodyB.character) {
                bodyB.character.velocity = direction.clone().multiplyScalar(-2);
                bodyB.character.position.copy(bodyB.position);
            }
        }
    }
    
    checkRingBoundaries(body) {
        // Ring is 20x20 (from -10 to 10 in both X and Z)
        const ringSize = 10;
        let changed = false;
        
        // Check X boundaries
        if (body.position.x < -ringSize + body.radius) {
            body.position.x = -ringSize + body.radius;
            
            // Add a bounce effect
            if (body.character && body.character.velocity) {
                body.character.velocity.x *= -0.5; // Bounce back with reduced velocity
            }
            
            changed = true;
        } else if (body.position.x > ringSize - body.radius) {
            body.position.x = ringSize - body.radius;
            
            // Add a bounce effect
            if (body.character && body.character.velocity) {
                body.character.velocity.x *= -0.5; // Bounce back with reduced velocity
            }
            
            changed = true;
        }
        
        // Check Z boundaries
        if (body.position.z < -ringSize + body.radius) {
            body.position.z = -ringSize + body.radius;
            
            // Add a bounce effect
            if (body.character && body.character.velocity) {
                body.character.velocity.z *= -0.5; // Bounce back with reduced velocity
            }
            
            changed = true;
        } else if (body.position.z > ringSize - body.radius) {
            body.position.z = ringSize - body.radius;
            
            // Add a bounce effect
            if (body.character && body.character.velocity) {
                body.character.velocity.z *= -0.5; // Bounce back with reduced velocity
            }
            
            changed = true;
        }
        
        // Update mesh position if changed
        if (changed) {
            body.mesh.position.copy(body.position);
            
            // Update character position if this is a character body
            if (body.character) {
                body.character.position.copy(body.position);
            }
        }
    }
    
    findNearbyBodies(position, radius) {
        // Find all bodies within the given radius of the position
        return this.bodies.filter(body => {
            const distance = position.distanceTo(body.position);
            return distance <= radius;
        });
    }
} 