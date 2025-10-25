// ============================================
// Rock Blast – Fire Ball
// A 2D Arcade Game - FIXED VERSION
// ============================================

console.log('🎮 Starting game initialization...');

// Canvas and context - will be initialized after DOM loads
let canvas = null;
let ctx = null;

// ============================================
// AUDIO SYSTEM - Sound Effects Manager
// ============================================

// Audio objects for sound effects
const sounds = {
    shoot: null,        // Sound when player shoots fireball
    explosion: null,    // Sound when rock is destroyed
    powerup: null,      // Sound when collecting power-up
    gameOver: null,     // Sound when game ends
    shield: null,       // Sound when shield breaks
    bounce: null        // Sound when a rock bounces on the ground
};

// Audio enabled flag (can be toggled by user)
let audioEnabled = true;

// Initialize all sound effects from assets/audio folder
function initSounds() {
    try {
        // Create Audio objects for each sound effect
        // Note: These are placeholder paths - actual sound files should be placed in assets/audio/
        
        // Shooting sound - plays when fireball is fired
        sounds.shoot = new Audio('assets/audio/shoot.mp3');
        sounds.shoot.volume = 0.3; // Set volume to 30% to avoid being too loud
        
        // Explosion sound - plays when rock is destroyed
        sounds.explosion = new Audio('assets/audio/explosion.mp3');
        sounds.explosion.volume = 0.4; // Set volume to 40%
        
        // Power-up collection sound - plays when picking up shield or double-fire
        sounds.powerup = new Audio('assets/audio/powerup.mp3');
        sounds.powerup.volume = 0.5; // Set volume to 50%
        
        // Game over sound - plays when player dies
        sounds.gameOver = new Audio('assets/audio/gameover.mp3');
        sounds.gameOver.volume = 0.6; // Set volume to 60%
        
        // Shield break sound - plays when shield absorbs a hit
        sounds.shield = new Audio('assets/audio/shield.mp3');
        sounds.shield.volume = 0.4; // Set volume to 40%
        
    // Rock ground bounce sound - plays when a rock hits the ground
    sounds.bounce = new Audio('assets/audio/bounce.mp3');
    sounds.bounce.volume = 0.35; // Gentle bounce volume
        
        console.log('✅ Audio system initialized');
    } catch (error) {
        // If audio files are missing, log warning but don't crash the game
        console.warn('⚠️ Audio files not found. Game will run without sound.');
        console.warn('Place .mp3 files in assets/audio/ folder:');
        console.warn('- shoot.mp3, explosion.mp3, powerup.mp3, gameover.mp3, shield.mp3');
        audioEnabled = false; // Disable audio if files are missing
    }
}

// Play a sound effect with error handling
function playSound(soundName) {
    // Only play sound if audio is enabled and the sound exists
    if (!audioEnabled || !sounds[soundName]) {
        return; // Exit if audio disabled or sound doesn't exist
    }
    
    try {
        // Clone the audio to allow overlapping sounds (multiple explosions at once)
        const sound = sounds[soundName].cloneNode();
        sound.volume = sounds[soundName].volume; // Copy the volume setting
        
        // Play the sound
        sound.play().catch(err => {
            // Handle playback errors (browser might block autoplay)
            console.warn(`Could not play ${soundName}:`, err.message);
        });
    } catch (error) {
        // Catch any other errors to prevent game crash
        console.warn(`Error playing ${soundName}:`, error.message);
    }
}

// Toggle audio on/off (can be called with 'M' key)
function toggleAudio() {
    audioEnabled = !audioEnabled; // Flip the boolean
    console.log(audioEnabled ? '🔊 Audio enabled' : '🔇 Audio muted');
}

// Game Configuration
const CONFIG = {
    canvas: {
        width: 800,
        height: 600
    },
    fps: 60,
    player: {
        width: 50,
        height: 50,
        speed: 5,
        color: '#FF6B35'
    },
    fireball: {
        width: 16,        // Slightly larger for better visibility at high speed
        height: 16,
        speed: 50,        // Very fast projectile speed
        color: '#FFD700',
        cooldown: 3       // Minimal gap - fires almost continuously (3 frames = ~50ms gap)
    },
    rock: {
        minWidth: 30,
        maxWidth: 60,
        minHeight: 30,
        maxHeight: 60,
        baseScale: 2.0,   // All rocks are 2× their original size to be more visible
        speed: 0.8,       // Much slower initial fall - easy to play
        speedVariation: 0.3, // Very little variation - consistent speed
        color: '#8B4513',
        maxRocks: 5,
        spawnRate: 90,
        minSpawnRate: 30,
        gravity: 0.15,    // Constant downward acceleration applied per frame
        bounce: 1.0,      // Perfectly elastic: infinite bounce, no energy loss
        bounceAngleJitter: 0.15, // Small horizontal tweak on bounce for natural variation
        // Fragmentation scaling: Each split halves the size
        fragmentScales: {
            level0: 2.0,   // Initial spawn: 2× base size (e.g., 60 → 120px)
            level1: 1.0,   // After 1st split: 1× base size (120 → 60px each)
            level2: 0.5    // After 2nd split: 0.5× base size (60 → 30px each)
        }
    },
    difficulty: {
        increaseInterval: 600,
        spawnRateDecrease: 5,
        speedIncrease: 0.2,
        maxSpeedBonus: 3,
        scorePerLevel: 50
    },
    powerup: {
        width: 30,
        height: 30,
        speed: 3,         // Increased from 2 to 3 - faster power-ups
        spawnRate: 600,
        doubleFireDuration: 600,
        types: {
            shield: {
                color: '#00FFFF',
                symbol: '🛡️'
            },
            doubleFire: {
                color: '#FF00FF',
                symbol: '⚡'
            }
        }
    }
};

// Game State
const gameState = {
    isRunning: true,
    isGameOver: false,
    score: 0,
    level: 1,
    shootCooldown: 0,
    rockSpawnTimer: 0,
    rocksDestroyed: 0,
    powerupSpawnTimer: 0,
    hasShield: false,
    doubleFire: false,
    doubleFireTimer: 0,
    difficultyTimer: 0,
    currentSpawnRate: 90,
    currentSpeedBonus: 0,
    gameTime: 0,
    waveActive: false,  // Track if a wave is currently active
    waveNumber: 1,      // Current wave number
    rocksPerWave: 3     // Number of rocks per wave
};

// ============================================
// DEBUG OVERLAY
// ============================================
const DEBUG = {
    enabled: false,     // Toggle with 'D'
    drawGround: true,
    drawVelocity: true
};

// ============================================
// TOUCH/MOUSE CONTROL SYSTEM
// ============================================

// Mouse/Touch position tracking
let mouseX = null; // Current mouse/touch X position (null when not touching)
let isTouching = false; // Whether user is currently touching/clicking

// Player Object
const player = {
    x: 0,
    y: 0,
    width: CONFIG.player.width,
    height: CONFIG.player.height,
    speed: CONFIG.player.speed,
    color: CONFIG.player.color,
    
    move: function() {
        // ----------------------------------------
        // INSTANT TOUCH/MOUSE CONTROL - Player follows cursor/finger exactly
        // ----------------------------------------
        
        if (mouseX !== null) {
            // Instantly move player to mouse/touch position (centered on finger/cursor)
            this.x = mouseX - (this.width / 2);
        }
        
        // Keep player within screen boundaries
        if (this.x < 0) this.x = 0; // Left boundary
        if (this.x + this.width > CONFIG.canvas.width) {
            this.x = CONFIG.canvas.width - this.width; // Right boundary
        }
    },
    
    draw: function() {
        // Draw cannon base with wheels (like screenshot)
        const centerX = this.x + this.width / 2;
        const bottomY = this.y + this.height;
        
        // Cannon body (dark gray rectangle)
        ctx.fillStyle = '#555555';
        ctx.fillRect(this.x + 5, this.y + 20, this.width - 10, this.height - 20);
        
        // Cannon barrel (pointing up)
        ctx.fillStyle = '#666666';
        ctx.fillRect(centerX - 8, this.y - 15, 16, 35);
        
        // Cannon top (lighter gray)
        ctx.fillStyle = '#777777';
        ctx.fillRect(this.x + 5, this.y + 20, this.width - 10, 8);
        
        // Left wheel
        const wheelRadius = 8;
        const wheelY = bottomY - 3;
        
        // Left wheel rim
        ctx.fillStyle = '#FFA500'; // Orange rim like screenshot
        ctx.beginPath();
        ctx.arc(this.x + 15, wheelY, wheelRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Left wheel tire (black)
        ctx.fillStyle = '#222222';
        ctx.beginPath();
        ctx.arc(this.x + 15, wheelY, wheelRadius - 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Left wheel center
        ctx.fillStyle = '#FFA500';
        ctx.beginPath();
        ctx.arc(this.x + 15, wheelY, 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Right wheel (same as left)
        ctx.fillStyle = '#FFA500';
        ctx.beginPath();
        ctx.arc(this.x + 35, wheelY, wheelRadius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#222222';
        ctx.beginPath();
        ctx.arc(this.x + 35, wheelY, wheelRadius - 2, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#FFA500';
        ctx.beginPath();
        ctx.arc(this.x + 35, wheelY, 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Shield effect if active
        if (gameState.hasShield) {
            const pulseSize = Math.sin(Date.now() / 100) * 3 + 3;
            ctx.strokeStyle = '#00FFFF';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(
                centerX,
                this.y + this.height / 2,
                this.width / 2 + 10 + pulseSize,
                0,
                Math.PI * 2
            );
            ctx.stroke();
            
            ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
            ctx.lineWidth = 6;
            ctx.stroke();
        }
    }
};

// Fireball Class - Green dots like screenshot
class Fireball {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        // Size now driven by CONFIG so you can tune easily
        this.width = CONFIG.fireball.width || 6;
        this.height = CONFIG.fireball.height || 6;
        this.speed = CONFIG.fireball.speed;
        this.color = '#4CAF50'; // Green like screenshot
    }
    
    update() {
        this.y -= this.speed;
    }
    
    draw() {
        // Draw scalable green orb using concentric circles
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;
        const r = Math.min(this.width, this.height) / 2;

        // Outer darker ring
        ctx.fillStyle = '#2E7D32';
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.85, 0, Math.PI * 2);
        ctx.fill();

        // Main green body
        ctx.fillStyle = '#4CAF50';
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.65, 0, Math.PI * 2);
        ctx.fill();

        // White highlight
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(cx - r * 0.15, cy - r * 0.15, r * 0.35, 0, Math.PI * 2);
        ctx.fill();
    }
    
    isOffScreen() {
        return this.y + this.height < 0;
    }
}

// Rock Class - Bouncing rocks with numbers
class Rock {
    constructor(x, y, width, height, speed, fragmentLevel = 0, isBoss = false) {
        this.x = x;
        this.y = y;
        this.baseWidth = width;  // Store original base size
        this.baseHeight = height;
        
        // Fragment tracking: 0 = full size, 1 = half size, 2 = quarter size
        this.fragmentLevel = fragmentLevel;
        this.isBoss = isBoss; // Boss rocks have enhanced visual effects
        
        // Apply realistic size scaling based on fragment level
        const scales = CONFIG.rock.fragmentScales;
        let sizeMultiplier;
        
        if (isBoss) {
            // Boss rocks: 2× larger at each stage for dramatic effect
            if (fragmentLevel === 0) {
                sizeMultiplier = scales.level0 * 2;  // 4× base (e.g., 60 → 240px)
            } else if (fragmentLevel === 1) {
                sizeMultiplier = scales.level1 * 2;  // 2× base (240 → 120px each)
            } else {
                sizeMultiplier = scales.level2 * 2;  // 1× base (120 → 60px each)
            }
        } else {
            // Normal rocks: Clear halving pattern
            if (fragmentLevel === 0) {
                sizeMultiplier = scales.level0;      // 2× base (e.g., 60 → 120px)
            } else if (fragmentLevel === 1) {
                sizeMultiplier = scales.level1;      // 1× base (120 → 60px)
            } else {
                sizeMultiplier = scales.level2;      // 0.5× base (60 → 30px)
            }
        }
        
        this.width = width * sizeMultiplier;
        this.height = height * sizeMultiplier;
        this.sizeMultiplier = sizeMultiplier; // Store for reference
        
        this.speed = speed;
        
        // Bouncing physics - Using CONFIG values for consistency
        this.velocityX = (Math.random() - 0.5) * 2;
        this.velocityY = speed;
        this.gravity = CONFIG.rock.gravity * (isBoss && fragmentLevel === 0 ? 0.7 : 1);
        this.bounce = CONFIG.rock.bounce;
        this.bounceAngleJitter = CONFIG.rock.bounceAngleJitter || 0;
        this.rotation = 0;
        this.rotationSpeed = (Math.random() - 0.5) * 0.05 / (sizeMultiplier * 0.5); // Larger = slower rotation
        
        // Health scaled by visible size and boss status
        const baseHealth = Math.floor(Math.random() * 20) + 10;
        const healthMultiplier = isBoss ? sizeMultiplier * 1.5 : sizeMultiplier;
        this.health = Math.max(1, Math.floor(baseHealth * healthMultiplier));
        this.maxHealth = this.health;
        
        // Visual properties - natural stone colors
        if (isBoss) {
            this.color = '#5A4FCF';      // Purple for boss
            this.sideColor = '#3E2FA3';
            this.topColor = '#7B70FF';
        } else {
            this.color = '#4A90E2';      // Blue stone
            this.sideColor = '#2E5FA3';
            this.topColor = '#6BB0FF';
        }
        
        // Fragmentation animation state
        this.isSplitting = false;
        this.splitProgress = 0;
        this.splitDuration = 10;
        
        // Impact and visual effects
        this.impactIntensity = 0;
        this.dustTrail = [];
        
        // Generate crack textures for larger rocks
        this.cracks = [];
        if (fragmentLevel < 2) {
            this.generateCracks(sizeMultiplier);
        }
    }
    
    generateCracks(sizeMultiplier) {
        // More cracks on larger rocks, scaled naturally
        const numCracks = Math.floor((2 + Math.floor(Math.random() * 3)) * Math.min(sizeMultiplier, 2));
        for (let i = 0; i < numCracks; i++) {
            this.cracks.push({
                startAngle: Math.random() * Math.PI * 2,
                length: 0.3 + Math.random() * 0.4,
                bend: (Math.random() - 0.5) * 0.5,
                thickness: (1.5 + Math.random() * 1.5) * Math.min(sizeMultiplier * 0.5, 1.5)
            });
        }
    }
    
    update() {
        // Handle splitting animation
        if (this.isSplitting) {
            this.splitProgress++;
            if (this.splitProgress >= this.splitDuration) {
                // Mark for removal after split completes
                return;
            }
        }
        
        // Decay impact flash
        if (this.impactIntensity > 0) {
            this.impactIntensity *= 0.85;
        }
        
        // Generate dust trail for massive boss rocks when falling fast
        if (this.isBoss && this.fragmentLevel === 0 && this.velocityY > 2) {
            if (Math.random() < 0.3) {
                this.dustTrail.push({
                    x: this.x + this.width / 2 + (Math.random() - 0.5) * this.width * 0.5,
                    y: this.y + this.height / 2,
                    vx: (Math.random() - 0.5) * 0.5,
                    vy: (Math.random() - 0.5) * 0.5,
                    life: 20 + Math.random() * 10,
                    maxLife: 30,
                    size: 3 + Math.random() * 4
                });
            }
        }
        
        // Update dust trail particles
        for (let i = this.dustTrail.length - 1; i >= 0; i--) {
            const dust = this.dustTrail[i];
            dust.x += dust.vx;
            dust.y += dust.vy;
            dust.life--;
            if (dust.life <= 0) {
                this.dustTrail.splice(i, 1);
            }
        }
        
        // Apply gravity and advance position
        this.velocityY += this.gravity;
        this.x += this.velocityX;
        this.y += this.velocityY;

        // Update rotation
        this.rotation += this.rotationSpeed;

        // Ground collision and bounce (ground is the top of the dark stripe)
        const groundLevel = CONFIG.canvas.height - 30; // Must match drawBackground()
        if (this.y + this.height >= groundLevel) {
            // Snap to ground to avoid sinking
            this.y = groundLevel - this.height;

            // Only bounce if moving downward
            if (this.velocityY > 0) {
                const vyBefore = this.velocityY;
                // Perfectly elastic if bounce=1, else proportional energy retention
                this.velocityY = -vyBefore * this.bounce;

                // Add a tiny horizontal variation for natural feel
                if (this.bounceAngleJitter !== 0) {
                    this.velocityX += (Math.random() - 0.5) * this.bounceAngleJitter;
                }
                
                // Heavy impact effect for boss rocks
                if (this.isBoss && this.fragmentLevel === 0 && Math.abs(vyBefore) > 3) {
                    this.impactIntensity = 1.0;
                    createGroundImpact(this.x + this.width / 2, groundLevel, this.width / 30);
                }

                // Play bounce sound
                playSound('bounce');
            }
        }

        // Top boundary collision to keep rocks in-bounds
        if (this.y < 0) {
            this.y = 0;
            if (this.velocityY < 0) {
                this.velocityY = -this.velocityY * this.bounce;
            }
        }

        // Walls: reflect X with same bounce coefficient
        if (this.x < 0) {
            this.x = 0;
            this.velocityX = -this.velocityX * this.bounce;
        } else if (this.x + this.width > CONFIG.canvas.width) {
            this.x = CONFIG.canvas.width - this.width;
            this.velocityX = -this.velocityX * this.bounce;
        }
    }
    
    draw() {
        ctx.save();
        
        // Draw dust trail for massive rocks
        for (const dust of this.dustTrail) {
            const alpha = dust.life / dust.maxLife;
            ctx.fillStyle = `rgba(180, 180, 180, ${alpha * 0.3})`;
            ctx.beginPath();
            ctx.arc(dust.x, dust.y, dust.size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Motion blur effect for fast-moving boss rocks
        if (this.isBoss && this.fragmentLevel === 0 && Math.abs(this.velocityY) > 3) {
            ctx.globalAlpha = 0.3;
            for (let i = 1; i <= 3; i++) {
                ctx.save();
                ctx.translate(
                    this.x + this.width / 2 - this.velocityX * i * 2,
                    this.y + this.height / 2 - this.velocityY * i * 2
                );
                ctx.rotate(this.rotation - this.rotationSpeed * i);
                this.drawHexagon(0.7);
                ctx.restore();
            }
            ctx.globalAlpha = 1.0;
        }
        
        // Move to rock center for rotation
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.rotate(this.rotation);
        
        // Splitting animation - scale and shake
        if (this.isSplitting) {
            const progress = this.splitProgress / this.splitDuration;
            const scale = 1 + progress * 0.4; // Expand during split
            const shake = Math.sin(progress * Math.PI * 8) * 5; // Intense shake
            ctx.scale(scale, scale);
            ctx.translate(shake, shake);
        }
        
        // Draw main hexagon
        this.drawHexagon(1.0);
        
        // Draw crack textures - naturally scaled to rock size
        if (this.cracks.length > 0) {
            const size = this.width / 2;
            
            // Crack color varies with rock type
            ctx.strokeStyle = this.isBoss ? 'rgba(30, 15, 79, 0.5)' : 'rgba(0, 0, 0, 0.4)';
            
            for (const crack of this.cracks) {
                ctx.lineWidth = crack.thickness;
                ctx.beginPath();
                
                // Start point (near center)
                const startX = Math.cos(crack.startAngle) * size * 0.3;
                const startY = Math.sin(crack.startAngle) * size * 0.3;
                ctx.moveTo(startX, startY);
                
                // Mid point (curved path)
                const midX = Math.cos(crack.startAngle + crack.bend) * size * 0.6;
                const midY = Math.sin(crack.startAngle + crack.bend) * size * 0.6;
                
                // End point (extends to edge)
                const endX = Math.cos(crack.startAngle + crack.bend * 2) * size * crack.length;
                const endY = Math.sin(crack.startAngle + crack.bend * 2) * size * crack.length;
                
                ctx.quadraticCurveTo(midX, midY, endX, endY);
                ctx.stroke();
                
                // Add small crack branches for realism on larger rocks
                if (this.sizeMultiplier >= 1.5 && Math.random() > 0.5) {
                    const branchX = midX + (Math.random() - 0.5) * size * 0.2;
                    const branchY = midY + (Math.random() - 0.5) * size * 0.2;
                    ctx.lineWidth = crack.thickness * 0.6;
                    ctx.beginPath();
                    ctx.moveTo(midX, midY);
                    ctx.lineTo(branchX, branchY);
                    ctx.stroke();
                }
            }
        }
        
        // Impact flash on ground collision
        if (this.impactIntensity > 0) {
            ctx.shadowBlur = 20 * this.impactIntensity;
            ctx.shadowColor = this.isBoss ? '#9D8FFF' : '#6BB0FF';
        }
        
        ctx.restore();
    }
    
    drawHexagon(opacity = 1.0) {
        const size = this.width / 2;
        
        // Draw hexagon body
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i;
            const px = Math.cos(angle) * size;
            const py = Math.sin(angle) * size;
            if (i === 0) {
                ctx.moveTo(px, py);
            } else {
                ctx.lineTo(px, py);
            }
        }
        ctx.closePath();
        
        // Natural stone gradient with realistic lighting (top-left light source)
        const gradient = ctx.createLinearGradient(-size * 0.8, -size * 0.8, size * 0.8, size * 0.8);
        
        if (this.isBoss) {
            // Boss rocks: Purple with enhanced depth
            gradient.addColorStop(0, this.topColor);        // Bright highlight
            gradient.addColorStop(0.25, this.color);        // Main color
            gradient.addColorStop(0.6, this.sideColor);     // Shadow transition
            gradient.addColorStop(1, '#1A0F4F');            // Deep shadow
            ctx.shadowBlur = 12 * Math.min(this.sizeMultiplier, 2);
            ctx.shadowColor = this.color;
        } else {
            // Normal rocks: Blue stone with natural shading
            gradient.addColorStop(0, this.topColor);        // Light area (top-left)
            gradient.addColorStop(0.3, this.color);         // Mid-tone
            gradient.addColorStop(0.7, this.sideColor);     // Shadow area
            gradient.addColorStop(1, '#1E3F6F');            // Deep shadow (bottom-right)
        }
        
        ctx.globalAlpha = opacity;
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Border with size-appropriate thickness
        ctx.strokeStyle = this.sideColor;
        ctx.lineWidth = Math.max(2, Math.min(4, this.sizeMultiplier * 1.5));
        ctx.stroke();
        
        // Add subtle texture variation spots for natural stone appearance
        if (this.fragmentLevel < 2) {
            ctx.globalAlpha = opacity * 0.15;
            for (let i = 0; i < Math.floor(3 * this.sizeMultiplier); i++) {
                const spotX = (Math.random() - 0.5) * size * 1.2;
                const spotY = (Math.random() - 0.5) * size * 1.2;
                const spotSize = size * (0.05 + Math.random() * 0.1);
                
                ctx.fillStyle = Math.random() > 0.5 ? '#000000' : '#FFFFFF';
                ctx.beginPath();
                ctx.arc(spotX, spotY, spotSize, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = opacity;
        }
        
        // Draw health number in center
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#FFFFFF';
        
        // Font size scales naturally with rock size
        const fontSize = Math.max(12, size * 0.7);
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Outline thickness scales with size
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = Math.max(2, fontSize * 0.08);
        ctx.strokeText(this.health.toString(), 0, 0);
        ctx.fillText(this.health.toString(), 0, 0);
        
        ctx.globalAlpha = 1.0;
    }
    
    // Check if rock is destroyed (health <= 0)
    isDestroyed() {
        return this.health <= 0;
    }
    
    // Damage rock (reduce health by 1)
    hit() {
        this.health--;
        // Flash effect when hit
        this.color = '#FF6B35';
        setTimeout(() => {
            this.color = '#4A90E2';
        }, 100);
    }
    
    isOffScreen() {
        // Rock stays on screen when bouncing
        return false; // Never goes off screen with bouncing
    }
}

// PowerUp Class
class PowerUp {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.width = CONFIG.powerup.width;
        this.height = CONFIG.powerup.height;
        this.speed = CONFIG.powerup.speed;
        this.type = type;
        
        if (type === 'shield') {
            this.color = CONFIG.powerup.types.shield.color;
            this.symbol = CONFIG.powerup.types.shield.symbol;
        } else {
            this.color = CONFIG.powerup.types.doubleFire.color;
            this.symbol = CONFIG.powerup.types.doubleFire.symbol;
        }
        
        this.floatOffset = 0;
        this.floatSpeed = 0.1;
    }
    
    update() {
        this.y += this.speed;
        this.floatOffset += this.floatSpeed;
    }
    
    draw() {
        const floatX = Math.sin(this.floatOffset) * 3;
        
        ctx.shadowBlur = 20;
        ctx.shadowColor = this.color;
        
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
        ctx.fillRect(this.x + floatX, this.y, this.width, this.height);
        
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x + floatX, this.y, this.width, this.height);
        
        ctx.shadowBlur = 0;
        
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
            this.symbol,
            this.x + floatX + this.width / 2,
            this.y + this.height / 2
        );
        
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
    }
    
    isOffScreen() {
        return this.y > CONFIG.canvas.height;
    }
}

// Game Arrays
const rocks = [];
const fireballs = [];
const powerups = [];
const explosionParticles = [];

// Input handling
const keys = {};

// Initialize Canvas
function initCanvas() {
    try {
        canvas = document.getElementById('gameCanvas');
        
        if (!canvas) {
            console.error('❌ Canvas element not found!');
            alert('ERROR: Canvas element "gameCanvas" not found in HTML!');
            return false;
        }
        
        ctx = canvas.getContext('2d');
        
        if (!ctx) {
            console.error('❌ Could not get 2D context!');
            alert('ERROR: Could not get canvas 2D context!');
            return false;
        }
        
        CONFIG.canvas.width = canvas.width;
        CONFIG.canvas.height = canvas.height;
        
        console.log('✅ Canvas initialized:', canvas.width, 'x', canvas.height);
        return true;
        
    } catch (error) {
        console.error('❌ Error initializing canvas:', error);
        alert('ERROR: ' + error.message);
        return false;
    }
}

// Initialize Game
function init() {
    console.log('🎮 Initializing game...');
    
    // Initialize canvas first
    if (!initCanvas()) {
        console.error('❌ Failed to initialize canvas!');
        return;
    }
    
    // Initialize audio system (load all sound effects)
    initSounds();
    
    // Initialize player position (center bottom of screen)
    player.x = CONFIG.canvas.width / 2 - CONFIG.player.width / 2;
    player.y = CONFIG.canvas.height - CONFIG.player.height - 20;
    
    console.log('✅ Player initialized at:', player.x, player.y);
    
    // ============================================
    // SETUP TOUCH CONTROLS - Canvas-specific to allow page scrolling
    // ============================================
    setupTouchControls();
    
    // Spawn initial rocks to start the game
    spawnInitialRocks();
    
    console.log('✅ Game initialized successfully!');
    console.log('▶️ Starting game loop...');
    
    // Start the main game loop
    gameLoop();
}

// Setup Touch Event Listeners (called after canvas is initialized)
function setupTouchControls() {
    if (!canvas) {
        console.warn('⚠️ Canvas not initialized - touch controls not set up');
        return;
    }
    
    // Touch Start - Finger touches screen (canvas only)
    canvas.addEventListener('touchstart', (e) => {
        if (!gameState.isGameOver) {
            e.preventDefault(); // Prevent page scrolling during gameplay
            isTouching = true;
            mouseX = getCanvasPosition(e); // Set touch position
        } else {
            // Game over - check if restart button was tapped
            if (e.touches && e.touches.length > 0) {
                const touch = e.touches[0];
                if (checkRestartButtonClick(touch.clientX, touch.clientY)) {
                    e.preventDefault();
                    console.log('📱 Restart button tapped!');
                    restartGame();
                }
            }
        }
    }, { passive: false });

    // Touch Move - Finger drags across screen (canvas only)
    canvas.addEventListener('touchmove', (e) => {
        if (!gameState.isGameOver) {
            e.preventDefault(); // Prevent page scrolling during gameplay
            mouseX = getCanvasPosition(e); // Update touch position
        }
    }, { passive: false });

    // Touch End - Finger lifts off screen (canvas only)
    canvas.addEventListener('touchend', (e) => {
        if (!gameState.isGameOver) {
            e.preventDefault();
            isTouching = false;
        }
        // Keep last position so player doesn't snap back
        // Set mouseX = null here if you want player to stop when finger lifts
        // mouseX = null;
    }, { passive: false });
    
    console.log('✅ Touch controls initialized (canvas-specific)');
}

// Game Loop
function gameLoop() {
    try {
        if (gameState.isRunning && !gameState.isGameOver) {
            update();
            updateExplosionParticles();
        }
        
        render();
        
    } catch (error) {
        console.error('❌ Error in game loop:', error);
        gameState.isRunning = false;
        alert('Game Error: ' + error.message);
    }
    
    requestAnimationFrame(gameLoop);
}

// Update
function update() {
    // Increment game time counter (used for timers and difficulty)
    gameState.gameTime++;
    
    // Update difficulty progression (speed and spawn rate)
    updateDifficulty();
    
    // Move player based on keyboard input
    player.move();
    
    // Decrease shoot cooldown timer if active
    if (gameState.shootCooldown > 0) {
        gameState.shootCooldown--;
    }
    
    // ----------------------------------------
    // AUTOMATIC FIRE SYSTEM - Shoots continuously without spacebar
    // ----------------------------------------
    
    // Automatically shoot fireballs when cooldown expires (no button press needed!)
    if (!gameState.isGameOver && gameState.shootCooldown <= 0) {
        shootFireball(); // Fire a fireball automatically every cooldown period
    }
    
    // Update all game objects
    updateFireballs();
    updateRocks();
    updatePowerUps();
    
    // Check for collisions between objects
    checkCollisions();
    checkPlayerCollision();
    checkPowerUpCollision();
    
    // Update power-up timers
    updatePowerUpTimers();
    
    // Spawn new rocks and power-ups
    spawnRocks();
    spawnPowerUps();
}

// Update Difficulty
function updateDifficulty() {
    gameState.difficultyTimer++;
    
    if (gameState.difficultyTimer >= CONFIG.difficulty.increaseInterval) {
        gameState.difficultyTimer = 0;
        
        gameState.currentSpawnRate -= CONFIG.difficulty.spawnRateDecrease;
        if (gameState.currentSpawnRate < CONFIG.rock.minSpawnRate) {
            gameState.currentSpawnRate = CONFIG.rock.minSpawnRate;
        }
        
        gameState.currentSpeedBonus += CONFIG.difficulty.speedIncrease;
        if (gameState.currentSpeedBonus > CONFIG.difficulty.maxSpeedBonus) {
            gameState.currentSpeedBonus = CONFIG.difficulty.maxSpeedBonus;
        }
        
        console.log(`⚠️ Difficulty increased! Spawn: ${gameState.currentSpawnRate}, Speed: +${gameState.currentSpeedBonus.toFixed(1)}`);
    }
    
    const newLevel = Math.floor(gameState.score / CONFIG.difficulty.scorePerLevel) + 1;
    if (newLevel > gameState.level) {
        gameState.level = newLevel;
        console.log(`🎉 Level ${gameState.level}!`);
    }
}

// Update Fireballs
function updateFireballs() {
    for (let i = fireballs.length - 1; i >= 0; i--) {
        fireballs[i].update();
        if (fireballs[i].isOffScreen()) {
            fireballs.splice(i, 1);
        }
    }
}

// Update Rocks
function updateRocks() {
    for (let i = rocks.length - 1; i >= 0; i--) {
        rocks[i].update();
        if (rocks[i].isOffScreen()) {
            rocks.splice(i, 1);
        }
    }
}

// Update PowerUps
function updatePowerUps() {
    for (let i = powerups.length - 1; i >= 0; i--) {
        powerups[i].update();
        if (powerups[i].isOffScreen()) {
            powerups.splice(i, 1);
        }
    }
}

// Spawn Rocks in Waves
function spawnRocks() {
    // Check if all rocks are destroyed and no wave is active
    if (rocks.length === 0 && !gameState.waveActive) {
        // Start new wave
        console.log(`🌊 Starting Wave ${gameState.waveNumber}!`);
        gameState.waveActive = true;
        
        // Calculate number of rocks for this wave (increases with wave number)
        const rocksToSpawn = gameState.rocksPerWave + Math.floor(gameState.waveNumber / 2);
        
        // Spawn all rocks for this wave
        for (let i = 0; i < rocksToSpawn; i++) {
            // Stagger spawn positions to avoid overlap
            setTimeout(() => {
                createRock();
            }, i * 200); // 200ms delay between each rock spawn
        }
        
        // Increment wave number for next wave
        gameState.waveNumber++;
    }
    
    // Mark wave as inactive when all rocks are destroyed
    if (rocks.length === 0 && gameState.waveActive) {
        gameState.waveActive = false;
    }
}

// Create Rock
function createRock() {
    const width = CONFIG.rock.minWidth + Math.random() * (CONFIG.rock.maxWidth - CONFIG.rock.minWidth);
    const height = CONFIG.rock.minHeight + Math.random() * (CONFIG.rock.maxHeight - CONFIG.rock.minHeight);
    const x = Math.random() * (CONFIG.canvas.width - width);
    const y = -height;
    const baseSpeed = CONFIG.rock.speed + Math.random() * CONFIG.rock.speedVariation;
    const speed = baseSpeed + gameState.currentSpeedBonus;
    
    // 15% chance to spawn a boss rock (massive 4x size) - higher chance on later waves
    const bossChance = Math.min(0.15 + (gameState.waveNumber * 0.02), 0.35);
    const isBoss = Math.random() < bossChance;
    
    if (isBoss) {
        console.log('👑 BOSS ROCK SPAWNED! Massive 4x scale!');
    }
    
    rocks.push(new Rock(x, y, width, height, speed, 0, isBoss));
}

// Spawn Initial Rocks (First Wave)
function spawnInitialRocks() {
    // Start with first wave
    gameState.waveNumber = 1;
    gameState.waveActive = true;
    
    const count = gameState.rocksPerWave;
    
    for (let i = 0; i < count; i++) {
        const width = CONFIG.rock.minWidth + Math.random() * (CONFIG.rock.maxWidth - CONFIG.rock.minWidth);
        const height = CONFIG.rock.minHeight + Math.random() * (CONFIG.rock.maxHeight - CONFIG.rock.minHeight);
        const x = Math.random() * (CONFIG.canvas.width - width);
        const y = -height - (i * 150);
        const speed = CONFIG.rock.speed + Math.random() * CONFIG.rock.speedVariation;
        
        rocks.push(new Rock(x, y, width, height, speed));
    }
    
    console.log(`✅ Spawned Wave 1 with ${count} rocks`);
}

// Spawn PowerUps
function spawnPowerUps() {
    gameState.powerupSpawnTimer++;
    
    if (gameState.powerupSpawnTimer >= CONFIG.powerup.spawnRate) {
        gameState.powerupSpawnTimer = 0;
        
        if (Math.random() < 0.5) {
            createPowerUp();
        }
    }
}

// Create PowerUp
function createPowerUp() {
    const x = Math.random() * (CONFIG.canvas.width - CONFIG.powerup.width);
    const y = -CONFIG.powerup.height;
    const type = Math.random() < 0.5 ? 'shield' : 'doubleFire';
    
    powerups.push(new PowerUp(x, y, type));
    console.log(`Power-up spawned: ${type}`);
}

// Check Collisions
function checkCollisions() {
    for (let i = fireballs.length - 1; i >= 0; i--) {
        const fireball = fireballs[i];
        
        for (let j = rocks.length - 1; j >= 0; j--) {
            const rock = rocks[j];
            
            if (isColliding(fireball, rock)) {
                handleRockDestruction(rock, fireball, i, j);
                break;
            }
        }
    }
}

// Check Player Collision
function checkPlayerCollision() {
    // Loop through all rocks to check if any hit the player
    for (let i = 0; i < rocks.length; i++) {
        const rock = rocks[i];
        
        // Check if player and rock are overlapping (collision detected)
        if (isColliding(player, rock)) {
            // Check if player has shield power-up active
            if (gameState.hasShield) {
                // Shield absorbs the hit - remove shield and destroy the rock
                gameState.hasShield = false; // Deactivate shield
                rocks.splice(i, 1); // Remove the rock from array
                
                // Create visual effect for shield breaking
                createShieldBreakEffect(player.x + player.width / 2, player.y + player.height / 2);
                
                // Play shield break sound effect
                playSound('shield');
                
                console.log('🛡️ Shield absorbed hit!');
                break; // Exit loop after handling collision
            } else {
                // No shield - player dies, trigger GAME OVER
                console.log('💀 Rock touched player - GAME OVER!');
                handleGameOver(rock);
                break; // Exit loop after game over
            }
        }
    }
}

// Check PowerUp Collision
function checkPowerUpCollision() {
    // Loop through all power-ups on screen
    for (let i = powerups.length - 1; i >= 0; i--) {
        const powerup = powerups[i];
        
        // Check if player touches the power-up
        if (isColliding(player, powerup)) {
            // Activate the power-up effect (shield or double-fire)
            activatePowerUp(powerup.type);
            
            // Create visual effect at collection point
            createCollectionEffect(powerup.x + powerup.width / 2, powerup.y + powerup.height / 2, powerup.color);
            
            // Play power-up collection sound
            playSound('powerup');
            
            // Remove power-up from the screen
            powerups.splice(i, 1);
        }
    }
}

// Is Colliding
function isColliding(obj1, obj2) {
    return obj1.x < obj2.x + obj2.width &&
           obj1.x + obj1.width > obj2.x &&
           obj1.y < obj2.y + obj2.height &&
           obj1.y + obj1.height > obj2.y;
}

// Handle Rock Destruction with Multi-Stage Fragmentation
function handleRockDestruction(rock, fireball, fireballIndex, rockIndex) {
    // Hit the rock (reduce health by 1)
    rock.hit();
    
    // Remove fireball
    fireballs.splice(fireballIndex, 1);
    
    // Check if rock is destroyed (health <= 0)
    if (rock.isDestroyed()) {
        // Calculate points based on original health
        const pointsEarned = rock.maxHealth; // Points equal to starting number
        
        // Add points to score and increment rocks destroyed counter
        gameState.score += pointsEarned;
        gameState.rocksDestroyed++;
        
        // FRAGMENTATION SYSTEM: Split into smaller pieces or final explosion
        if (rock.fragmentLevel === 0) {
            // LARGE ROCK → Split into 2 MEDIUM rocks
            fragmentRock(rock, rockIndex);
        } else if (rock.fragmentLevel === 1) {
            // MEDIUM ROCK → Final disintegration (no more tiny rocks!)
            createFinalDisintegration(rock.x + rock.width / 2, rock.y + rock.height / 2);
            rocks.splice(rockIndex, 1);
        } else {
            // Fallback - should not reach here anymore
            createFinalDisintegration(rock.x + rock.width / 2, rock.y + rock.height / 2);
            rocks.splice(rockIndex, 1);
        }
        
        // Play explosion sound effect
        playSound('explosion');
        
        console.log(`💥 Rock destroyed! Fragment level: ${rock.fragmentLevel}, +${pointsEarned} points`);
    } else {
        // Rock still alive, show hit with small particles
        createHitEffect(rock.x + rock.width / 2, rock.y + rock.height / 2);
        console.log(`🎯 Rock hit! Health: ${rock.health}`);
    }
}

// Fragment rock into smaller pieces with realistic physics
function fragmentRock(rock, rockIndex) {
    const centerX = rock.x + rock.width / 2;
    const centerY = rock.y + rock.height / 2;
    
    // Trigger splitting animation
    rock.isSplitting = true;
    rock.splitProgress = 0;
    
    // Enhanced effects for boss rocks
    const effectScale = rock.isBoss ? (rock.fragmentLevel === 0 ? 3 : 2) : 1;
    
    // Create massive shockwave for boss rocks
    createShockwave(centerX, centerY, effectScale);
    
    // Create enhanced dust cloud at breakup point
    createDustCloud(centerX, centerY, rock.fragmentLevel, effectScale);
    
    // Calculate fragment size (half the original)
    const newWidth = rock.baseWidth;
    const newHeight = rock.baseHeight;
    const nextLevel = rock.fragmentLevel + 1;
    
    // Stronger separation force for boss rocks and smaller fragments
    const baseSeparation = rock.isBoss ? 6 : 4;
    const separationForce = baseSeparation + rock.fragmentLevel * 2;
    
    // Create 2 fragments flying apart with physics
    // Fragment 1 - flies left and up
    const fragment1 = new Rock(
        centerX - newWidth / 2 - 10,
        centerY - newHeight / 2,
        newWidth,
        newHeight,
        rock.speed * 0.7, // Slower initial fall
        nextLevel,
        rock.isBoss // Inherit boss status
    );
    fragment1.velocityX = -separationForce + (Math.random() - 0.5) * 2;
    fragment1.velocityY = -(4 + effectScale) - Math.random() * 2; // Stronger launch for boss
    fragment1.rotationSpeed = (Math.random() - 0.5) * 0.15; // Spin
    
    // Fragment 2 - flies right and up
    const fragment2 = new Rock(
        centerX - newWidth / 2 + 10,
        centerY - newHeight / 2,
        newWidth,
        newHeight,
        rock.speed * 0.7,
        nextLevel,
        rock.isBoss
    );
    fragment2.velocityX = separationForce + (Math.random() - 0.5) * 2;
    fragment2.velocityY = -(4 + effectScale) - Math.random() * 2;
    fragment2.rotationSpeed = (Math.random() - 0.5) * 0.15;
    
    // Add flying debris particles
    createFragmentDebris(centerX, centerY, rock.fragmentLevel, effectScale);
    
    // Camera shake for massive boss splits
    if (rock.isBoss && rock.fragmentLevel === 0) {
        // TODO: Add screen shake here if needed
    }
    
    // Remove original rock and add fragments
    rocks.splice(rockIndex, 1);
    rocks.push(fragment1, fragment2);
}

// Create small hit effect (when rock is damaged but not destroyed)
function createHitEffect(x, y) {
    for (let i = 0; i < 5; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 2;
        
        explosionParticles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 15,
            maxLife: 15,
            size: 2,
            color: '#FFD700'
        });
    }
}

// Create shockwave pulse effect on rock split
function createShockwave(x, y, scale = 1) {
    const count = Math.floor(20 * scale);
    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count;
        const speed = (3 + Math.random() * 2) * scale;
        
        explosionParticles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: Math.floor(12 * scale),
            maxLife: Math.floor(12 * scale),
            size: (2 + Math.random()) * scale,
            color: scale > 2 ? 'rgba(157, 143, 255, 0.9)' : 'rgba(100, 200, 255, 0.8)', // Purple for boss
            type: 'shockwave'
        });
    }
}

// Create dust cloud on fragmentation
function createDustCloud(x, y, fragmentLevel, scale = 1) {
    const dustCount = Math.floor((15 + fragmentLevel * 5) * scale);
    
    for (let i = 0; i < dustCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = (0.5 + Math.random() * 1.5) * scale;
        
        explosionParticles.push({
            x: x + (Math.random() - 0.5) * 20 * scale,
            y: y + (Math.random() - 0.5) * 20 * scale,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 0.5,
            life: Math.floor((25 + Math.random() * 15) * scale),
            maxLife: Math.floor(40 * scale),
            size: (3 + Math.random() * 4) * scale,
            color: 'rgba(150, 150, 150, 0.6)',
            type: 'dust'
        });
    }
}

// Create flying debris particles on split
function createFragmentDebris(x, y, fragmentLevel, scale = 1) {
    const debrisCount = Math.floor((8 + fragmentLevel * 3) * scale);
    
    for (let i = 0; i < debrisCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = (2 + Math.random() * 3) * scale;
        
        explosionParticles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 1,
            life: Math.floor((20 + Math.random() * 15) * scale),
            maxLife: Math.floor(35 * scale),
            size: (1.5 + Math.random() * 2.5) * scale,
            color: scale > 2 ? '#8070C0' : '#A0A0A0', // Purple-gray for boss debris
            gravity: 0.1,
            type: 'debris'
        });
    }
}

// Ground impact effect for massive boss rocks
function createGroundImpact(x, y, intensity) {
    // Dust burst radiating outward
    for (let i = 0; i < 15 * intensity; i++) {
        const angle = -Math.PI * 0.5 + (Math.random() - 0.5) * Math.PI; // Upward arc
        const speed = 2 + Math.random() * 4;
        
        explosionParticles.push({
            x: x + (Math.random() - 0.5) * 40 * intensity,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 30,
            maxLife: 30,
            size: (2 + Math.random() * 3) * intensity,
            color: 'rgba(160, 140, 100, 0.7)',
            gravity: 0.12,
            type: 'dust'
        });
    }
    
    // Ground debris chunks
    for (let i = 0; i < 8 * intensity; i++) {
        explosionParticles.push({
            x: x + (Math.random() - 0.5) * 30 * intensity,
            y: y - 5,
            vx: (Math.random() - 0.5) * 4,
            vy: -2 - Math.random() * 3,
            life: 25,
            maxLife: 25,
            size: (2 + Math.random() * 2) * intensity,
            color: '#6B5B3C',
            gravity: 0.15,
            type: 'debris'
        });
    }
}

// Final disintegration - dust, sparks, and glowing embers
function createFinalDisintegration(x, y) {
    // Dust burst
    for (let i = 0; i < 30; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 2;
        
        explosionParticles.push({
            x: x + (Math.random() - 0.5) * 15,
            y: y + (Math.random() - 0.5) * 15,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 1,
            life: 30 + Math.random() * 20,
            maxLife: 50,
            size: 2 + Math.random() * 3,
            color: 'rgba(180, 180, 180, 0.7)',
            type: 'dust'
        });
    }
    
    // Glowing embers
    for (let i = 0; i < 15; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 3;
        
        explosionParticles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 2,
            life: 35,
            maxLife: 35,
            size: 2 + Math.random() * 2,
            color: '#FFD700', // Glowing gold
            glow: true,
            gravity: 0.08,
            type: 'ember'
        });
    }
    
    // Fast sparks
    for (let i = 0; i < 20; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 4 + Math.random() * 4;
        
        explosionParticles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 15,
            maxLife: 15,
            size: 1.5,
            color: '#FFF8DC', // Bright white-yellow spark
            type: 'spark'
        });
    }
    
    // Smoke fade-out
    for (let i = 0; i < 10; i++) {
        explosionParticles.push({
            x: x + (Math.random() - 0.5) * 20,
            y: y,
            vx: (Math.random() - 0.5) * 0.5,
            vy: -0.5 - Math.random() * 0.5,
            life: 40 + Math.random() * 20,
            maxLife: 60,
            size: 6 + Math.random() * 8,
            color: 'rgba(100, 100, 100, 0.4)',
            type: 'smoke',
            expanding: true
        });
    }
}

// Handle Game Over
function handleGameOver(rock) {
    // Set game over flag to stop the game loop
    gameState.isGameOver = true;
    
    // ============================================
    // UNLOCK MOUSE POINTER - Allow UI interaction
    // ============================================
    // Exit pointer lock so player can click restart button
    if (document.pointerLockElement) {
        document.exitPointerLock();
        console.log('🔓 Mouse unlocked for Game Over UI');
    }
    
    // Show mouse cursor on game over screen for button interaction
    const canvas = document.getElementById('gameCanvas');
    if (canvas) {
        canvas.style.cursor = 'default'; // Restore default cursor
    }
    
    // Create large explosion effect at player's position
    createPlayerExplosion(player.x + player.width / 2, player.y + player.height / 2);
    
    // Play game over sound effect
    playSound('gameOver');
    
    console.log('💀 GAME OVER! Score:', gameState.score);
}

// Create Explosion
function createExplosion(x, y) {
    // Create 15 particles in a circle pattern for rock explosion
    for (let i = 0; i < 15; i++) {
        // Calculate angle for even distribution around circle
        const angle = (Math.PI * 2 * i) / 15;
        
        // Randomize speed for more natural explosion
        const speed = 2 + Math.random() * 2;
        
        // Create particle object with physics properties
        explosionParticles.push({
            x: x, // Starting X position (center of explosion)
            y: y, // Starting Y position (center of explosion)
            vx: Math.cos(angle) * speed, // Velocity X (horizontal speed)
            vy: Math.sin(angle) * speed, // Velocity Y (vertical speed)
            life: 35, // Current lifetime in frames
            maxLife: 35, // Maximum lifetime before particle disappears
            size: 3 + Math.random() * 3, // Random size between 3-6 pixels
            color: '#FFD700' // Gold color for rock explosions
        });
    }
    
    // Add extra random particles for more visual impact
    for (let i = 0; i < 10; i++) {
        const angle = Math.random() * Math.PI * 2; // Random angle
        const speed = 1 + Math.random() * 3; // Random speed
        
        explosionParticles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 25,
            maxLife: 25,
            size: 2 + Math.random() * 2,
            color: '#FF8C00' // Orange accent color
        });
    }
}

// Create Player Explosion
function createPlayerExplosion(x, y) {
    for (let i = 0; i < 20; i++) {
        const angle = (Math.PI * 2 * i) / 20;
        const speed = 2 + Math.random() * 3;
        explosionParticles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 60,
            maxLife: 60,
            size: 5 + Math.random() * 3,
            color: '#FF6B35'
        });
    }
    
    for (let i = 0; i < 10; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 3 + Math.random() * 4;
        explosionParticles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 40,
            maxLife: 40,
            size: 6,
            color: '#FFFFFF'
        });
    }
}

// Create Shield Break Effect
function createShieldBreakEffect(x, y) {
    for (let i = 0; i < 16; i++) {
        const angle = (Math.PI * 2 * i) / 16;
        const speed = 3 + Math.random() * 2;
        explosionParticles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 50,
            maxLife: 50,
            size: 4,
            color: '#00FFFF'
        });
    }
}

// Create Collection Effect
function createCollectionEffect(x, y, color) {
    for (let i = 0; i < 12; i++) {
        const angle = (Math.PI * 2 * i) / 12;
        const speed = 2 + Math.random() * 2;
        explosionParticles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 40,
            maxLife: 40,
            size: 3,
            color: color
        });
    }
}

// Update Explosion Particles
function updateExplosionParticles() {
    for (let i = explosionParticles.length - 1; i >= 0; i--) {
        const particle = explosionParticles[i];
        
        // Update position
        particle.x += particle.vx;
        particle.y += particle.vy;
        
        // Apply gravity for debris and embers
        if (particle.gravity) {
            particle.vy += particle.gravity;
        } else {
            particle.vy += 0.1; // Default gravity
        }
        
        // Air resistance
        particle.vx *= 0.98;
        
        // Expanding smoke effect
        if (particle.expanding && particle.type === 'smoke') {
            particle.size += 0.15; // Smoke expands
        }
        
        // Decrease lifetime
        particle.life--;
        
        // Remove dead particles
        if (particle.life <= 0) {
            explosionParticles.splice(i, 1);
        }
    }
}

// Activate PowerUp
function activatePowerUp(type) {
    if (type === 'shield') {
        gameState.hasShield = true;
        gameState.score += 5;
        console.log('🛡️ Shield activated!');
    } else if (type === 'doubleFire') {
        gameState.doubleFire = true;
        gameState.doubleFireTimer = CONFIG.powerup.doubleFireDuration;
        gameState.score += 5;
        console.log('⚡ Double Fire activated!');
    }
}

// Update PowerUp Timers
function updatePowerUpTimers() {
    if (gameState.doubleFire && gameState.doubleFireTimer > 0) {
        gameState.doubleFireTimer--;
        if (gameState.doubleFireTimer <= 0) {
            gameState.doubleFire = false;
            console.log('⚡ Double Fire expired');
        }
    }
}

// Shoot Fireball
function shootFireball() {
    // Check if cooldown has expired (player can shoot again)
    if (gameState.shootCooldown <= 0) {
        // Check if double-fire power-up is active
        if (gameState.doubleFire) {
            // Shoot two fireballs (left and right of player)
            
            // Calculate position for left fireball (1/4 from left edge of player)
            const leftX = player.x + (player.width / 4) - (CONFIG.fireball.width / 2);
            
            // Calculate position for right fireball (3/4 from left edge of player)
            const rightX = player.x + (player.width * 3 / 4) - (CONFIG.fireball.width / 2);
            
            // Y position is at player's top edge
            const y = player.y;
            
            // Create two fireball objects and add to array
            fireballs.push(new Fireball(leftX, y));
            fireballs.push(new Fireball(rightX, y));
        } else {
            // Normal single fireball mode
            
            // Calculate center position of player for fireball spawn
            const x = player.x + (player.width / 2) - (CONFIG.fireball.width / 2);
            const y = player.y; // Spawn at top of player
            
            // Create fireball object and add to array
            fireballs.push(new Fireball(x, y));
        }
        
        // Play shooting sound effect
        playSound('shoot');
        
        // Reset cooldown timer to prevent rapid firing
        gameState.shootCooldown = CONFIG.fireball.cooldown;
    }
}

// Render
function render() {
    ctx.clearRect(0, 0, CONFIG.canvas.width, CONFIG.canvas.height);
    
    drawBackground();
    drawRocks();
    drawPowerUps();
    player.draw();
    drawFireballs();
    drawExplosionParticles();
    
    if (gameState.isGameOver) {
        drawGameOver();
    }
    
    drawUI();

    // Optional debug overlays
    if (DEBUG.enabled) {
        drawDebug();
    }
}

// Draw Background
function drawBackground() {
    // Sky gradient (light blue to lighter blue like screenshot)
    const skyGradient = ctx.createLinearGradient(0, 0, 0, CONFIG.canvas.height);
    skyGradient.addColorStop(0, '#87CEEB'); // Light sky blue at top
    skyGradient.addColorStop(0.7, '#B0E0E6'); // Lighter blue
    skyGradient.addColorStop(1, '#E0F6FF'); // Very light blue near ground
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, CONFIG.canvas.width, CONFIG.canvas.height);
    
    // Draw white clouds (simple rounded shapes)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    
    // Cloud 1
    drawCloud(100, 80, 60);
    drawCloud(300, 50, 50);
    drawCloud(500, 100, 70);
    drawCloud(650, 60, 55);
    
    // Mountains/Hills in background (light blue triangular shapes)
    ctx.fillStyle = 'rgba(150, 200, 230, 0.5)';
    ctx.beginPath();
    ctx.moveTo(0, CONFIG.canvas.height - 200);
    ctx.lineTo(200, CONFIG.canvas.height - 350);
    ctx.lineTo(400, CONFIG.canvas.height - 200);
    ctx.fill();
    
    ctx.beginPath();
    ctx.moveTo(300, CONFIG.canvas.height - 200);
    ctx.lineTo(500, CONFIG.canvas.height - 380);
    ctx.lineTo(700, CONFIG.canvas.height - 200);
    ctx.fill();
    
    // Trees (simple green triangles like screenshot)
    drawTree(150, CONFIG.canvas.height - 150, 40, 60);
    drawTree(450, CONFIG.canvas.height - 150, 35, 55);
    drawTree(600, CONFIG.canvas.height - 150, 45, 65);
    
    // Ground (green grass)
    const groundHeight = 100;
    ctx.fillStyle = '#7CB342'; // Grass green
    ctx.fillRect(0, CONFIG.canvas.height - groundHeight, CONFIG.canvas.width, groundHeight);
    
    // Darker green stripe on ground
    ctx.fillStyle = '#558B2F';
    ctx.fillRect(0, CONFIG.canvas.height - 30, CONFIG.canvas.width, 30);
}

// Helper function to draw cloud
function drawCloud(x, y, size) {
    ctx.beginPath();
    ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
    ctx.arc(x + size * 0.4, y, size * 0.6, 0, Math.PI * 2);
    ctx.arc(x + size * 0.8, y, size * 0.5, 0, Math.PI * 2);
    ctx.fill();
}

// Helper function to draw tree
function drawTree(x, y, width, height) {
    // Tree trunk (brown)
    ctx.fillStyle = '#5D4037';
    ctx.fillRect(x - width * 0.15, y, width * 0.3, height * 0.3);
    
    // Tree foliage (green triangle)
    ctx.fillStyle = '#66BB6A';
    ctx.beginPath();
    ctx.moveTo(x, y - height * 0.5);
    ctx.lineTo(x - width * 0.5, y + height * 0.2);
    ctx.lineTo(x + width * 0.5, y + height * 0.2);
    ctx.closePath();
    ctx.fill();
    
    // Darker green for depth
    ctx.fillStyle = '#4CAF50';
    ctx.beginPath();
    ctx.moveTo(x, y - height * 0.3);
    ctx.lineTo(x - width * 0.5, y + height * 0.4);
    ctx.lineTo(x + width * 0.5, y + height * 0.4);
    ctx.closePath();
    ctx.fill();
}

// Draw Rocks
function drawRocks() {
    for (let i = 0; i < rocks.length; i++) {
        rocks[i].draw();
    }
}

// Draw PowerUps
function drawPowerUps() {
    for (let i = 0; i < powerups.length; i++) {
        powerups[i].draw();
    }
}

// Draw Fireballs
function drawFireballs() {
    for (let i = 0; i < fireballs.length; i++) {
        fireballs[i].draw();
    }
}

// Draw Explosion Particles
function drawExplosionParticles() {
    for (let i = 0; i < explosionParticles.length; i++) {
        const particle = explosionParticles[i];
        const opacity = particle.life / particle.maxLife;
        
        ctx.save();
        
        // Different rendering for different particle types
        if (particle.type === 'dust' || particle.type === 'smoke') {
            // Dust and smoke - soft translucent circles
            const dustColor = particle.color || `rgba(150, 150, 150, ${opacity * 0.5})`;
            ctx.fillStyle = dustColor.replace(/[\d.]+\)$/, `${opacity * 0.4})`); // Adjust opacity
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
            
        } else if (particle.type === 'ember' && particle.glow) {
            // Glowing embers with shadow blur
            ctx.shadowBlur = 10;
            ctx.shadowColor = particle.color;
            ctx.fillStyle = particle.color;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
            
            // Bright core
            ctx.shadowBlur = 5;
            ctx.fillStyle = `rgba(255, 255, 200, ${opacity * 0.9})`;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size * 0.5, 0, Math.PI * 2);
            ctx.fill();
            
        } else if (particle.type === 'spark') {
            // Fast bright sparks
            ctx.fillStyle = `rgba(255, 248, 220, ${opacity})`;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
            
        } else if (particle.type === 'shockwave') {
            // Shockwave ring - just outline
            ctx.strokeStyle = `rgba(100, 200, 255, ${opacity * 0.6})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.stroke();
            
        } else if (particle.type === 'debris') {
            // Rock debris - solid chunks
            ctx.fillStyle = `rgba(160, 160, 160, ${opacity})`;
            ctx.fillRect(particle.x - particle.size / 2, particle.y - particle.size / 2, particle.size, particle.size);
            
        } else {
            // Default particle (original explosion style)
            ctx.fillStyle = `rgba(255, 215, 0, ${opacity})`;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.8})`;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size / 2, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }
}

// Draw UI
// ============================================
// ENHANCED UI SYSTEM - Game Interface Drawing
// ============================================

// Draw UI - Main game interface display
function drawUI() {
    // Save context state for proper rendering
    ctx.save();
    ctx.textAlign = 'left';
    
    // ----------------------------------------
    // TOP-LEFT: SCORE PANEL (Main display)
    // ----------------------------------------
    
    // Draw semi-transparent background panel for score area
    drawUIPanel(10, 10, 200, 80, 'rgba(0, 0, 0, 0.6)');
    
    // Display SCORE - Large, gold text with black outline
    ctx.font = 'bold 28px Arial';
    ctx.fillStyle = '#FFD700'; // Gold color
    ctx.strokeStyle = '#000000'; // Black outline
    ctx.lineWidth = 4; // Thick outline for readability
    ctx.strokeText(`SCORE: ${gameState.score}`, 20, 40); // Draw outline
    ctx.fillText(`SCORE: ${gameState.score}`, 20, 40); // Draw filled text
    
    // Display LEVEL - Medium size, white text
    ctx.font = 'bold 20px Arial';
    ctx.fillStyle = '#ffffff'; // White color
    ctx.lineWidth = 3;
    ctx.strokeText(`Level: ${gameState.level}`, 20, 70); // Draw outline
    ctx.fillText(`Level: ${gameState.level}`, 20, 70); // Draw filled text
    
    // Only show detailed stats when game is running (not game over)
    if (!gameState.isGameOver) {
        
        // ----------------------------------------
        // TOP-LEFT: GAME STATISTICS PANEL
        // ----------------------------------------
        
        // Draw background panel for game stats
        drawUIPanel(10, 100, 200, 160, 'rgba(0, 0, 0, 0.5)');
        
        ctx.font = '15px Arial'; // Standard size for stats
        
        // Wave Number - Cyan text
        ctx.fillStyle = '#00FFFF';
        ctx.fillText(`🌊 Wave: ${gameState.waveNumber - 1}`, 20, 125);
        
        // Rocks Destroyed counter - Green text
        ctx.fillStyle = '#00FF00';
        ctx.fillText(`� Destroyed: ${gameState.rocksDestroyed}`, 20, 150);
        
        // Active rocks count - Brown text
        ctx.fillStyle = '#CD853F';
        ctx.fillText(`🪨 Rocks Left: ${rocks.length}`, 20, 175);
        
        // Game time - White text (MM:SS format)
        const totalSecs = Math.floor(gameState.gameTime / 60); // Convert frames to seconds
        const mins = Math.floor(totalSecs / 60); // Get minutes
        const secs = totalSecs % 60; // Get remaining seconds
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(`⏱️ Time: ${mins}:${secs.toString().padStart(2, '0')}`, 20, 200);
        
        // Wave status - Shows if waiting for next wave
        if (rocks.length === 0 && gameState.waveActive === false) {
            ctx.fillStyle = '#FFD700';
            ctx.fillText('🎉 Get Ready! Next Wave Soon...', 20, 225);
        } else {
            ctx.fillStyle = '#FFA500';
            ctx.fillText(`⚠️ Destroy All Rocks!`, 20, 225);
        }
        
        // ----------------------------------------
        // TOP-RIGHT: ACTIVE POWER-UPS PANEL
        // ----------------------------------------
        
        // Check if player has any active power-ups
        const hasActivePowerups = gameState.hasShield || gameState.doubleFire;
        
        if (hasActivePowerups) {
            // Draw power-up panel on the right side
            drawUIPanel(CONFIG.canvas.width - 220, 10, 210, 120, 'rgba(0, 0, 0, 0.6)');
            
            ctx.font = 'bold 18px Arial';
            ctx.fillStyle = '#FFD700';
            ctx.fillText('🌟 ACTIVE POWER-UPS', CONFIG.canvas.width - 210, 35);
            
            let powerupY = 60; // Starting Y position for power-up list
            
            // Display SHIELD power-up if active
            if (gameState.hasShield) {
                // Draw shield icon background
                ctx.fillStyle = 'rgba(0, 255, 255, 0.2)'; // Cyan glow
                ctx.fillRect(CONFIG.canvas.width - 210, powerupY - 20, 190, 30);
                
                // Shield text - Cyan color
                ctx.font = 'bold 16px Arial';
                ctx.fillStyle = '#00FFFF';
                ctx.fillText('🛡️ SHIELD ACTIVE', CONFIG.canvas.width - 205, powerupY);
                
                // Shield description
                ctx.font = '12px Arial';
                ctx.fillStyle = '#AAFFFF';
                ctx.fillText('Absorbs 1 hit', CONFIG.canvas.width - 205, powerupY + 15);
                
                powerupY += 45; // Move down for next power-up
            }
            
            // Display DOUBLE FIRE power-up if active
            if (gameState.doubleFire) {
                // Calculate remaining time in seconds
                const secsLeft = Math.ceil(gameState.doubleFireTimer / 60);
                
                // Draw double-fire icon background
                ctx.fillStyle = 'rgba(255, 0, 255, 0.2)'; // Magenta glow
                ctx.fillRect(CONFIG.canvas.width - 210, powerupY - 20, 190, 30);
                
                // Double-fire text - Magenta color with timer
                ctx.font = 'bold 16px Arial';
                ctx.fillStyle = '#FF00FF';
                ctx.fillText(`⚡ DOUBLE FIRE: ${secsLeft}s`, CONFIG.canvas.width - 205, powerupY);
                
                // Double-fire description
                ctx.font = '12px Arial';
                ctx.fillStyle = '#FFAAFF';
                ctx.fillText('Shoot 2 fireballs', CONFIG.canvas.width - 205, powerupY + 15);
            }
        }
        
        // ----------------------------------------
        // BOTTOM-LEFT: AUDIO STATUS INDICATOR
        // ----------------------------------------
        
        // Small text showing audio on/off status
        ctx.font = '13px Arial';
        ctx.fillStyle = audioEnabled ? '#00FF00' : '#FF0000'; // Green if on, Red if off
        const audioText = audioEnabled ? '🔊 Audio: ON (M to mute)' : '🔇 Audio: OFF (M to unmute)';
        ctx.fillText(audioText, 15, CONFIG.canvas.height - 15);
    }
    
    // Restore context state
    ctx.restore();
}

// Draw UI Panel - Helper function to draw background panels
function drawUIPanel(x, y, width, height, color) {
    // Draw semi-transparent background rectangle
    ctx.fillStyle = color;
    ctx.fillRect(x, y, width, height);
    
    // Draw border around panel for definition
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'; // Semi-transparent white border
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);
}

// ============================================
// DEBUG OVERLAY RENDERING
// ============================================
function drawDebug() {
    ctx.save();
    ctx.lineWidth = 1;

    // Draw the ground line to visualize collision plane
    if (DEBUG.drawGround) {
        const groundLevel = CONFIG.canvas.height - 30;
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.6)';
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(0, groundLevel);
        ctx.lineTo(CONFIG.canvas.width, groundLevel);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // Draw velocity vectors for rocks
    if (DEBUG.drawVelocity) {
        const scale = 6; // Visual scale for arrows
        for (let i = 0; i < rocks.length; i++) {
            const r = rocks[i];
            const cx = r.x + r.width / 2;
            const cy = r.y + r.height / 2;

            // Vector
            const dx = r.velocityX * scale;
            const dy = r.velocityY * scale;
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + dx, cy + dy);
            ctx.stroke();

            // Arrow head
            const angle = Math.atan2(dy, dx);
            const ah = 6;
            ctx.beginPath();
            ctx.moveTo(cx + dx, cy + dy);
            ctx.lineTo(cx + dx - Math.cos(angle - Math.PI / 6) * ah, cy + dy - Math.sin(angle - Math.PI / 6) * ah);
            ctx.lineTo(cx + dx - Math.cos(angle + Math.PI / 6) * ah, cy + dy - Math.sin(angle + Math.PI / 6) * ah);
            ctx.closePath();
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fill();

            // Label vy
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.font = '10px Arial';
            ctx.fillText(`vy:${r.velocityY.toFixed(2)}`, cx + 8, cy - 8);
        }
    }

    ctx.restore();
}

// Draw Game Over Screen - Enhanced with interactive restart button
function drawGameOver() {
    // ----------------------------------------
    // DARK OVERLAY - Semi-transparent background
    // ----------------------------------------
    
    // Draw dark overlay over entire game area
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)'; // Very dark overlay
    ctx.fillRect(0, 0, CONFIG.canvas.width, CONFIG.canvas.height);
    
    // Center all text on screen
    ctx.textAlign = 'center';
    
    // ----------------------------------------
    // GAME OVER TITLE
    // ----------------------------------------
    
    // Large "GAME OVER" text with outline
    ctx.font = 'bold 70px Arial';
    ctx.fillStyle = '#FF0000'; // Bright red
    ctx.strokeStyle = '#000000'; // Black outline
    ctx.lineWidth = 6; // Very thick outline
    ctx.strokeText('GAME OVER', CONFIG.canvas.width / 2, CONFIG.canvas.height / 2 - 120);
    ctx.fillText('GAME OVER', CONFIG.canvas.width / 2, CONFIG.canvas.height / 2 - 120);
    
    // ----------------------------------------
    // SKULL EMOJI - Visual indicator
    // ----------------------------------------
    
    ctx.font = '90px Arial'; // Very large emoji
    ctx.fillText('💀', CONFIG.canvas.width / 2, CONFIG.canvas.height / 2 - 20);
    
    // ----------------------------------------
    // FINAL SCORE DISPLAY - Main stat
    // ----------------------------------------
    
    // Draw score panel background (larger to accommodate stats properly)
    const scorePanelX = CONFIG.canvas.width / 2 - 220;
    const scorePanelY = CONFIG.canvas.height / 2 + 20;
    const scorePanelWidth = 440;
    const scorePanelHeight = 180;
    drawUIPanel(scorePanelX, scorePanelY, scorePanelWidth, scorePanelHeight, 'rgba(0, 0, 0, 0.7)');
    
    // Final score text - Large gold text at top of panel
    ctx.font = 'bold 36px Arial';
    ctx.fillStyle = '#FFD700'; // Gold color
    ctx.lineWidth = 4;
    const scoreTextY = scorePanelY + 40;
    ctx.strokeText(`FINAL SCORE: ${gameState.score}`, CONFIG.canvas.width / 2, scoreTextY);
    ctx.fillText(`FINAL SCORE: ${gameState.score}`, CONFIG.canvas.width / 2, scoreTextY);
    
    // ----------------------------------------
    // STATISTICS - Additional game info with proper spacing
    // ----------------------------------------
    
    ctx.font = 'bold 20px Arial';
    ctx.fillStyle = '#FFFFFF'; // White text
    ctx.lineWidth = 2;
    
    const statsStartY = scoreTextY + 50; // Start stats below score with padding
    const statsLineHeight = 32; // Consistent vertical spacing between lines
    
    // Rocks destroyed stat
    ctx.strokeText(`💥 Rocks Destroyed: ${gameState.rocksDestroyed}`, CONFIG.canvas.width / 2, statsStartY);
    ctx.fillText(`💥 Rocks Destroyed: ${gameState.rocksDestroyed}`, CONFIG.canvas.width / 2, statsStartY);
    
    // Level reached stat
    ctx.strokeText(`⭐ Level Reached: ${gameState.level}`, CONFIG.canvas.width / 2, statsStartY + statsLineHeight);
    ctx.fillText(`⭐ Level Reached: ${gameState.level}`, CONFIG.canvas.width / 2, statsStartY + statsLineHeight);
    
    // Game time stat
    const totalSecs = Math.floor(gameState.gameTime / 60);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    ctx.strokeText(`⏱️ Survival Time: ${mins}:${secs.toString().padStart(2, '0')}`, CONFIG.canvas.width / 2, statsStartY + statsLineHeight * 2);
    ctx.fillText(`⏱️ Survival Time: ${mins}:${secs.toString().padStart(2, '0')}`, CONFIG.canvas.width / 2, statsStartY + statsLineHeight * 2);
    
    // ----------------------------------------
    // RESTART BUTTON - Interactive element with proper sizing
    // ----------------------------------------
    
    // Button position and size - positioned below stats panel with spacing
    const buttonX = CONFIG.canvas.width / 2 - 160; // Center horizontally
    const buttonY = scorePanelY + scorePanelHeight + 25; // Position below stats with gap
    const buttonWidth = 320;
    const buttonHeight = 55;
    
    // Draw button background with gradient effect
    const gradient = ctx.createLinearGradient(buttonX, buttonY, buttonX, buttonY + buttonHeight);
    gradient.addColorStop(0, '#00DD00'); // Bright green at top
    gradient.addColorStop(1, '#00AA00'); // Darker green at bottom
    ctx.fillStyle = gradient;
    ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
    
    // Draw button border
    ctx.strokeStyle = '#FFFFFF'; // White border
    ctx.lineWidth = 3;
    ctx.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);
    
    // Draw button text - properly centered with adequate padding
    ctx.font = 'bold 22px Arial';
    ctx.fillStyle = '#FFFFFF'; // White text
    ctx.lineWidth = 0; // No stroke for button text to prevent overflow
    ctx.fillText('🔄 RESTART GAME (Press R)', CONFIG.canvas.width / 2, buttonY + 35);
    
    // Draw keyboard hint below button
    ctx.font = '15px Arial';
    ctx.fillStyle = '#AAAAAA'; // Gray text
    ctx.fillText('Or press R key to restart', CONFIG.canvas.width / 2, buttonY + buttonHeight + 30);
    
    // Reset text alignment
    ctx.textAlign = 'left';
}

// ============================================
// RESTART GAME - Reset all game state
// ============================================

function restartGame() {
    console.log('🔄 Restarting game...');
    
    // ----------------------------------------
    // RESET GAME STATE - All flags and counters
    // ----------------------------------------
    
    gameState.isGameOver = false;  // Enable gameplay
    gameState.score = 0;           // Reset score to zero
    gameState.level = 1;           // Back to level 1
    gameState.shootCooldown = 0;   // Player can shoot immediately
    gameState.rockSpawnTimer = 0;  // Reset spawn timer
    gameState.rocksDestroyed = 0;  // Reset destruction counter
    gameState.powerupSpawnTimer = 0; // Reset power-up timer
    gameState.hasShield = false;   // Remove shield power-up
    gameState.doubleFire = false;  // Disable double-fire power-up
    gameState.doubleFireTimer = 0; // Reset double-fire timer
    gameState.difficultyTimer = 0; // Reset difficulty progression
    gameState.currentSpawnRate = CONFIG.rock.spawnRate; // Reset to initial spawn rate
    gameState.currentSpeedBonus = 0; // Reset speed bonus to zero
    gameState.gameTime = 0;        // Reset game timer
    gameState.waveActive = false;  // Reset wave state
    gameState.waveNumber = 1;      // Reset to wave 1
    
    // ============================================
    // RE-LOCK MOUSE POINTER - Only on desktop (game is active again)
    // ============================================
    const canvas = document.getElementById('gameCanvas');
    
    // Check if mobile device (defined in index.html)
    const isMobile = typeof isMobileDevice !== 'undefined' && isMobileDevice;
    
    if (canvas && !isMobile) {
        canvas.style.cursor = 'none'; // Hide cursor during gameplay
        
        // Request pointer lock to confine mouse to game area (desktop only)
        if (canvas.requestPointerLock) {
            canvas.requestPointerLock();
            console.log('🔒 Mouse re-locked for gameplay');
        }
    } else if (isMobile) {
        console.log('📱 Mobile device - pointer lock skipped');
    }
    
    // ----------------------------------------
    // CLEAR ALL GAME OBJECTS - Remove everything from screen
    // ----------------------------------------
    
    rocks.length = 0;              // Remove all rocks from array
    fireballs.length = 0;          // Remove all fireballs from array
    powerups.length = 0;           // Remove all power-ups from array
    explosionParticles.length = 0; // Remove all explosion particles
    
    // ----------------------------------------
    // RESET PLAYER POSITION - Center bottom
    // ----------------------------------------
    
    player.x = CONFIG.canvas.width / 2 - CONFIG.player.width / 2; // Center horizontally
    player.y = CONFIG.canvas.height - CONFIG.player.height - 20;  // Position at bottom
    
    // ----------------------------------------
    // SPAWN INITIAL ROCKS - Start fresh game
    // ----------------------------------------
    
    spawnInitialRocks(); // Create starting rocks
    
    console.log('✅ Game restarted!');
}

// Event Listeners
window.addEventListener('keydown', (e) => {
    // Store key state for movement controls
    keys[e.key] = true;
    
    // Handle Spacebar - Just prevent scrolling (auto-fire handles shooting in update loop)
    if (e.key === ' ' || e.key === 'Space') {
        e.preventDefault(); // Prevent page scrolling when holding spacebar
        // Note: Auto-fire is now handled in the update() function
        // This allows continuous shooting when holding down spacebar
    }
    
    // Handle R key - Restart game after game over
    if (e.key === 'r' || e.key === 'R') {
        if (gameState.isGameOver) {
            restartGame(); // Restart the game
        }
    }
    
    // Handle M key - Mute/Unmute audio
    if (e.key === 'm' || e.key === 'M') {
        toggleAudio(); // Toggle sound effects on/off
    }

    // Handle D key - Toggle debug overlay
    if (e.key === 'd' || e.key === 'D') {
        DEBUG.enabled = !DEBUG.enabled;
        console.log(DEBUG.enabled ? '🧪 Debug ON' : '🧪 Debug OFF');
    }
});

window.addEventListener('keyup', (e) => {
    // Clear key state when key is released
    keys[e.key] = false;
});

// ============================================
// MOUSE/TOUCH CLICK DETECTION - For Restart Button
// ============================================

// Helper function to check if click/touch is on restart button
function checkRestartButtonClick(clientX, clientY) {
    // Only process clicks when game is over
    if (!gameState.isGameOver) {
        return false;
    }
    
    // Get canvas element
    const canvasElement = document.getElementById('gameCanvas');
    if (!canvasElement) return false;
    
    // Get canvas position on page (accounting for page scroll and borders)
    const rect = canvasElement.getBoundingClientRect();
    
    // Calculate position relative to canvas (not page)
    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;
    
    // Define restart button boundaries (must match drawGameOver function)
    const scorePanelY = CONFIG.canvas.height / 2 + 20;
    const scorePanelHeight = 180;
    const buttonX = CONFIG.canvas.width / 2 - 160;
    const buttonY = scorePanelY + scorePanelHeight + 25;
    const buttonWidth = 320;
    const buttonHeight = 55;
    
    // Check if click is within button boundaries
    const clickedButton = mouseX >= buttonX && 
                         mouseX <= buttonX + buttonWidth && 
                         mouseY >= buttonY && 
                         mouseY <= buttonY + buttonHeight;
    
    return clickedButton;
}

// Mouse click handler for restart button
window.addEventListener('click', (e) => {
    if (checkRestartButtonClick(e.clientX, e.clientY)) {
        console.log('🖱️ Restart button clicked!');
        restartGame();
    }
});

// Add mousemove listener to show pointer cursor over button
window.addEventListener('mousemove', (e) => {
    // Only handle hover during game over
    if (!gameState.isGameOver) {
        return;
    }
    
    const canvasElement = document.getElementById('gameCanvas');
    if (!canvasElement) return;
    
    const rect = canvasElement.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Calculate button boundaries (same as click handler)
    const scorePanelY = CONFIG.canvas.height / 2 + 20;
    const scorePanelHeight = 180;
    const buttonX = CONFIG.canvas.width / 2 - 160;
    const buttonY = scorePanelY + scorePanelHeight + 25;
    const buttonWidth = 320;
    const buttonHeight = 55;
    
    // Check if hovering over button
    const isHovering = mouseX >= buttonX && 
                      mouseX <= buttonX + buttonWidth && 
                      mouseY >= buttonY && 
                      mouseY <= buttonY + buttonHeight;
    
    // Change cursor to pointer when hovering over button
    canvasElement.style.cursor = isHovering ? 'pointer' : 'default';
});

// ============================================
// TOUCH/MOUSE CONTROLS - Move player with touch/cursor
// ============================================

// Get mouse/touch position relative to canvas
function getCanvasPosition(e) {
    const canvasElement = document.getElementById('gameCanvas');
    if (!canvasElement) return null;
    
    // Get canvas boundaries on page
    const rect = canvasElement.getBoundingClientRect();
    
    // Determine if this is a touch or mouse event
    let clientX;
    if (e.touches && e.touches.length > 0) {
        // Touch event - get first touch point
        clientX = e.touches[0].clientX;
    } else if (e.clientX !== undefined) {
        // Mouse event
        clientX = e.clientX;
    } else {
        return null;
    }
    
    // Calculate position relative to canvas (accounting for canvas border)
    const x = clientX - rect.left;
    
    return x;
}

// ============================================
// MOUSE/POINTER MOVEMENT - WITH POINTER LOCK SUPPORT
// ============================================

// Mouse Move - Track cursor position (supports both normal and pointer lock mode)
window.addEventListener('mousemove', (e) => {
    if (!gameState.isGameOver) {
        // Check if pointer is locked (confined to canvas)
        if (document.pointerLockElement === canvas) {
            // Pointer lock mode: use movementX for relative mouse movement
            // This allows smooth tracking even when cursor hits canvas edges
            if (mouseX === null) {
                mouseX = canvas.width / 2; // Initialize at center if not set
            }
            
            // Update position based on relative mouse movement
            mouseX += e.movementX;
            
            // Clamp to canvas boundaries
            mouseX = Math.max(0, Math.min(canvas.width, mouseX));
        } else {
            // Normal mode: use absolute cursor position
            const pos = getCanvasPosition(e);
            if (pos !== null) {
                mouseX = pos;
            }
        }
    }
});

// Mouse Down - Start tracking cursor
window.addEventListener('mousedown', (e) => {
    if (!gameState.isGameOver) {
        isTouching = true;
        const pos = getCanvasPosition(e);
        if (pos !== null) {
            mouseX = pos;
        }
    }
});

// Mouse Up - Stop tracking (optional, keeps following cursor anyway)
window.addEventListener('mouseup', (e) => {
    // Note: We keep mouseX active so player keeps following cursor
    // Set to null here if you want player to stop when mouse button released
    // mouseX = null;
});

// Start Game
window.addEventListener('load', () => {
    console.log('📄 Page loaded!');
    setTimeout(() => {
        init();
    }, 100);
});
