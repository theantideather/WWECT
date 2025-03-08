import * as THREE from 'three';

export class RingEnvironment {
    constructor(scene) {
        this.scene = scene;
    }
    
    create() {
        // Create the ring
        this.createRing();
        
        // Create crowd
        this.createCrowd();
        
        // Create championship belt
        this.createChampionshipBelt();
        
        // Create fog
        this.createFog();
        
        // Create ring lighting
        this.createRingLighting();
        
        // Create crypto price tickers
        this.createCryptoPrices();
    }
    
    createRing() {
        // Ring floor (canvas)
        const ringSize = 20;
        const floorGeometry = new THREE.PlaneGeometry(ringSize, ringSize);
        const floorTexture = this.createRingFloorTexture();
        const floorMaterial = new THREE.MeshStandardMaterial({ 
            map: floorTexture,
            roughness: 0.8,
            metalness: 0.2
        });
        
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);
        
        // Ring ropes
        this.createRingRopes(ringSize);
        
        // Ring posts
        this.createRingPosts(ringSize);
        
        // Ring apron
        this.createRingApron(ringSize);
        
        // Ring environment (outside the ring)
        this.createRingEnvironment(ringSize);
    }
    
    createRingFloorTexture() {
        // Create a canvas texture for the ring floor
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 1024;
        canvas.height = 1024;
        
        // Fill with base color
        context.fillStyle = '#cccccc';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw ring outlines
        context.strokeStyle = '#333333';
        context.lineWidth = 10;
        context.strokeRect(50, 50, canvas.width - 100, canvas.height - 100);
        
        // Draw crypto Twitter logo in center
        context.fillStyle = '#1DA1F2'; // Twitter blue
        context.beginPath();
        context.arc(canvas.width / 2, canvas.height / 2, 150, 0, Math.PI * 2);
        context.fill();
        
        context.fillStyle = '#ffffff';
        context.font = 'bold 100px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText('₿', canvas.width / 2, canvas.height / 2);
        
        // Add some texture/noise
        for (let i = 0; i < 5000; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const size = Math.random() * 2 + 1;
            const opacity = Math.random() * 0.1;
            
            context.fillStyle = `rgba(0, 0, 0, ${opacity})`;
            context.fillRect(x, y, size, size);
        }
        
        // Create texture from canvas
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        
        return texture;
    }
    
    createRingRopes(ringSize) {
        // Ring ropes colors (top to bottom)
        const ropeColors = [0xff0000, 0xffffff, 0x0000ff];
        const ropeHeights = [2.0, 1.3, 0.6]; // In meters (WWE spec: top rope at ~4-5ft)
        const ropeRadius = 0.05;
        
        for (let i = 0; i < 3; i++) {
            const color = ropeColors[i];
            const height = ropeHeights[i];
            
            // Create rope geometry (a torus for each side)
            const ropeGeometry = new THREE.TorusGeometry(ropeRadius, ropeRadius, 16, 100);
            const ropeMaterial = new THREE.MeshStandardMaterial({ 
                color,
                roughness: 0.5,
                metalness: 0.2
            });
            
            // Create four sides of ropes
            const halfSize = ringSize / 2;
            
            // North rope
            const northRope = new THREE.Mesh(new THREE.CylinderGeometry(ropeRadius, ropeRadius, ringSize, 32), ropeMaterial);
            northRope.rotation.z = Math.PI / 2;
            northRope.position.set(0, height, -halfSize);
            this.scene.add(northRope);
            
            // South rope
            const southRope = new THREE.Mesh(new THREE.CylinderGeometry(ropeRadius, ropeRadius, ringSize, 32), ropeMaterial);
            southRope.rotation.z = Math.PI / 2;
            southRope.position.set(0, height, halfSize);
            this.scene.add(southRope);
            
            // East rope
            const eastRope = new THREE.Mesh(new THREE.CylinderGeometry(ropeRadius, ropeRadius, ringSize, 32), ropeMaterial);
            eastRope.rotation.x = Math.PI / 2;
            eastRope.position.set(halfSize, height, 0);
            this.scene.add(eastRope);
            
            // West rope
            const westRope = new THREE.Mesh(new THREE.CylinderGeometry(ropeRadius, ropeRadius, ringSize, 32), ropeMaterial);
            westRope.rotation.x = Math.PI / 2;
            westRope.position.set(-halfSize, height, 0);
            this.scene.add(westRope);
        }
    }
    
    createRingPosts(ringSize) {
        const halfSize = ringSize / 2;
        const postHeight = 2.5;
        const postRadius = 0.2;
        const postColor = 0xc0c0c0; // Silver
        const postGeometry = new THREE.CylinderGeometry(postRadius, postRadius, postHeight, 16);
        const postMaterial = new THREE.MeshStandardMaterial({ 
            color: postColor,
            roughness: 0.3,
            metalness: 0.8
        });
        
        // Create four corner posts
        const postPositions = [
            [-halfSize, 0, -halfSize], // NW
            [halfSize, 0, -halfSize],  // NE
            [halfSize, 0, halfSize],   // SE
            [-halfSize, 0, halfSize]   // SW
        ];
        
        postPositions.forEach(pos => {
            const post = new THREE.Mesh(postGeometry, postMaterial);
            post.position.set(pos[0], postHeight / 2, pos[2]);
            post.castShadow = true;
            post.receiveShadow = true;
            this.scene.add(post);
            
            // Add post padding (cylinder with different color)
            const padGeometry = new THREE.CylinderGeometry(postRadius + 0.05, postRadius + 0.05, postHeight / 3, 16);
            const padColors = [0xff0000, 0x0000ff, 0x00ff00, 0xffff00];
            const padMaterial = new THREE.MeshStandardMaterial({ 
                color: padColors[postPositions.indexOf(pos)],
                roughness: 0.9,
                metalness: 0.1
            });
            
            const padding = new THREE.Mesh(padGeometry, padMaterial);
            padding.position.set(0, postHeight / 3, 0);
            post.add(padding);
        });
    }
    
    createRingApron(ringSize) {
        const halfSize = ringSize / 2;
        const apronHeight = 0.5;
        const apronOutset = 1;
        
        // Create apron sides
        const apronGeometry = new THREE.BoxGeometry(ringSize + apronOutset * 2, apronHeight, apronOutset);
        const apronMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x333333,
            roughness: 0.9,
            metalness: 0.1
        });
        
        // North apron
        const northApron = new THREE.Mesh(apronGeometry, apronMaterial);
        northApron.position.set(0, -apronHeight / 2, -halfSize - apronOutset / 2);
        northApron.castShadow = true;
        northApron.receiveShadow = true;
        this.scene.add(northApron);
        
        // Add "Crypto Twitter Champion" text to north apron
        const textGeometry = new THREE.BoxGeometry(ringSize * 0.8, apronHeight / 2, 0.1);
        const textMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xffd700, // Gold
            roughness: 0.3,
            metalness: 0.8
        });
        const text = new THREE.Mesh(textGeometry, textMaterial);
        text.position.set(0, 0, -apronOutset / 2 + 0.05);
        northApron.add(text);
        
        // South apron
        const southApron = new THREE.Mesh(apronGeometry, apronMaterial);
        southApron.position.set(0, -apronHeight / 2, halfSize + apronOutset / 2);
        southApron.castShadow = true;
        southApron.receiveShadow = true;
        this.scene.add(southApron);
        
        // East apron
        const eastApronGeometry = new THREE.BoxGeometry(apronOutset, apronHeight, ringSize);
        const eastApron = new THREE.Mesh(eastApronGeometry, apronMaterial);
        eastApron.position.set(halfSize + apronOutset / 2, -apronHeight / 2, 0);
        eastApron.castShadow = true;
        eastApron.receiveShadow = true;
        this.scene.add(eastApron);
        
        // West apron
        const westApron = new THREE.Mesh(eastApronGeometry, apronMaterial);
        westApron.position.set(-halfSize - apronOutset / 2, -apronHeight / 2, 0);
        westApron.castShadow = true;
        westApron.receiveShadow = true;
        this.scene.add(westApron);
    }
    
    createRingEnvironment(ringSize) {
        // Add a floor outside the ring
        const floorSize = ringSize * 3;
        const floorGeometry = new THREE.PlaneGeometry(floorSize, floorSize);
        const floorMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x222222,
            roughness: 0.9,
            metalness: 0.1
        });
        
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -0.01; // Slightly below ring to prevent z-fighting
        floor.receiveShadow = true;
        this.scene.add(floor);
        
        // Add a neon grid floor
        const gridGeometry = new THREE.PlaneGeometry(floorSize, floorSize, 20, 20);
        const gridMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x00ffff,
            wireframe: true,
            transparent: true,
            opacity: 0.2
        });
        
        const grid = new THREE.Mesh(gridGeometry, gridMaterial);
        grid.rotation.x = -Math.PI / 2;
        grid.position.y = 0.02; // Slightly above floor
        this.scene.add(grid);
        
        // Add some tables with Bitcoin logos
        this.createDestructibleTables(ringSize);
    }
    
    createDestructibleTables(ringSize) {
        const tablePositions = [
            [-ringSize, 0, 0],
            [ringSize, 0, 0],
            [0, 0, -ringSize],
            [0, 0, ringSize]
        ];
        
        tablePositions.forEach(pos => {
            // Table
            const tableGeometry = new THREE.BoxGeometry(2, 0.1, 1);
            const tableMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x8B4513, // Brown
                roughness: 0.8,
                metalness: 0.2
            });
            
            const table = new THREE.Mesh(tableGeometry, tableMaterial);
            table.position.set(pos[0], 0.5, pos[2]);
            table.castShadow = true;
            table.receiveShadow = true;
            this.scene.add(table);
            
            // Table legs
            const legGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.5, 8);
            const legMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x8B4513,
                roughness: 0.8,
                metalness: 0.2
            });
            
            const legPositions = [
                [-0.9, -0.25, -0.4],
                [0.9, -0.25, -0.4],
                [-0.9, -0.25, 0.4],
                [0.9, -0.25, 0.4]
            ];
            
            legPositions.forEach(legPos => {
                const leg = new THREE.Mesh(legGeometry, legMaterial);
                leg.position.set(legPos[0], legPos[1], legPos[2]);
                table.add(leg);
            });
            
            // Bitcoin logo on table
            const logoGeometry = new THREE.CircleGeometry(0.3, 32);
            const logoMaterial = new THREE.MeshBasicMaterial({ 
                color: 0xF7931A, // Bitcoin orange
                side: THREE.DoubleSide
            });
            
            const logo = new THREE.Mesh(logoGeometry, logoMaterial);
            logo.rotation.x = -Math.PI / 2;
            logo.position.set(0, 0.051, 0);
            table.add(logo);
            
            // Add ₿ symbol
            const symbolCanvas = document.createElement('canvas');
            const context = symbolCanvas.getContext('2d');
            symbolCanvas.width = 128;
            symbolCanvas.height = 128;
            
            context.fillStyle = '#FFFFFF';
            context.font = 'bold 100px Arial';
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.fillText('₿', symbolCanvas.width / 2, symbolCanvas.height / 2);
            
            const symbolTexture = new THREE.CanvasTexture(symbolCanvas);
            const symbolMaterial = new THREE.MeshBasicMaterial({ 
                map: symbolTexture,
                transparent: true
            });
            
            const symbol = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), symbolMaterial);
            symbol.rotation.x = -Math.PI / 2;
            symbol.position.set(0, 0.052, 0);
            table.add(symbol);
        });
    }
    
    createCrowd() {
        // Create a cylinder for the crowd around the ring
        const crowdRadius = 20;
        const crowdHeight = 10;
        const crowdGeometry = new THREE.CylinderGeometry(crowdRadius, crowdRadius, crowdHeight, 64, 1, true);
        
        // Create crowd texture with NFT PFPs
        const crowdTexture = this.createCrowdTexture();
        const crowdMaterial = new THREE.MeshBasicMaterial({ 
            map: crowdTexture,
            side: THREE.BackSide
        });
        
        const crowd = new THREE.Mesh(crowdGeometry, crowdMaterial);
        crowd.position.set(0, crowdHeight / 2, 0);
        this.scene.add(crowd);
    }
    
    createCrowdTexture() {
        // Create a canvas texture for the crowd with PFPs
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 2048;
        canvas.height = 512;
        
        // Fill with dark color
        context.fillStyle = '#111111';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw "PFP" circles for the crowd
        const colors = ['#0000ff', '#ff0000', '#00ff00', '#ffff00', '#ff00ff', '#00ffff'];
        
        for (let i = 0; i < 500; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const radius = Math.random() * 10 + 5;
            const color = colors[Math.floor(Math.random() * colors.length)];
            
            context.fillStyle = color;
            context.beginPath();
            context.arc(x, y, radius, 0, Math.PI * 2);
            context.fill();
        }
        
        // Create texture from canvas
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(4, 1);
        
        return texture;
    }
    
    createChampionshipBelt() {
        // Create the championship belt hovering above the ring
        const beltGeometry = new THREE.TorusGeometry(2, 0.5, 16, 100);
        const beltMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xffd700, // Gold
            roughness: 0.3,
            metalness: 0.8,
            emissive: 0xffd700,
            emissiveIntensity: 0.2
        });
        
        const belt = new THREE.Mesh(beltGeometry, beltMaterial);
        belt.position.set(0, 8, 0);
        belt.rotation.x = Math.PI / 2;
        belt.castShadow = true;
        this.scene.add(belt);
        
        // Add center plate to belt
        const plateGeometry = new THREE.CylinderGeometry(1, 1, 0.2, 32);
        const plateMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xffd700,
            roughness: 0.3,
            metalness: 0.8,
            emissive: 0xffd700,
            emissiveIntensity: 0.3
        });
        
        const plate = new THREE.Mesh(plateGeometry, plateMaterial);
        plate.rotation.x = Math.PI / 2;
        belt.add(plate);
        
        // Add crypto logo to center plate
        const logoGeometry = new THREE.CircleGeometry(0.8, 32);
        const logoMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffffff,
            side: THREE.DoubleSide
        });
        
        const logo = new THREE.Mesh(logoGeometry, logoMaterial);
        logo.position.set(0, 0, 0.11);
        plate.add(logo);
        
        // Add "CHAMPION" text around the belt
        const textCanvas = document.createElement('canvas');
        const context = textCanvas.getContext('2d');
        textCanvas.width = 1024;
        textCanvas.height = 128;
        
        context.fillStyle = '#000000';
        context.fillRect(0, 0, textCanvas.width, textCanvas.height);
        
        context.fillStyle = '#ffffff';
        context.font = 'bold 80px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText('CRYPTO TWITTER CHAMPION', textCanvas.width / 2, textCanvas.height / 2);
        
        const textTexture = new THREE.CanvasTexture(textCanvas);
        const textMaterial = new THREE.MeshBasicMaterial({ 
            map: textTexture,
            transparent: true
        });
        
        const text = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.2), textMaterial);
        text.position.set(0, 0, 0.12);
        plate.add(text);
        
        // Animate the belt (rotation)
        const animate = () => {
            belt.rotation.z += 0.005;
            requestAnimationFrame(animate);
        };
        
        animate();
    }
    
    createFog() {
        // Add fog to the scene
        this.scene.fog = new THREE.FogExp2(0x000000, 0.01);
    }
    
    createRingLighting() {
        // Add a spotlight above the ring
        const spotLight = new THREE.SpotLight(0xffffff, 1.5);
        spotLight.position.set(0, 30, 0);
        spotLight.target.position.set(0, 0, 0);
        spotLight.angle = Math.PI / 6;
        spotLight.penumbra = 0.2;
        spotLight.decay = 2;
        spotLight.distance = 50;
        spotLight.castShadow = true;
        spotLight.shadow.mapSize.width = 1024;
        spotLight.shadow.mapSize.height = 1024;
        this.scene.add(spotLight);
        this.scene.add(spotLight.target);
    }
    
    createCryptoPrices() {
        // Create scrolling crypto price tickers at the bottom of the scene
        const tickerGeometry = new THREE.PlaneGeometry(40, 1);
        const tickerMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x000000, 
            transparent: true,
            opacity: 0.8
        });
        
        const ticker = new THREE.Mesh(tickerGeometry, tickerMaterial);
        ticker.position.set(0, 0.5, 15);
        this.scene.add(ticker);
        
        // Create ticker text
        const tickerCanvas = document.createElement('canvas');
        const context = tickerCanvas.getContext('2d');
        tickerCanvas.width = 2048;
        tickerCanvas.height = 64;
        
        context.fillStyle = '#000000';
        context.fillRect(0, 0, tickerCanvas.width, tickerCanvas.height);
        
        context.fillStyle = '#00ff00';
        context.font = 'bold 40px monospace';
        context.textAlign = 'left';
        context.textBaseline = 'middle';
        
        const prices = [
            'BTC: $60,420 ↑',
            'ETH: $4,269 ↑',
            'DOGE: $0.69 ↑',
            'SOL: $420 ↑',
            'MONAT: $1,337 ↑'
        ];
        
        let xPos = 0;
        prices.forEach(price => {
            context.fillText(price, xPos, tickerCanvas.height / 2);
            xPos += context.measureText(price).width + 50;
        });
        
        const tickerTexture = new THREE.CanvasTexture(tickerCanvas);
        tickerTexture.wrapS = THREE.RepeatWrapping;
        tickerTexture.repeat.x = 1;
        
        const textMaterial = new THREE.MeshBasicMaterial({ 
            map: tickerTexture,
            transparent: true
        });
        
        const tickerText = new THREE.Mesh(tickerGeometry, textMaterial);
        tickerText.position.set(0, 0, 0.01);
        ticker.add(tickerText);
        
        // Animate the ticker
        let offset = 0;
        const animate = () => {
            offset -= 0.001;
            tickerTexture.offset.x = offset;
            requestAnimationFrame(animate);
        };
        
        animate();
    }
} 