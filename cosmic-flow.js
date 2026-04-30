/**
 * Cosmic Flow Background Effect
 * A high-performance particle system that reacts to mouse movement.
 */

const canvas = document.getElementById('cosmic-canvas');
const ctx = canvas.getContext('2d');

let width, height;
let backgroundParticles = [];
let flowParticles = [];
const bgParticleCount = 80;
const mouse = { x: -100, y: -100, active: false };

/**
 * Handle window resizing to keep canvas full screen
 */
function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
}

window.addEventListener('resize', resize);
resize();

/**
 * Track mouse position and activity
 */
window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.active = true;
});

window.addEventListener('mouseleave', () => {
    mouse.active = false;
});

/**
 * Background Particle Class (Static floating stars)
 */
class BackgroundParticle {
    constructor() {
        this.init();
    }

    init() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 0.3;
        this.vy = (Math.random() - 0.5) * 0.3;
        this.size = Math.random() * 1.5 + 0.5;
        this.color = Math.random() > 0.6 ? '#3b82f6' : '#00f2ff';
        this.alpha = Math.random() * 0.5 + 0.2;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;

        // Subtle attraction to mouse
        if (mouse.active) {
            const dx = mouse.x - this.x;
            const dy = mouse.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 250) {
                this.vx += dx * 0.00005;
                this.vy += dy * 0.00005;
            }
        }

        // Friction to prevent infinite acceleration
        this.vx *= 0.99;
        this.vy *= 0.99;

        // Wrap around edges
        if (this.x < 0) this.x = width;
        if (this.x > width) this.x = 0;
        if (this.y < 0) this.y = height;
        if (this.y > height) this.y = 0;
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.globalAlpha = this.alpha;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

/**
 * Flow Particle Class (Emitted from mouse)
 */
class FlowParticle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        // Random direction with slight spread
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 2 + 0.5;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.size = Math.random() * 3 + 1;
        this.life = 1.0;
        this.decay = Math.random() * 0.02 + 0.015;
        this.color = Math.random() > 0.5 ? '#3b82f6' : '#00f2ff';
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= this.decay;
        
        // Slow down over time
        this.vx *= 0.96;
        this.vy *= 0.96;
    }

    draw() {
        if (this.life <= 0) return;
        
        ctx.shadowBlur = 10 * this.life;
        ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;
        ctx.globalAlpha = this.life * 0.8;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Reset shadow for performance
        ctx.shadowBlur = 0;
    }
}

// Initialize background particles
for (let i = 0; i < bgParticleCount; i++) {
    backgroundParticles.push(new BackgroundParticle());
}

/**
 * Main animation loop
 */
function animate() {
    // Clear canvas with transparency for trail effect
    ctx.clearRect(0, 0, width, height);

    // Update and draw background particles
    backgroundParticles.forEach(p => {
        p.update();
        p.draw();
    });

    // Create flow particles on mouse move
    if (mouse.active) {
        for (let i = 0; i < 3; i++) {
            flowParticles.push(new FlowParticle(mouse.x, mouse.y));
        }
    }

    // Update and draw flow particles
    flowParticles = flowParticles.filter(p => p.life > 0);
    flowParticles.forEach(p => {
        p.update();
        p.draw();
    });

    requestAnimationFrame(animate);
}

// Start animation
animate();
