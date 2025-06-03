// Game management and logic

class Game {
    constructor() {
        // Get DOM elements
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Set canvas size
        this.setupCanvas();
        
        // UI elements
        this.startScreen = document.getElementById('start-screen');
        this.gameUI = document.getElementById('game-ui');
        this.endScreen = document.getElementById('end-screen');
        this.startButton = document.getElementById('start-button');
        this.restartButton = document.getElementById('restart-button');
        this.speedValue = document.getElementById('speed-value');
        this.currentLap = document.getElementById('current-lap');
        this.totalLaps = document.getElementById('total-laps');
        this.timeValue = document.getElementById('time-value');
        this.finalTime = document.getElementById('final-time');
        this.bestTime = document.getElementById('best-time');
        this.trackOptionsContainer = document.getElementById('track-options');
        
        // Track loader for managing multiple tracks
        this.trackLoader = new TrackLoader();
        
        // Game state
        this.gameState = 'start'; // 'start', 'playing', 'gameover'
        this.lastTime = 0;
        this.currentSpeed = 0;
        
        // Racing variables
        this.totalLapCount = 3; // Number of laps to complete the race
        this.lapCount = 0;
        this.checkpointIndex = 0;
        this.raceStartTime = 0;
        this.raceTime = 0;
        this.bestLapTime = localStorage.getItem('bestLapTime') 
            ? parseInt(localStorage.getItem('bestLapTime')) 
            : null;
        
        // Create input handler
        this.input = new InputHandler();
        
        // Load tracks and initialize the game
        this.initGame();
    }
    
    // Initialize the game with tracks
    async initGame() {
        try {
            // Load tracks from JSON
            await this.trackLoader.loadTracks();
            
            // Setup the track selection UI
            this.trackLoader.createTrackSelectionUI(this.trackOptionsContainer, (selectedTrack) => {
                // This will be called when a track is selected
                console.log(`Selected track: ${selectedTrack.name}`);
            });
            
            // Create game objects with the selected track
            this.createGameObjects();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Show the starting screen
            this.showScreen('start');
        } catch (error) {
            console.error('Failed to initialize game:', error);
        }
    }
    
    // Create game objects based on the selected track
    createGameObjects() {
        const selectedTrackData = this.trackLoader.getSelectedTrack();
        this.track = new Track(this.canvas, selectedTrackData);
        this.car = new Car(this.track.getStartPosition());
        this.particles = new ParticleSystem(this.canvas);
    }
    
    // Setup canvas to fill the container and be responsive
    setupCanvas() {
        const resizeCanvas = () => {
            const container = document.getElementById('game-container');
            this.canvas.width = container.clientWidth;
            this.canvas.height = container.clientHeight;
            
            // If the track exists, redraw it for the new dimensions
            if (this.track) {
                // Preserve the selected track data when resizing
                const currentTrackData = this.trackLoader?.getSelectedTrack();
                
                // Recreate track with current dimensions
                this.track = new Track(this.canvas, currentTrackData);
                
                // If we're playing, reset the car position
                if (this.gameState === 'playing' && this.car) {
                    this.car = new Car(this.track.getStartPosition());
                }
            }
        };
        
        // Initial setup
        resizeCanvas();
        
        // Resize when window changes
        window.addEventListener('resize', resizeCanvas);
    }
    
    // Setup event listeners for buttons
    setupEventListeners() {
        this.startButton.addEventListener('click', () => {
            this.startGame();
        });
        
        this.restartButton.addEventListener('click', () => {
            this.resetGame();
        });
        
        // Add change track button handler
        const changeTrackButton = document.getElementById('change-track-button');
        if (changeTrackButton) {
            changeTrackButton.addEventListener('click', () => {
                this.showScreen('start');
            });
        }
    }
    
    // Start the game
    startGame() {
        // Recreate game objects with the currently selected track
        this.createGameObjects();
        
        this.gameState = 'playing';
        this.showScreen('playing');
        this.resetRace();
        
        // Start the game loop
        requestAnimationFrame(this.gameLoop.bind(this));
    }
    
    // Reset the game for a new race
    resetGame() {
        // Recreate the car with the current track
        this.car = new Car(this.track.getStartPosition());
        this.particles.clear(); // Clear any remaining particles
        this.startGame();
    }
    
    // Reset race variables
    resetRace() {
        this.lapCount = 0;
        this.checkpointIndex = 0;
        this.raceStartTime = performance.now();
        this.raceTime = 0;
        
        // Load the best time for the current track
        const trackId = this.trackLoader.getSelectedTrack().id;
        const bestTimeKey = `bestLapTime_${trackId}`;
        this.bestLapTime = localStorage.getItem(bestTimeKey) 
            ? parseInt(localStorage.getItem(bestTimeKey)) 
            : null;
            
        this.updateUI();
    }
    
    // Main game loop
    gameLoop(currentTime) {
        // Calculate delta time
        const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.1); // convert to seconds, cap at 0.1s to prevent huge jumps
        this.lastTime = currentTime;
        
        // Update race time
        if (this.gameState === 'playing') {
            this.raceTime = performance.now() - this.raceStartTime;
        }
        
        // Clear the canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw the track
        this.track.draw();
        
        if (this.gameState === 'playing') {
            // Update particles first so they appear under the car
            this.particles.update(deltaTime);
            this.particles.draw();
            
            // Update car physics
            this.currentSpeed = this.car.update(this.input, this.track, deltaTime, this.particles);
            
            // Check for checkpoint and lap completion
            this.checkRaceProgress();
            
            // Update UI
            this.updateUI();
        }
        
        // Draw the car
        this.car.draw(this.ctx);
        
        // Continue the game loop if playing
        if (this.gameState !== 'gameover') {
            requestAnimationFrame(this.gameLoop.bind(this));
        }
    }
    
    // Check race progress (checkpoints and laps)
    checkRaceProgress() {
        // Get current checkpoint to check
        const nextCheckpointIndex = this.checkpointIndex % this.track.checkpoints.length;
        const checkpoint = this.track.checkpoints[nextCheckpointIndex];
        
        // Check if car crossed the checkpoint line
        if (this.track.checkLineIntersection(
                this.car.previousPosition, 
                { x: this.car.x, y: this.car.y }, 
                checkpoint)) {
                
            // Passed checkpoint, move to next one
            this.checkpointIndex++;
            
            // If we've gone through all checkpoints and crossed start line, complete a lap
            if (this.checkpointIndex % this.track.checkpoints.length === 0) {
                // Check if car crossed the start line
                if (this.track.checkLineIntersection(
                        this.car.previousPosition,
                        { x: this.car.x, y: this.car.y },
                        this.track.startLine)) {
                        
                    this.completeLap();
                }
            }
        }
    }
    
    // Complete a lap
    completeLap() {
        this.lapCount++;
        
        // Check if race is finished
        if (this.lapCount >= this.totalLapCount) {
            this.finishRace();
            return;
        }
        
        // Update lap counter
        this.currentLap.textContent = this.lapCount + 1;
    }
    
    // Finish the race
    finishRace() {
        this.gameState = 'gameover';
        
        // Check if this is a best time for the current track
        const finalTime = this.raceTime;
        const trackId = this.trackLoader.getSelectedTrack().id;
        const bestTimeKey = `bestLapTime_${trackId}`;
        const currentBestTime = localStorage.getItem(bestTimeKey) 
            ? parseInt(localStorage.getItem(bestTimeKey)) 
            : null;
        
        if (!currentBestTime || finalTime < currentBestTime) {
            // Save track-specific best time
            localStorage.setItem(bestTimeKey, finalTime);
            this.bestLapTime = finalTime;
        } else {
            this.bestLapTime = currentBestTime;
        }
        
        // Show end screen
        this.showEndScreen(finalTime);
    }
    
    // Show the end screen with race results
    showEndScreen(finalTime) {
        const currentTrack = this.trackLoader.getSelectedTrack();
        
        // Show race results with track name
        this.finalTime.textContent = `Your Time on ${currentTrack.name}: ${formatTime(finalTime)}`;
        
        if (this.bestLapTime) {
            this.bestTime.textContent = `Best Time: ${formatTime(this.bestLapTime)}`;
        } else {
            this.bestTime.textContent = '';
        }
        
        this.showScreen('gameover');
    }
    
    // Update the UI
    updateUI() {
        // Update speed display
        this.speedValue.textContent = this.currentSpeed;
        
        // Update lap counter
        this.currentLap.textContent = this.lapCount + 1;
        this.totalLaps.textContent = this.totalLapCount;
        
        // Update timer
        this.timeValue.textContent = formatTime(this.raceTime);
    }
    
    // Show a specific screen (start, playing, gameover)
    showScreen(screen) {
        // Hide all screens first
        this.startScreen.classList.add('hidden');
        this.gameUI.classList.add('hidden');
        this.endScreen.classList.add('hidden');
        
        // Show appropriate screen
        switch (screen) {
            case 'start':
                this.startScreen.classList.remove('hidden');
                break;
            case 'playing':
                this.gameUI.classList.remove('hidden');
                break;
            case 'gameover':
                this.endScreen.classList.remove('hidden');
                break;
        }
    }
}
