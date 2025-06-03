// Particle effects for the game

class ParticleSystem {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.particles = [];
    }
    
    // Create skid marks when drifting
    createSkidMarks(car, intensity) {
        if (intensity <= 0) return;
        
        const cos = Math.cos(car.angle);
        const sin = Math.sin(car.angle);
        
        // Get wheel positions
        const wheels = [
            // Rear left
            {
                x: car.x - cos * car.wheelBase/2 - sin * car.height/2,
                y: car.y - sin * car.wheelBase/2 + cos * car.height/2
            },
            // Rear right
            {
                x: car.x - cos * car.wheelBase/2 + sin * car.height/2,
                y: car.y - sin * car.wheelBase/2 - cos * car.height/2
            }
        ];
        
        // Create skid marks for each wheel
        for (const wheel of wheels) {
            // Only make skids sometimes based on intensity
            if (Math.random() < intensity) {
                this.particles.push({
                    x: wheel.x,
                    y: wheel.y,
                    size: 3 + Math.random() * 2,
                    opacity: 0.7 * intensity,
                    type: 'skid',
                    life: 600 // How long the skid mark stays
                });
            }
        }
    }
    
    // Create dust particles when driving off-track
    createDustParticles(car, intensity) {
        if (intensity <= 0) return;
        
        for (let i = 0; i < intensity * 3; i++) {
            const angle = car.angle + Math.PI + (Math.random() - 0.5);
            const speed = 1 + Math.random() * 2;
            
            this.particles.push({
                x: car.x,
                y: car.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 1 + Math.random() * 3,
                opacity: 0.3 + Math.random() * 0.4,
                type: 'dust',
                life: 30 + Math.random() * 60, // Shorter life for dust
                initialLife: 30 + Math.random() * 60
            });
        }
    }
    
    // Create smoke particles during hard acceleration
    createExhaustSmoke(car, intensity) {
        if (intensity <= 0) return;
        
        const cos = Math.cos(car.angle);
        const sin = Math.sin(car.angle);
        
        // Position at the rear of the car
        const exhaustX = car.x - cos * car.width/2;
        const exhaustY = car.y - sin * car.width/2;
        
        for (let i = 0; i < intensity * 2; i++) {
            const angle = car.angle + Math.PI + (Math.random() - 0.5) * 0.5;
            const speed = 0.5 + Math.random() * 1;
            
            this.particles.push({
                x: exhaustX,
                y: exhaustY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 2 + Math.random() * 3,
                opacity: 0.2 + Math.random() * 0.3,
                type: 'exhaust',
                life: 40 + Math.random() * 20,
                initialLife: 40 + Math.random() * 20
            });
        }
    }
    
    // Update all particles
    update(deltaTime) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            
            // Update particle life
            p.life -= deltaTime * 1000; // Convert to ms
            
            // Remove dead particles
            if (p.life <= 0) {
                this.particles.splice(i, 1);
                continue;
            }
            
            // Update moving particles (dust, exhaust)
            if (p.vx !== undefined) {
                p.x += p.vx;
                p.y += p.vy;
                
                // Slow down over time
                p.vx *= 0.95;
                p.vy *= 0.95;
                
                // Fade out based on life
                p.opacity = p.opacity * (p.life / p.initialLife);
            }
        }
    }
    
    // Draw all particles
    draw() {
        // Draw skid marks first (they should be under everything else)
        for (const p of this.particles) {
            if (p.type === 'skid') {
                this.ctx.fillStyle = `rgba(0, 0, 0, ${p.opacity})`;
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
        
        // Then draw dust particles
        for (const p of this.particles) {
            if (p.type === 'dust') {
                this.ctx.fillStyle = `rgba(150, 140, 100, ${p.opacity})`;
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
        
        // Finally draw exhaust smoke
        for (const p of this.particles) {
            if (p.type === 'exhaust') {
                this.ctx.fillStyle = `rgba(200, 200, 200, ${p.opacity})`;
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
    }
    
    // Clear all particles
    clear() {
        this.particles = [];
    }
}
