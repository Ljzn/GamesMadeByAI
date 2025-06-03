// Car physics and rendering

class Car {
    constructor(startPosition) {
        // Position and movement
        this.x = startPosition.x;
        this.y = startPosition.y;
        this.angle = degToRad(startPosition.angle); // Convert to radians
        this.speed = 0;
        this.acceleration = 0;
        this.previousPosition = { x: this.x, y: this.y };
        
        // Car dimensions
        this.width = 40;
        this.height = 20;
        this.wheelBase = 18; // Distance between front and rear wheels (reduced from 20 for tighter turning)
        this.steeringAngle = 0;
        
        // Car physics constants
        this.maxSpeed = 350; // Maximum speed in pixels per second
        this.maxReverseSpeed = -100; // Maximum reverse speed
        this.accelerationRate = 180; // Acceleration rate in pixels per second^2 (reduced for more realism)
        this.brakeForce = 320; // Braking force (increased for better stopping power)
        this.engineBrakeForce = 60; // Engine braking when not accelerating (increased for more natural deceleration)
        this.maxSteeringAngle = degToRad(55); // Maximum steering angle in radians (for low speeds only)
        this.steeringSpeed = 5.5; // How quickly the steering angle changes
        
        // Handling properties
        this.grip = 0.93; // How well the car grips the road (0-1)
        this.driftFactor = 0.75; // How much the car drifts (0-1) (adjusted for realistic drifting)
        this.handbrakeGripFactor = 0.25; // Grip when handbrake is applied (reduced for more dramatic handbrake turns)
        
        // Collision
        this.colliding = false;
        this.collisionCooldown = 0;
        this.collisionCooldownTime = 0.2; // seconds
        
        // Track recovery properties
        this.offTrack = false;
        this.offTrackSeverity = 0; // How far off track (0-1)
        this.offTrackTimer = 0; // How long the car has been off track
        this.targetRecoveryAngle = null; // Direction to steer to get back on track
        this.stuckCounter = 0; // Counts how long the car has been stuck in a similar position
        
        // Visual properties
        this.bodyColor = '#ffcc00';
        this.wheelColor = '#333';
        this.wheelWidth = 6;
        this.wheelHeight = 10;
        this.shadowOffset = 2;
        this.bounds = this.calculateBounds();
    }
    
    // Update the car physics
    update(input, track, deltaTime, particles = null) {
        // Save previous position for collision detection
        this.previousPosition = { x: this.x, y: this.y };
        
        // Handle input and physics with particle effects
        this.updatePhysics(input, deltaTime, particles);
        
        // Check if car is on track before collision detection
        const onTrack = this.isCarOnTrack(track);
        this.offTrack = !onTrack; // Store off-track state for visual indication
        
        // Track how long the car has been off track
        if (this.offTrack) {
            this.offTrackTimer += deltaTime;
            
            // Check if the car is stuck by comparing with previous position
            const dx = this.x - this.previousPosition.x;
            const dy = this.y - this.previousPosition.y;
            const moveDistance = Math.sqrt(dx*dx + dy*dy);
            
            // If car barely moved, increment stuck counter
            if (moveDistance < 1.0 && Math.abs(this.speed) < 20) {
                this.stuckCounter += deltaTime;
            } else {
                // Reset stuck counter if car is moving
                this.stuckCounter = Math.max(0, this.stuckCounter - deltaTime * 0.5);
            }
            
            // Generate dust particles when off-track
            if (particles && Math.abs(this.speed) > 20) {
                const dustIntensity = Math.min(1.0, Math.abs(this.speed) / 200);
                particles.createDustParticles(this, dustIntensity);
            }
            
            // Apply off-track physics (slower speed, less grip)
            this.speed *= 0.97;
        } else {
            // Reset off-track timer and stuck counter when on track
            this.offTrackTimer = 0;
            this.stuckCounter = 0;
        }
        
        // Check for track collisions and adjust position if needed
        this.handleTrackCollisions(track);
        
        // Update collision state
        if (this.collisionCooldown > 0) {
            this.collisionCooldown -= deltaTime;
        } else {
            this.colliding = false;
        }
        
        // Update bounds for collision detection
        this.bounds = this.calculateBounds();
        
        // Return the car's speed in km/h (for display purposes)
        return Math.abs(Math.round(this.speed * 3.6)); // Convert pixels/sec to km/h
    }
    
    // Check if the car is on the track
    isCarOnTrack(track) {
        // Check each corner of the car
        const corners = this.getCorners();
        
        // If any corner is off track, the car is considered off track
        for (const corner of corners) {
            if (!track.isOnTrack(corner.x, corner.y)) {
                return false;
            }
        }
        
        return true;
    }
    
    // Update the car physics based on input
    updatePhysics(input, deltaTime, particles = null) {
        // Get inputs
        const throttle = input.getThrottle();
        const brake = input.getBrake();
        const steering = input.getSteering();
        const handbrake = input.getHandbrake();
        
        // Apply acceleration or braking
        if (throttle > 0) {
            // Accelerate forward
            this.acceleration = throttle * this.accelerationRate;
            
            // Create exhaust smoke during hard acceleration
            if (particles && this.speed > 0 && this.speed < this.maxSpeed * 0.7) {
                const accelerationIntensity = (throttle * Math.abs(this.acceleration) / this.accelerationRate) * 0.8;
                particles.createExhaustSmoke(this, accelerationIntensity);
            }
        } else if (brake > 0) {
            // Apply brakes (or accelerate backward if already stopped)
            if (this.speed > 0) {
                this.acceleration = -brake * this.brakeForce;
                
                // Create skid marks when braking hard
                if (particles && this.speed > this.maxSpeed * 0.3) {
                    const brakeIntensity = (brake * this.speed / this.maxSpeed) * 0.5;
                    particles.createSkidMarks(this, brakeIntensity);
                }
            } else {
                this.acceleration = -brake * this.accelerationRate * 0.5; // Reverse is slower
            }
        } else {
            // Engine braking when no input
            this.acceleration = this.speed > 0 ? -this.engineBrakeForce : (this.speed < 0 ? this.engineBrakeForce : 0);
        }
        
        // Update speed based on acceleration
        this.speed += this.acceleration * deltaTime;
        
        // Cap speed at max values
        this.speed = Math.min(Math.max(this.speed, this.maxReverseSpeed), this.maxSpeed);
        
        // Apply steering based on speed and direction
        // More realistic steering: more responsive at low speeds, less responsive at high speeds
        const speedRatio = Math.abs(this.speed) / this.maxSpeed;
        
        // The faster the car goes, the less it can steer (inverse relationship)
        // At low speeds (0-20% max speed) - allow full steering
        // At high speeds (80-100% max speed) - limit to 40% of max steering
        let steeringFactor;
        if (speedRatio < 0.2) {
            // Full steering at low speeds
            steeringFactor = 1.0;
        } else if (speedRatio > 0.8) {
            // Limited steering at high speeds
            steeringFactor = 0.4;
        } else {
            // Linear decrease in steering ability from low to high speeds
            steeringFactor = 1.0 - (speedRatio - 0.2) * 0.75; // Maps 0.2->1.0 and 0.8->0.4
        }
        
        const direction = this.speed >= 0 ? 1 : -1; // Reverse steering when going backwards
        
        // Steering assistance when off-track to help get back on track
        let targetSteeringAngle;
        
        if (this.offTrack && this.targetRecoveryAngle !== null && this.offTrackSeverity > 0.25) {
            // Calculate steering needed to point toward track center
            const angleDiff = normalizeAngle(this.targetRecoveryAngle - this.angle);
            
            // Convert to steering input (-1 to 1)
            const assistSteering = Math.max(-1, Math.min(1, angleDiff / (this.maxSteeringAngle * 0.5)));
            
            // Blend user steering with assist steering based on severity
            // When more corners are off-track, assistance has more influence
            const assistInfluence = Math.min(0.8, this.offTrackSeverity * 0.8 + this.stuckCounter * 0.2);
            const blendedSteering = steering * (1 - assistInfluence) + assistSteering * assistInfluence;
            
            targetSteeringAngle = blendedSteering * this.maxSteeringAngle * steeringFactor;
        } else {
            // Normal steering when on track
            targetSteeringAngle = steering * this.maxSteeringAngle * steeringFactor;
        }
        
        // Gradually adjust steering angle based on input with improved responsiveness
        this.steeringAngle += (targetSteeringAngle - this.steeringAngle) * this.steeringSpeed * deltaTime;
        
        // Calculate turn radius based on steering angle and wheelbase
        if (this.speed !== 0 && this.steeringAngle !== 0) {
            // Apply rotation based on steering and speed with improved physics model
            // The formula uses Ackermann steering geometry approximation
            const absSpeed = Math.abs(this.speed);
            
            // Calculate turn rate with realistic physics - tighter turns at lower speeds
            // Introduce slightly more understeer at higher speeds (realistic car behavior)
            const understeeFactor = 1.0 - (absSpeed / this.maxSpeed) * 0.2; // Reduces to 80% at max speed
            const turnRate = direction * (this.speed / this.wheelBase) * Math.tan(this.steeringAngle * understeeFactor);
            this.angle += turnRate * deltaTime;
            
            // Normalize angle to 0-2π
            while (this.angle > Math.PI * 2) this.angle -= Math.PI * 2;
            while (this.angle < 0) this.angle += Math.PI * 2;
        }
        
        // Apply grip or drift
        const isDrifting = handbrake && Math.abs(this.speed) > 50;
        let currentGrip = isDrifting ? this.grip * this.handbrakeGripFactor : this.grip;
        
        // Create drift effects
        if (particles && isDrifting) {
            // Skid intensity depends on speed and steering angle
            const driftIntensity = (Math.abs(this.steeringAngle) / this.maxSteeringAngle) * 
                                  (Math.abs(this.speed) / this.maxSpeed) * 0.8;
            particles.createSkidMarks(this, driftIntensity);
        }
        
        // Apply vehicle movement
        const moveAngle = isDrifting ? 
            this.angle + (this.steeringAngle * direction * this.driftFactor) : 
            this.angle;
        
        // Update position based on speed and direction
        this.x += Math.cos(moveAngle) * this.speed * deltaTime;
        this.y += Math.sin(moveAngle) * this.speed * deltaTime;
        
        // Store if the car is drifting for visual effects
        this.isDrifting = isDrifting;
    }
    
    // Handle collisions with track boundaries
    handleTrackCollisions(track) {
        // Get car corners
        const corners = this.getCorners();
        
        // Check if any corner is off-track
        let offTrack = false;
        let offTrackCorners = 0;
        
        for (const corner of corners) {
            if (!track.isOnTrack(corner.x, corner.y)) {
                offTrack = true;
                offTrackCorners++;
            }
        }
        
        // If off track, handle collision
        if (offTrack) {
            // Store how badly the car is off track (0-1)
            this.offTrackSeverity = offTrackCorners / 4;
            
            // Calculate speed reduction based on severity + how stuck the car is
            // Apply progressive braking - more severe if more corners are off-track
            // or if the car has been stuck for a while
            const stuckFactor = Math.min(1.0, this.stuckCounter / 2); // Max effect after 2 seconds stuck
            const severityFactor = this.offTrackSeverity * 0.4; // 0 to 0.4 based on corners off-track
            const speedReductionFactor = 0.2 + severityFactor + (stuckFactor * 0.3); // 0.2-0.9 range
            
            this.speed *= (1 - speedReductionFactor);
            
            // Find the track center direction to assist player getting back on track
            const trackCenter = track.findNearestTrackCenter(this.x, this.y);
            
            if (trackCenter) {
                // Calculate direction vector to track center
                const dx = trackCenter.x - this.x;
                const dy = trackCenter.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance > 0) {
                    // Calculate angle to track center for steering assistance
                    const targetAngle = Math.atan2(dy, dx);
                    this.targetRecoveryAngle = targetAngle;
                    
                    // Normalize direction vector
                    const nx = dx / distance;
                    const ny = dy / distance;
                    
                    // Progressive assistance - more help when:
                    // 1. More corners are off track
                    // 2. Car has been off track longer
                    // 3. Car is severely stuck (not moving)
                    const baseAssistFactor = 2.0;
                    const cornerFactor = Math.pow(offTrackCorners / 4, 2) * 4; // 0 to 4
                    const offTrackTimeFactor = Math.min(2.0, this.offTrackTimer * 0.5); // Increases up to 2.0
                    const stuckAssistFactor = Math.min(4.0, this.stuckCounter * 2); // Additional help when stuck
                    
                    let assistFactor = baseAssistFactor + cornerFactor + offTrackTimeFactor + stuckAssistFactor;
                    
                    // Apply assistance force - pushes the car toward track center
                    this.x += nx * assistFactor;
                    this.y += ny * assistFactor;
                    
                    // Apply steering assistance when severely off-track or stuck
                    if (offTrackCorners >= 2 || this.stuckCounter > 0.5) {
                        // Calculate angle difference between car and direction to track
                        const angleDiff = normalizeAngle(targetAngle - this.angle);
                        
                        // Apply stronger steering assistance when more stuck
                        const steeringAssistance = 0.1 + Math.min(0.3, this.stuckCounter * 0.1);
                        
                        // Apply rotational assistance
                        this.angle += angleDiff * steeringAssistance;
                    }
                    
                    // If severely stuck (not moving for over 1.5 seconds), apply emergency recovery
                    if (this.stuckCounter > 1.5) {
                        // Give a speed boost toward track center
                        this.speed = 30; // Give a gentle push
                        this.angle = targetAngle; // Point directly to track
                    }
                }
            } else {
                // Fallback to previous behavior if track center can't be found
                this.x = this.previousPosition.x + (this.previousPosition.x - this.x) * 0.15;
                this.y = this.previousPosition.y + (this.previousPosition.y - this.y) * 0.15;
                this.speed *= 0.5;
            }
            
            // Set collision state - for visual feedback
            this.colliding = true;
            this.collisionCooldown = this.collisionCooldownTime;
        } else {
            // Reset off-track severity and recovery angle when back on track
            this.offTrackSeverity = 0;
            this.targetRecoveryAngle = null;
        }
    }
    
    // Get the car's corner points for collision detection
    getCorners() {
        const cos = Math.cos(this.angle);
        const sin = Math.sin(this.angle);
        
        const halfWidth = this.width / 2;
        const halfHeight = this.height / 2;
        
        return [
            // Front right
            {
                x: this.x + cos * halfWidth - sin * halfHeight,
                y: this.y + sin * halfWidth + cos * halfHeight
            },
            // Front left
            {
                x: this.x + cos * halfWidth + sin * halfHeight,
                y: this.y + sin * halfWidth - cos * halfHeight
            },
            // Back left
            {
                x: this.x - cos * halfWidth + sin * halfHeight,
                y: this.y - sin * halfWidth - cos * halfHeight
            },
            // Back right
            {
                x: this.x - cos * halfWidth - sin * halfHeight,
                y: this.y - sin * halfWidth + cos * halfHeight
            }
        ];
    }
    
    // Calculate bounds for collision detection
    calculateBounds() {
        const corners = this.getCorners();
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        
        for (const corner of corners) {
            minX = Math.min(minX, corner.x);
            minY = Math.min(minY, corner.y);
            maxX = Math.max(maxX, corner.x);
            maxY = Math.max(maxY, corner.y);
        }
        
        return {
            minX, minY, maxX, maxY,
            width: maxX - minX,
            height: maxY - minY
        };
    }
    
    // Draw the car
    draw(ctx) {
        ctx.save();
        
        // Move to car position and rotate
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        
        // Draw car shadow
        this.drawCarShadow(ctx);
        
        // Draw car body
        this.drawBody(ctx);
        
        // Draw wheels
        this.drawWheels(ctx);
        
        ctx.restore();
    }
    
    // Draw car shadow
    drawCarShadow(ctx) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(-this.width/2 + this.shadowOffset, -this.height/2 + this.shadowOffset, this.width, this.height);
    }
    
    // Draw car body
    drawBody(ctx) {
        // Determine car color based on status
        let baseColor;
        
        if (this.colliding) {
            // Collision - red color
            baseColor = '#ff6666';
        } else if (this.offTrack) {
            // Off track - color intensity based on severity
            if (this.stuckCounter > 1.0) {
                // Severely stuck - bright red warning
                baseColor = '#ff3333';
            } else if (this.offTrackSeverity >= 0.5) {
                // Half or more corners off track - orange warning
                baseColor = '#ff8833';
            } else {
                // Just slightly off track - yellow warning
                baseColor = '#ffcc33';
            }
        } else {
            // Normal color
            baseColor = this.bodyColor;
        }
        
        // Create a subtle gradient for metallic look
        const gradient = ctx.createLinearGradient(
            -this.width/2, -this.height/2,
            this.width/2, this.height/2
        );
        gradient.addColorStop(0, baseColor);
        gradient.addColorStop(0.5, lightenColor(baseColor, 20));
        gradient.addColorStop(1, baseColor);
        
        ctx.fillStyle = gradient;
        
        // Round the corners for a more polished look
        this.roundedRect(ctx, -this.width/2, -this.height/2, this.width, this.height, 5);
        
        // Add a small spoiler at the back
        ctx.fillStyle = '#333';
        ctx.fillRect(-this.width/2 - 2, -this.height/2 - 2, 5, this.height + 4);
        
        // Draw windows/cockpit
        ctx.fillStyle = '#444';
        this.roundedRect(ctx, -this.width/2 + 8, -this.height/2 + 3, this.width - 16, this.height/2 - 3, 2);
        
        // Front windshield
        ctx.fillStyle = '#6cf';
        this.roundedRect(ctx, this.width/2 - 12, -this.height/2 + 3, 8, this.height/2 - 3, 2);
        
        // Add headlights
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(this.width/2 - 3, -this.height/4, 3, 0, Math.PI * 2);
        ctx.arc(this.width/2 - 3, this.height/4, 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Add taillights
        ctx.fillStyle = '#d00';
        ctx.beginPath();
        ctx.arc(-this.width/2 + 3, -this.height/4, 2, 0, Math.PI * 2);
        ctx.arc(-this.width/2 + 3, this.height/4, 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Add a racing stripe - visible when normal or just slightly off track
        if (!this.colliding && this.stuckCounter < 0.5) {
            ctx.fillStyle = '#fff';
            ctx.fillRect(-this.width/2, -3, this.width, 6);
        }
        
        // Show track recovery assistance direction when off-track
        if (this.offTrack && this.targetRecoveryAngle !== null) {
            // Draw a small indicator showing direction to track
            ctx.save();
            ctx.rotate(-this.angle + this.targetRecoveryAngle);
            
            // Arrow color becomes more visible when more stuck
            const arrowOpacity = Math.min(1.0, 0.4 + this.offTrackSeverity * 0.3 + this.stuckCounter * 0.3);
            ctx.fillStyle = `rgba(255, 255, 255, ${arrowOpacity})`;
            
            // Draw direction arrow
            ctx.beginPath();
            ctx.moveTo(12, 0);
            ctx.lineTo(5, -5);
            ctx.lineTo(5, 5);
            ctx.closePath();
            ctx.fill();
            
            ctx.restore();
        }
    }
    
    // Helper method to draw rectangles with rounded corners
    roundedRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.arcTo(x + width, y, x + width, y + radius, radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
        ctx.lineTo(x + radius, y + height);
        ctx.arcTo(x, y + height, x, y + height - radius, radius);
        ctx.lineTo(x, y + radius);
        ctx.arcTo(x, y, x + radius, y, radius);
        ctx.closePath();
        ctx.fill();
    }
    
    // Draw car wheels
    drawWheels(ctx) {
        ctx.fillStyle = this.wheelColor;
        
        // Front wheels - these turn with steering
        ctx.save();
        ctx.translate(this.wheelBase/2, 0);
        ctx.rotate(this.steeringAngle);
        
        // Front left wheel
        ctx.fillRect(-this.wheelWidth/2, -this.height/2 - this.wheelHeight/2, 
                     this.wheelWidth, this.wheelHeight);
        
        // Front right wheel
        ctx.fillRect(-this.wheelWidth/2, this.height/2 - this.wheelHeight/2, 
                     this.wheelWidth, this.wheelHeight);
        ctx.restore();
        
        // Back wheels - fixed straight
        // Back left wheel
        ctx.fillRect(-this.wheelBase/2 - this.wheelWidth/2, -this.height/2 - this.wheelHeight/2, 
                     this.wheelWidth, this.wheelHeight);
        
        // Back right wheel
        ctx.fillRect(-this.wheelBase/2 - this.wheelWidth/2, this.height/2 - this.wheelHeight/2, 
                     this.wheelWidth, this.wheelHeight);
    }
}
