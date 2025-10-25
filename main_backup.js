// ============================================
// Rock Blast – Fire Ball
// A 2D Arcade Game
// ============================================

// Wait for DOM to be fully loaded before accessing canvas
console.log('🎮 Game script loaded...');

// Canvas Setup - Will be initialized after DOM loads
let canvas;
let ctx;

// Initialize canvas when DOM is ready
function initCanvas() {
    // Get reference to the canvas element from HTML
    canvas = document.getElementById('gameCanvas');
    
    if (!canvas) {
        console.error('❌ ERROR: Canvas element not found!');
        alert('ERROR: Canvas element not found! Make sure you are opening index.html');
        return false;
    }
    
    // Get 2D rendering context for drawing on canvas
    ctx = canvas.getContext('2d');
    
    if (!ctx) {
        console.error('❌ ERROR: Could not get canvas context!');
        return false;
    }
    
    console.log('✅ Canvas initialized successfully!');
    console.log(`   Canvas size: ${canvas.width}x${canvas.height}`);
    return true;
}

// Game Configuration
// Store all game constants in one object for easy access
// Note: canvas dimensions will be set after canvas is initialized
const CONFIG = {
    canvas: {
        width: 800,               // Canvas width: 800px (will update from actual canvas)
        height: 600               // Canvas height: 600px (will update from actual canvas)
    },
    fps: 60,                      // Target frames per second
    player: {
        width: 50,                // Player width in pixels
        height: 50,               // Player height in pixels
        speed: 5,                 // Movement speed (pixels per frame)
        color: '#FF6B35'          // Player color (orange-red)
    },
    fireball: {
        width: 8,                 // Fireball width in pixels
        height: 20,               // Fireball height in pixels
        speed: 7,                 // Fireball travel speed (pixels per frame)
        color: '#FFD700',         // Fireball color (gold)
        cooldown: 15              // Frames between shots (prevents spam)
    },
    rock: {
        minWidth: 30,             // Minimum rock width
        maxWidth: 60,             // Maximum rock width
        minHeight: 30,            // Minimum rock height
        maxHeight: 60,            // Maximum rock height
        speed: 2,                 // Base falling speed (pixels per frame)
        speedVariation: 1.5,      // Random speed variation multiplier
        color: '#8B4513',         // Rock color (brown)
        maxRocks: 5,              // Maximum number of rocks on screen
        spawnRate: 90,            // Initial frames between rock spawn attempts
        minSpawnRate: 30          // Minimum spawn rate (fastest spawning)
    },
    difficulty: {
        increaseInterval: 600,    // Increase difficulty every 10 seconds (600 frames)
        spawnRateDecrease: 5,     // Reduce spawn rate by this much each interval
        speedIncrease: 0.2,       // Increase rock speed by this much each interval
        maxSpeedBonus: 3,         // Maximum additional speed from difficulty
        scorePerLevel: 50         // Points needed to increase level
    },
    powerup: {
        width: 30,                // Power-up width
        height: 30,               // Power-up height
        speed: 2,                 // Falling speed
        spawnRate: 600,           // Frames between power-up spawns (10 seconds)
        doubleFireDuration: 600,  // Double fire duration (10 seconds = 600 frames)
        types: {
            shield: {
                color: '#00FFFF',     // Cyan color for shield
                symbol: '🛡️'          // Shield emoji
            },
            doubleFire: {
                color: '#FF00FF',     // Magenta color for double fire
                symbol: '⚡'           // Lightning emoji
            }
        }
    }
};

// Game State
// Track overall game status
const gameState = {
    isRunning: true,              // Whether game loop is active
    isGameOver: false,            // Whether the game has ended
    score: 0,                     // Player's current score
    level: 1,                     // Current game level
    shootCooldown: 0,             // Countdown timer for shooting cooldown
    rockSpawnTimer: 0,            // Timer for rock spawning
    rocksDestroyed: 0,            // Total number of rocks destroyed
    powerupSpawnTimer: 0,         // Timer for power-up spawning
    hasShield: false,             // Whether player has shield active
    doubleFire: false,            // Whether double fire is active
    doubleFireTimer: 0,           // Countdown for double fire duration
    difficultyTimer: 0,           // Timer for difficulty increase
    currentSpawnRate: 90,         // Current spawn rate (starts at initial value)
    currentSpeedBonus: 0,         // Current speed bonus from difficulty
    gameTime: 0                   // Total game time in frames
};

// Player Object
// Represents the player's spaceship/character
const player = {
    // Position player at bottom center of canvas
    x: CONFIG.canvas.width / 2 - CONFIG.player.width / 2,
    y: CONFIG.canvas.height - CONFIG.player.height - 20,
    width: CONFIG.player.width,
    height: CONFIG.player.height,
    speed: CONFIG.player.speed,
    color: CONFIG.player.color,
    
    // Player movement method
    // Handles left/right movement with boundary checks
    move: function() {
        // Move left if 'A' or 'ArrowLeft' is pressed
        if (keys['a'] || keys['A'] || keys['ArrowLeft']) {
            this.x -= this.speed;
        }
        // Move right if 'D' or 'ArrowRight' is pressed
        if (keys['d'] || keys['D'] || keys['ArrowRight']) {
            this.x += this.speed;
        }
        
        // Boundary checking - prevent player from moving off-screen
        // Keep player within left boundary (x cannot be less than 0)
        if (this.x < 0) {
            this.x = 0;
        }
        // Keep player within right boundary
        if (this.x + this.width > CONFIG.canvas.width) {
            this.x = CONFIG.canvas.width - this.width;
        }
    },
    
    // Draw player on canvas
    draw: function() {
        // Set fill color for player
        ctx.fillStyle = this.color;
        // Draw player as a rectangle
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Add a gradient effect to make player look cooler
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(this.x, this.y, this.width, this.height / 3);
        
        // Draw player outline for better visibility
        ctx.strokeStyle = '#FF4500';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.width, this.height);
        
        // Draw shield if active
        if (gameState.hasShield) {
            // Draw pulsing shield circle around player
            const pulseSize = Math.sin(Date.now() / 100) * 3 + 3; // Pulsing effect
            ctx.strokeStyle = '#00FFFF';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(
                this.x + this.width / 2, 
                this.y + this.height / 2, 
                this.width / 2 + 10 + pulseSize, 
                0, 
                Math.PI * 2
            );
            ctx.stroke();
            
            // Draw inner shield glow
            ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
            ctx.lineWidth = 6;
            ctx.stroke();
        }
    }
};

// Fireball Class
// Constructor function for creating fireball objects
class Fireball {
    constructor(x, y) {
        // Center fireball on player's x position
        this.x = x;
        this.y = y;
        this.width = CONFIG.fireball.width;
        this.height = CONFIG.fireball.height;
        this.speed = CONFIG.fireball.speed;
        this.color = CONFIG.fireball.color;
    }
    
    // Update fireball position (move upward)
    update() {
        // Move fireball upward by subtracting from y
        this.y -= this.speed;
    }
    
    // Draw fireball on canvas
    draw() {
        // Draw main fireball body (rectangle)
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Add glowing effect using radial gradient
        const gradient = ctx.createRadialGradient(
            this.x + this.width / 2, 
            this.y + this.height / 2, 
            0, 
            this.x + this.width / 2, 
            this.y + this.height / 2, 
            this.width
        );
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
        gradient.addColorStop(0.5, this.color);
        gradient.addColorStop(1, 'rgba(255, 69, 0, 0)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(this.x - 2, this.y - 2, this.width + 4, this.height + 4);
    }
    
    // Check if fireball is off-screen (used for cleanup)
    isOffScreen() {
        // Returns true if fireball has moved above the canvas
        return this.y + this.height < 0;
    }
}

// Rock Class
// Constructor function for creating rock objects that fall from the top
class Rock {
    constructor(x, y, width, height, speed) {
        this.x = x;                    // Horizontal position
        this.y = y;                    // Vertical position (starts at top)
        this.width = width;            // Rock width (random size)
        this.height = height;          // Rock height (random size)
        this.speed = speed;            // Falling speed (varies per rock)
        this.color = CONFIG.rock.color; // Rock color
        // Generate random shade variation for visual variety
        this.shade = Math.floor(Math.random() * 50);
    }
    
    // Update rock position (move downward)
    update() {
        // Move rock downward by adding to y position
        this.y += this.speed;
    }
    
    // Draw rock on canvas
    draw() {
        // Calculate darker shade for this specific rock
        const r = 139 - this.shade;
        const g = 69 - this.shade;
        const b = 19 - this.shade;
        
        // Draw main rock body with varied shading
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Add highlight to top-left for 3D effect
        ctx.fillStyle = `rgba(${r + 30}, ${g + 30}, ${b + 30}, 0.5)`;
        ctx.fillRect(this.x, this.y, this.width / 2, this.height / 3);
        
        // Add shadow to bottom-right for depth
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(
            this.x + this.width / 2, 
            this.y + this.height * 2/3, 
            this.width / 2, 
            this.height / 3
        );
        
        // Draw rock outline
        ctx.strokeStyle = '#654321';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.width, this.height);
        
        // Add some cracks/detail for realism
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        // Draw diagonal crack
        ctx.moveTo(this.x + this.width * 0.3, this.y);
        ctx.lineTo(this.x + this.width * 0.7, this.y + this.height);
        ctx.stroke();
    }
    
    // Check if rock has fallen off the bottom of the screen
    isOffScreen() {
        // Returns true if rock has moved below the canvas
        return this.y > CONFIG.canvas.height;
    }
}

// PowerUp Class
// Constructor function for creating power-up objects
class PowerUp {
    constructor(x, y, type) {
        this.x = x;                         // Horizontal position
        this.y = y;                         // Vertical position (starts at top)
        this.width = CONFIG.powerup.width;  // Power-up width
        this.height = CONFIG.powerup.height; // Power-up height
        this.speed = CONFIG.powerup.speed;  // Falling speed
        this.type = type;                   // Type: 'shield' or 'doubleFire'
        
        // Set color and symbol based on type
        if (type === 'shield') {
            this.color = CONFIG.powerup.types.shield.color;
            this.symbol = CONFIG.powerup.types.shield.symbol;
        } else {
            this.color = CONFIG.powerup.types.doubleFire.color;
            this.symbol = CONFIG.powerup.types.doubleFire.symbol;
        }
        
        // Animation properties for floating effect
        this.floatOffset = 0;
        this.floatSpeed = 0.1;
    }
    
    // Update power-up position (move downward)
    update() {
        // Move power-up downward
        this.y += this.speed;
        
        // Update floating animation
        this.floatOffset += this.floatSpeed;
    }
    
    // Draw power-up on canvas
    draw() {
        // Calculate floating effect (slight horizontal wobble)
        const floatX = Math.sin(this.floatOffset) * 3;
        
        // Draw outer glow
        ctx.shadowBlur = 20;
        ctx.shadowColor = this.color;
        
        // Draw power-up box with gradient
        const gradient = ctx.createRadialGradient(
            this.x + this.width / 2,
            this.y + this.height / 2,
            0,
            this.x + this.width / 2,
            this.y + this.height / 2,
            this.width / 2
        );
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
        gradient.addColorStop(0.5, this.color);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(
            this.x + floatX, 
            this.y, 
            this.width, 
            this.height
        );
        
        // Draw border
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.strokeRect(
            this.x + floatX, 
            this.y, 
            this.width, 
            this.height
        );
        
        // Reset shadow
        ctx.shadowBlur = 0;
        
        // Draw symbol/emoji in center
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
            this.symbol, 
            this.x + floatX + this.width / 2, 
            this.y + this.height / 2
        );
        
        // Reset text properties
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
    }
    
    // Check if power-up has fallen off the bottom of the screen
    isOffScreen() {
        return this.y > CONFIG.canvas.height;
    }
}

// Game Arrays
// Store all active game objects
const rocks = [];           // Holds all active rock objects
const fireballs = [];       // Holds all active fireball objects
const powerups = [];        // Holds all active power-up objects

// ============================================
// Initialize Game
// ============================================
function init() {
    // First, initialize the canvas
    if (!initCanvas()) {
        console.error('❌ Failed to initialize canvas! Game cannot start.');
        return;
    }
    
    // Update config with actual canvas dimensions
    CONFIG.canvas.width = canvas.width;
    CONFIG.canvas.height = canvas.height;
    
    console.log('🎮 Rock Blast – Fire Ball initialized!');
    console.log('🎯 Player controls: Arrow Keys or A/D to move, Space to shoot');
    console.log('💣 Dodge the falling rocks and blast them with fireballs!');
    console.log(`📊 Canvas: ${CONFIG.canvas.width}x${CONFIG.canvas.height}`);
    
    // Spawn initial rocks to populate the game
    spawnInitialRocks();
    
    console.log('▶️ Starting game loop...');
    
    // Game is ready - start the game loop
    gameLoop();
}

// ============================================
// Game Loop
// ============================================
// Main game loop - runs approximately 60 times per second
function gameLoop() {
    // Only update and render if game is running
    if (gameState.isRunning) {
        // Update all game objects and logic
        update();
        
        // Update explosion particle effects
        updateExplosionParticles();
        
        // Render everything to the canvas
        render();
    }
    
    // Request next animation frame (creates smooth 60fps animation)
    requestAnimationFrame(gameLoop);
}

// ============================================
// Update Game State
// ============================================
// Called every frame to update all game objects
function update() {
    // Only update game if not game over
    if (gameState.isGameOver) {
        return; // Stop all updates if game is over
    }
    
    // Increment game time
    gameState.gameTime++;
    
    // Update difficulty over time
    updateDifficulty();
    
    // Update player position based on keyboard input
    player.move();
    
    // Decrease shoot cooldown timer if it's active
    if (gameState.shootCooldown > 0) {
        gameState.shootCooldown--;
    }
    
    // Update all fireballs
    updateFireballs();
    
    // Update all rocks
    updateRocks();
    
    // Update all power-ups
    updatePowerUps();
    
    // Check for collisions between fireballs and rocks
    checkCollisions();
    
    // Check for collisions between player and rocks
    checkPlayerCollision();
    
    // Check for collisions between player and power-ups
    checkPowerUpCollision();
    
    // Update power-up timers
    updatePowerUpTimers();
    
    // Handle rock spawning
    spawnRocks();
    
    // Handle power-up spawning
    spawnPowerUps();
}

// ============================================
// Update Difficulty
// ============================================
// Gradually increases game difficulty over time
function updateDifficulty() {
    // Increment difficulty timer
    gameState.difficultyTimer++;
    
    // Check if it's time to increase difficulty
    if (gameState.difficultyTimer >= CONFIG.difficulty.increaseInterval) {
        // Reset difficulty timer
        gameState.difficultyTimer = 0;
        
        // Increase spawn rate (make rocks spawn faster)
        // Decrease the spawn rate number (lower = faster spawning)
        gameState.currentSpawnRate -= CONFIG.difficulty.spawnRateDecrease;
        
        // Don't let spawn rate go below minimum
        if (gameState.currentSpawnRate < CONFIG.rock.minSpawnRate) {
            gameState.currentSpawnRate = CONFIG.rock.minSpawnRate;
        }
        
        // Increase rock fall speed bonus
        gameState.currentSpeedBonus += CONFIG.difficulty.speedIncrease;
        
        // Cap speed bonus at maximum
        if (gameState.currentSpeedBonus > CONFIG.difficulty.maxSpeedBonus) {
            gameState.currentSpeedBonus = CONFIG.difficulty.maxSpeedBonus;
        }
        
        // Log difficulty increase
        console.log(`⚠️ DIFFICULTY INCREASED!`);
        console.log(`   Spawn Rate: ${gameState.currentSpawnRate} frames`);
        console.log(`   Speed Bonus: +${gameState.currentSpeedBonus.toFixed(1)} pixels/frame`);
    }
    
    // Update level based on score
    const newLevel = Math.floor(gameState.score / CONFIG.difficulty.scorePerLevel) + 1;
    if (newLevel > gameState.level) {
        gameState.level = newLevel;
        console.log(`🎉 LEVEL UP! Now at level ${gameState.level}`);
    }
}

// ============================================
// Update Fireballs
// ============================================
// Moves all fireballs and removes ones that are off-screen
function updateFireballs() {
    // Loop through fireballs array backwards
    // (backwards loop allows safe removal during iteration)
    for (let i = fireballs.length - 1; i >= 0; i--) {
        // Move the fireball upward
        fireballs[i].update();
        
        // Remove fireball if it's off the top of the screen
        if (fireballs[i].isOffScreen()) {
            fireballs.splice(i, 1);
        }
    }
}

// ============================================
// Update Rocks
// ============================================
// Moves all rocks downward and removes ones that are off-screen
function updateRocks() {
    // Loop through rocks array backwards
    // (backwards loop allows safe removal during iteration)
    for (let i = rocks.length - 1; i >= 0; i--) {
        // Move the rock downward
        rocks[i].update();
        
        // Check if rock has fallen off the bottom of the screen
        if (rocks[i].isOffScreen()) {
            // Remove the rock from array
            rocks.splice(i, 1);
            // Log for debugging
            console.log(`Rock removed (off-screen). Active rocks: ${rocks.length}`);
        }
    }
}

// ============================================
// Spawn Rocks
// ============================================
// Handles the spawning of new rocks at regular intervals
function spawnRocks() {
    // Increment the spawn timer each frame
    gameState.rockSpawnTimer++;
    
    // Check if it's time to spawn a new rock
    // Use current spawn rate which decreases over time (difficulty)
    // AND if we haven't reached the maximum number of rocks
    if (gameState.rockSpawnTimer >= gameState.currentSpawnRate && 
        rocks.length < CONFIG.rock.maxRocks) {
        
        // Reset spawn timer
        gameState.rockSpawnTimer = 0;
        
        // Create a new rock with random properties
        createRock();
    }
}

// ============================================
// Create Rock
// ============================================
// Creates a single rock with random size, position, and speed
function createRock() {
    // Generate random width between min and max
    const width = CONFIG.rock.minWidth + 
                  Math.random() * (CONFIG.rock.maxWidth - CONFIG.rock.minWidth);
    
    // Generate random height between min and max
    const height = CONFIG.rock.minHeight + 
                   Math.random() * (CONFIG.rock.maxHeight - CONFIG.rock.minHeight);
    
    // Generate random X position
    // Ensure rock spawns fully on screen (not cut off at edges)
    const x = Math.random() * (CONFIG.canvas.width - width);
    
    // Start rock above the visible canvas (so it appears to fall in)
    const y = -height;
    
    // Generate random speed with variation
    // Base speed + random variation + difficulty bonus
    const baseSpeed = CONFIG.rock.speed + 
                      Math.random() * CONFIG.rock.speedVariation;
    
    // Add difficulty speed bonus to make rocks faster over time
    const speed = baseSpeed + gameState.currentSpeedBonus;
    
    // Create new rock object and add to rocks array
    const newRock = new Rock(x, y, width, height, speed);
    rocks.push(newRock);
    
    // Log for debugging (show difficulty impact)
    console.log(`Rock spawned: speed=${speed.toFixed(2)} (base=${baseSpeed.toFixed(2)} +${gameState.currentSpeedBonus.toFixed(2)} difficulty). Rocks: ${rocks.length}`);
}

// ============================================
// Spawn Initial Rocks
// ============================================
// Creates some rocks at the start of the game for immediate action
function spawnInitialRocks() {
    // Spawn 2-3 rocks at game start
    const initialRockCount = 2 + Math.floor(Math.random() * 2);
    
    for (let i = 0; i < initialRockCount; i++) {
        // Generate random properties for each rock
        const width = CONFIG.rock.minWidth + 
                      Math.random() * (CONFIG.rock.maxWidth - CONFIG.rock.minWidth);
        const height = CONFIG.rock.minHeight + 
                       Math.random() * (CONFIG.rock.maxHeight - CONFIG.rock.minHeight);
        const x = Math.random() * (CONFIG.canvas.width - width);
        
        // Place initial rocks at various heights (not all at top)
        // This creates a more natural starting state
        const y = -height - (i * 150);
        
        // Initial rocks use base speed (no difficulty bonus at start)
        const speed = CONFIG.rock.speed + 
                      Math.random() * CONFIG.rock.speedVariation;
        
        // Create and add rock to array
        rocks.push(new Rock(x, y, width, height, speed));
    }
    
    console.log(`${initialRockCount} initial rocks spawned`);
}

// ============================================
// Check Collisions
// ============================================
// Detects and handles collisions between fireballs and rocks
function checkCollisions() {
    // Loop through all fireballs
    for (let i = fireballs.length - 1; i >= 0; i--) {
        const fireball = fireballs[i];
        
        // For each fireball, check collision with all rocks
        for (let j = rocks.length - 1; j >= 0; j--) {
            const rock = rocks[j];
            
            // Check if fireball and rock are colliding
            if (isColliding(fireball, rock)) {
                // Collision detected! Handle the collision
                handleRockDestruction(rock, fireball, i, j);
                
                // Break out of rock loop since this fireball hit something
                // One fireball can only destroy one rock
                break;
            }
        }
    }
}

// ============================================
// Is Colliding
// ============================================
// Checks if two rectangular objects are overlapping (AABB collision detection)
// AABB = Axis-Aligned Bounding Box
function isColliding(obj1, obj2) {
    // Check if rectangles overlap on both X and Y axes
    // For rectangles to collide, they must overlap on BOTH axes
    
    // Check X-axis overlap:
    // obj1's right edge must be past obj2's left edge
    // AND obj1's left edge must be before obj2's right edge
    const xOverlap = obj1.x < obj2.x + obj2.width && 
                     obj1.x + obj1.width > obj2.x;
    
    // Check Y-axis overlap:
    // obj1's bottom edge must be past obj2's top edge
    // AND obj1's top edge must be before obj2's bottom edge
    const yOverlap = obj1.y < obj2.y + obj2.height && 
                     obj1.y + obj1.height > obj2.y;
    
    // Return true only if both axes overlap (collision occurred)
    return xOverlap && yOverlap;
}

// ============================================
// Handle Rock Destruction
// ============================================
// Processes what happens when a fireball destroys a rock
function handleRockDestruction(rock, fireball, fireballIndex, rockIndex) {
    // Calculate points based on rock size
    // Smaller rocks are harder to hit, so they give more points
    const rockArea = rock.width * rock.height;
    const maxArea = CONFIG.rock.maxWidth * CONFIG.rock.maxHeight;
    const minArea = CONFIG.rock.minWidth * CONFIG.rock.minHeight;
    
    // Points calculation: smaller rocks = more points (10-25 points)
    // Inverse relationship: smaller area = higher score
    const pointsEarned = Math.floor(10 + (1 - (rockArea - minArea) / (maxArea - minArea)) * 15);
    
    // Add points to player's score
    gameState.score += pointsEarned;
    
    // Increment rocks destroyed counter
    gameState.rocksDestroyed++;
    
    // Create explosion effect at rock position (visual feedback)
    createExplosion(rock.x + rock.width / 2, rock.y + rock.height / 2);
    
    // Remove the rock from rocks array
    rocks.splice(rockIndex, 1);
    
    // Remove the fireball from fireballs array
    fireballs.splice(fireballIndex, 1);
    
    // Log the destruction for debugging
    console.log(`💥 Rock destroyed! +${pointsEarned} points. Score: ${gameState.score}`);
}

// ============================================
// Check Player Collision
// ============================================
// Detects if any rock has collided with the player
function checkPlayerCollision() {
    // Loop through all rocks to check collision with player
    for (let i = 0; i < rocks.length; i++) {
        const rock = rocks[i];
        
        // Check if rock is colliding with player
        if (isColliding(player, rock)) {
            // Collision detected! Player hit by rock
            handleGameOver(rock);
            
            // Stop checking for more collisions
            break;
        }
    }
}

// ============================================
// Handle Game Over
// ============================================
// Processes game over state when player is hit by a rock
function handleGameOver(rock) {
    // Set game over flag to true
    gameState.isGameOver = true;
    
    // Create dramatic explosion at player position
    createPlayerExplosion(
        player.x + player.width / 2, 
        player.y + player.height / 2
    );
    
    // Log game over to console
    console.log('💀 GAME OVER! Player hit by rock!');
    console.log(`Final Score: ${gameState.score}`);
    console.log(`Rocks Destroyed: ${gameState.rocksDestroyed}`);
    
    // Optional: Play game over sound effect here
    // playSound('gameOver');
}

// ============================================
// Create Player Explosion
// ============================================
// Creates a larger explosion effect when player dies
function createPlayerExplosion(x, y) {
    // Create more particles for dramatic player death effect
    const particleCount = 20; // More particles than rock explosion
    
    for (let i = 0; i < particleCount; i++) {
        // Calculate angle for this particle (evenly distributed in circle)
        const angle = (Math.PI * 2 * i) / particleCount;
        
        // Random speed variation for more dynamic explosion
        const speed = 2 + Math.random() * 3;
        
        // Create particle with position and velocity
        const particle = {
            x: x,                           // Starting X position (center of player)
            y: y,                           // Starting Y position (center of player)
            vx: Math.cos(angle) * speed,    // X velocity (horizontal movement)
            vy: Math.sin(angle) * speed,    // Y velocity (vertical movement)
            life: 60,                       // Longer life for player explosion
            maxLife: 60,                    // Initial life (for fade effect)
            size: 5 + Math.random() * 3,    // Variable particle sizes
            color: '#FF6B35'                // Player color (orange-red)
        };
        
        // Add particle to explosion particles array
        explosionParticles.push(particle);
    }
    
    // Add some white/yellow flash particles for extra effect
    for (let i = 0; i < 10; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 3 + Math.random() * 4;
        
        const particle = {
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 40,
            maxLife: 40,
            size: 6,
            color: '#FFFFFF'  // White particles
        };
        
        explosionParticles.push(particle);
    }
}

// ============================================
// Create Explosion
// ============================================
// Creates a visual explosion effect when a rock is destroyed
function createExplosion(x, y) {
    // For now, we'll create a simple particle array
    // This will be rendered as a visual effect
    
    // Create 8 explosion particles radiating outward
    const particleCount = 8;
    
    for (let i = 0; i < particleCount; i++) {
        // Calculate angle for this particle (evenly distributed in circle)
        const angle = (Math.PI * 2 * i) / particleCount;
        
        // Create particle with position and velocity
        const particle = {
            x: x,                           // Starting X position (center of explosion)
            y: y,                           // Starting Y position (center of explosion)
            vx: Math.cos(angle) * 3,        // X velocity (horizontal movement)
            vy: Math.sin(angle) * 3,        // Y velocity (vertical movement)
            life: 30,                       // How many frames the particle lives
            maxLife: 30,                    // Initial life (for fade effect)
            size: 4,                        // Particle size in pixels
            color: '#FFD700'                // Particle color (gold)
        };
        
        // Add particle to explosion particles array
        explosionParticles.push(particle);
    }
}

// Explosion Particles Array
// Stores all active explosion particles for rendering
const explosionParticles = [];

// ============================================
// Update Explosion Particles
// ============================================
// Moves and fades out explosion particles
function updateExplosionParticles() {
    // Loop through particles backwards (for safe removal)
    for (let i = explosionParticles.length - 1; i >= 0; i--) {
        const particle = explosionParticles[i];
        
        // Move particle based on velocity
        particle.x += particle.vx;
        particle.y += particle.vy;
        
        // Apply gravity/slow down effect
        particle.vy += 0.1;  // Slight downward acceleration
        particle.vx *= 0.98; // Friction - particles slow down
        
        // Decrease particle life
        particle.life--;
        
        // Remove particle if life is over
        if (particle.life <= 0) {
            explosionParticles.splice(i, 1);
        }
    }
}

// ============================================
// Draw Explosion Particles
// ============================================
// Renders all active explosion particles
function drawExplosionParticles() {
    for (let i = 0; i < explosionParticles.length; i++) {
        const particle = explosionParticles[i];
        
        // Calculate opacity based on remaining life (fade out effect)
        const opacity = particle.life / particle.maxLife;
        
        // Draw particle with fading effect
        ctx.fillStyle = `rgba(255, 215, 0, ${opacity})`;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Add white center for glow effect
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.8})`;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size / 2, 0, Math.PI * 2);
        ctx.fill();
    }
}

// ============================================
// Shoot Fireball
// ============================================
// Creates a new fireball at the player's position
function shootFireball() {
    // Only shoot if cooldown is finished
    if (gameState.shootCooldown <= 0) {
        // Check if double fire is active
        if (gameState.doubleFire) {
            // Shoot two fireballs side by side
            
            // Left fireball
            const leftFireballX = player.x + (player.width / 4) - (CONFIG.fireball.width / 2);
            const fireballY = player.y;
            fireballs.push(new Fireball(leftFireballX, fireballY));
            
            // Right fireball
            const rightFireballX = player.x + (player.width * 3/4) - (CONFIG.fireball.width / 2);
            fireballs.push(new Fireball(rightFireballX, fireballY));
            
            console.log(`⚡ Double Fireball shot! Active fireballs: ${fireballs.length}`);
        } else {
            // Normal single fireball
            // Calculate fireball starting position
            // Center it horizontally on the player
            const fireballX = player.x + (player.width / 2) - (CONFIG.fireball.width / 2);
            // Start fireball at top of player
            const fireballY = player.y;
            
            // Create new fireball object and add to array
            fireballs.push(new Fireball(fireballX, fireballY));
            
            console.log(`Fireball shot! Active fireballs: ${fireballs.length}`);
        }
        
        // Reset cooldown timer to prevent rapid firing
        gameState.shootCooldown = CONFIG.fireball.cooldown;
    }
}

// ============================================
// Render Game
// ============================================
// Draw everything on the canvas each frame
function render() {
    // Clear the entire canvas before drawing new frame
    ctx.clearRect(0, 0, CONFIG.canvas.width, CONFIG.canvas.height);
    
    // Draw animated background
    drawBackground();
    
    // Draw all falling rocks
    drawRocks();
    
    // Draw all power-ups
    drawPowerUps();
    
    // Draw the player
    player.draw();
    
    // Draw all active fireballs
    drawFireballs();
    
    // Draw explosion particles (on top of everything)
    drawExplosionParticles();
    
    // Draw game over screen if game has ended
    if (gameState.isGameOver) {
        drawGameOver();
    }
    
    // Draw UI elements (score, instructions, etc.)
    drawUI();
}

// ============================================
// Draw Background
// ============================================
// Creates an animated starfield effect
function drawBackground() {
    // Draw dark space background
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, CONFIG.canvas.width, CONFIG.canvas.height);
    
    // Add some stars for visual effect
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    for (let i = 0; i < 50; i++) {
        // Create pseudo-random star positions based on index
        const x = (i * 37) % CONFIG.canvas.width;
        const y = (i * 67) % CONFIG.canvas.height;
        const size = (i % 3) + 1;
        
        // Draw small star
        ctx.fillRect(x, y, size, size);
    }
}

// ============================================
// Draw Rocks
// ============================================
// Render all active rocks on the canvas
function drawRocks() {
    // Loop through all rocks and draw each one
    for (let i = 0; i < rocks.length; i++) {
        rocks[i].draw();
    }
}

// ============================================
// Draw Power-Ups
// ============================================
// Render all active power-ups on the canvas
function drawPowerUps() {
    // Loop through all power-ups and draw each one
    for (let i = 0; i < powerups.length; i++) {
        powerups[i].draw();
    }
}

// ============================================
// Draw Fireballs
// ============================================
// Render all active fireballs on the canvas
function drawFireballs() {
    // Loop through all fireballs and draw each one
    for (let i = 0; i < fireballs.length; i++) {
        fireballs[i].draw();
    }
}

// ============================================
// Draw Game Over Screen
// ============================================
// Displays the game over message and final statistics
function drawGameOver() {
    // Draw semi-transparent dark overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, CONFIG.canvas.width, CONFIG.canvas.height);
    
    // Set text alignment to center
    ctx.textAlign = 'center';
    
    // Draw "GAME OVER" title
    ctx.font = 'bold 60px Arial';
    ctx.fillStyle = '#FF0000';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 5;
    // Draw text outline
    ctx.strokeText('GAME OVER', CONFIG.canvas.width / 2, CONFIG.canvas.height / 2 - 80);
    // Draw text fill
    ctx.fillText('GAME OVER', CONFIG.canvas.width / 2, CONFIG.canvas.height / 2 - 80);
    
    // Draw skull emoji effect (using text)
    ctx.font = '80px Arial';
    ctx.fillText('💀', CONFIG.canvas.width / 2, CONFIG.canvas.height / 2);
    
    // Draw final score
    ctx.font = 'bold 36px Arial';
    ctx.fillStyle = '#FFD700';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.strokeText(`Final Score: ${gameState.score}`, CONFIG.canvas.width / 2, CONFIG.canvas.height / 2 + 60);
    ctx.fillText(`Final Score: ${gameState.score}`, CONFIG.canvas.width / 2, CONFIG.canvas.height / 2 + 60);
    
    // Draw rocks destroyed stat
    ctx.font = 'bold 24px Arial';
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeText(`Rocks Destroyed: ${gameState.rocksDestroyed}`, CONFIG.canvas.width / 2, CONFIG.canvas.height / 2 + 100);
    ctx.fillText(`Rocks Destroyed: ${gameState.rocksDestroyed}`, CONFIG.canvas.width / 2, CONFIG.canvas.height / 2 + 100);
    
    // Draw restart instructions
    ctx.font = '20px Arial';
    ctx.fillStyle = '#00FF00';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeText('Press R to Restart', CONFIG.canvas.width / 2, CONFIG.canvas.height / 2 + 150);
    ctx.fillText('Press R to Restart', CONFIG.canvas.width / 2, CONFIG.canvas.height / 2 + 150);
    
    // Draw encouraging message based on score
    let message = '';
    if (gameState.score >= 200) {
        message = '🌟 AMAZING! MASTER BLASTER! 🌟';
    } else if (gameState.score >= 100) {
        message = '⭐ Great Job! Keep it up! ⭐';
    } else if (gameState.score >= 50) {
        message = '👍 Good Try! Practice more! 👍';
    } else {
        message = '💪 Keep Practicing! You can do it! 💪';
    }
    
    ctx.font = '18px Arial';
    ctx.fillStyle = '#FFA500';
    ctx.fillText(message, CONFIG.canvas.width / 2, CONFIG.canvas.height / 2 + 190);
    
    // Reset text alignment
    ctx.textAlign = 'left';
}

// ============================================
// Draw UI
// ============================================
// Display game information and instructions
function drawUI() {
    // Set text properties for main UI
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'left';
    
    // Display score in top-left corner (larger, more prominent)
    ctx.fillStyle = '#FFD700';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    // Draw text outline for better visibility
    ctx.strokeText(`Score: ${gameState.score}`, 20, 35);
    // Draw text fill
    ctx.fillText(`Score: ${gameState.score}`, 20, 35);
    
    // Display level below score
    ctx.font = 'bold 18px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeText(`Level: ${gameState.level}`, 20, 60);
    ctx.fillText(`Level: ${gameState.level}`, 20, 60);
    
    // Only show debug stats if game is not over
    if (!gameState.isGameOver) {
        // Display statistics (smaller font for debug info)
        ctx.font = '14px Arial';
        ctx.textAlign = 'left';
        
        // Display total rocks destroyed
        ctx.fillStyle = '#00FF00';
        ctx.fillText(`Destroyed: ${gameState.rocksDestroyed}`, 20, 85);
        
        // Display active fireballs count (for debugging)
        ctx.fillStyle = '#FFD700';
        ctx.fillText(`Fireballs: ${fireballs.length}`, 20, 105);
        
        // Display active rocks count
        ctx.fillStyle = '#8B4513';
        ctx.fillText(`Rocks: ${rocks.length}`, 20, 125);
        
        // Display difficulty information
        ctx.fillStyle = '#FFA500';
        const difficultyPercent = Math.min(100, Math.floor((gameState.currentSpeedBonus / CONFIG.difficulty.maxSpeedBonus) * 100));
        ctx.fillText(`Difficulty: ${difficultyPercent}%`, 20, 145);
        
        // Display game time
        const seconds = Math.floor(gameState.gameTime / 60);
        const minutes = Math.floor(seconds / 60);
        const displaySeconds = seconds % 60;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(`Time: ${minutes}:${displaySeconds.toString().padStart(2, '0')}`, 20, 165);
        
        // Display cooldown indicator when active
        if (gameState.shootCooldown > 0) {
            ctx.fillStyle = '#FF6B35';
            ctx.fillText(`Cooldown: ${gameState.shootCooldown}`, 20, 185);
        } else {
            ctx.fillStyle = '#00FF00';
            ctx.fillText('Ready to fire!', 20, 185);
        }
        
        // Display active power-ups
        let yOffset = 210;
        
        // Shield indicator
        if (gameState.hasShield) {
            ctx.fillStyle = '#00FFFF';
            ctx.fillText('🛡️ Shield Active', 20, yOffset);
            yOffset += 20;
        }
        
        // Double fire indicator with timer
        if (gameState.doubleFire) {
            const secondsLeft = Math.ceil(gameState.doubleFireTimer / 60);
            ctx.fillStyle = '#FF00FF';
            ctx.fillText(`⚡ Double Fire: ${secondsLeft}s`, 20, yOffset);
            yOffset += 20;
        }
        
        // Display instructions in bottom-right corner
        ctx.textAlign = 'right';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = '12px Arial';
        ctx.fillText('Arrow Keys/A/D: Move', CONFIG.canvas.width - 20, CONFIG.canvas.height - 70);
        ctx.fillText('Space: Shoot Fireballs', CONFIG.canvas.width - 20, CONFIG.canvas.height - 55);
        ctx.fillText('Collect power-ups!', CONFIG.canvas.width - 20, CONFIG.canvas.height - 40);
        ctx.fillText('🛡️ Shield  ⚡ Double Fire', CONFIG.canvas.width - 20, CONFIG.canvas.height - 25);
        ctx.fillText('⚠️ Difficulty increases over time!', CONFIG.canvas.width - 20, CONFIG.canvas.height - 10);
    }
}

// ============================================
// Input Handlers
// ============================================
// Object to track which keys are currently pressed
const keys = {};

// Key press event - marks key as pressed
window.addEventListener('keydown', (e) => {
    // Store key state as true when pressed
    keys[e.key] = true;
    
    // Handle spacebar for shooting
    // Check for both ' ' (space) and 'Space' for compatibility
    if (e.key === ' ' || e.key === 'Space') {
        e.preventDefault(); // Prevent page scrolling on spacebar
        
        // Only shoot if game is not over
        if (!gameState.isGameOver) {
            shootFireball();    // Fire a fireball
        }
    }
    
    // Handle 'R' key for restart
    if (e.key === 'r' || e.key === 'R') {
        // Only restart if game is over
        if (gameState.isGameOver) {
            restartGame();
        }
    }
});

// Key release event - marks key as released
window.addEventListener('keyup', (e) => {
    // Store key state as false when released
    keys[e.key] = false;
});

// ============================================
// Restart Game
// ============================================
// Resets all game state and restarts the game
function restartGame() {
    console.log('🔄 Restarting game...');
    
    // Reset game state
    gameState.isGameOver = false;
    gameState.score = 0;
    gameState.level = 1;
    gameState.shootCooldown = 0;
    gameState.rockSpawnTimer = 0;
    gameState.rocksDestroyed = 0;
    gameState.powerupSpawnTimer = 0;
    gameState.hasShield = false;
    gameState.doubleFire = false;
    gameState.doubleFireTimer = 0;
    gameState.difficultyTimer = 0;
    gameState.currentSpawnRate = CONFIG.rock.spawnRate;
    gameState.currentSpeedBonus = 0;
    gameState.gameTime = 0;
    
    // Clear all game objects
    rocks.length = 0;           // Clear rocks array
    fireballs.length = 0;       // Clear fireballs array
    powerups.length = 0;        // Clear power-ups array
    explosionParticles.length = 0; // Clear particles array
    
    // Reset player position to starting position
    player.x = CONFIG.canvas.width / 2 - CONFIG.player.width / 2;
    player.y = CONFIG.canvas.height - CONFIG.player.height - 20;
    
    // Spawn initial rocks for new game
    spawnInitialRocks();
    
    console.log('✅ Game restarted! Good luck!');
}

// ============================================
// Start Game
// ============================================
// Initialize game when page fully loads
window.addEventListener('load', () => {
    console.log('📄 Page loaded, initializing game...');
    
    // Small delay to ensure everything is ready
    setTimeout(() => {
        init();
    }, 100);
});
