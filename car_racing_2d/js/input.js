// Input management for the game

class InputHandler {
    constructor() {
        this.keys = {};
        
        // Setup event listeners
        window.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;
            this.keys[e.code] = true; // Also track key codes for more reliable detection
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
            this.keys[e.code] = false;
        });
    }
    
    // Check if a key is currently pressed (works with key names or key codes)
    isKeyDown(keyIdentifier) {
        return this.keys[keyIdentifier] === true;
    }
    
    // Get throttle value (0 to 1)
    getThrottle() {
        return this.isKeyDown('ArrowUp') ? 1 : 0;
    }
    
    // Get brake value (0 to 1)
    getBrake() {
        return this.isKeyDown('ArrowDown') ? 1 : 0;
    }
    
    // Get steering value (-1 to 1, negative is left, positive is right)
    getSteering() {
        let steering = 0;
        if (this.isKeyDown('ArrowLeft')) steering -= 1;
        if (this.isKeyDown('ArrowRight')) steering += 1;
        return steering;
    }
    
    // Get handbrake state
    getHandbrake() {
        return this.isKeyDown('Space');
    }
}
