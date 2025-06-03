// Main entry point for the game

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Create and initialize the game
    const game = new Game();
    
    // Handle browser resize events
    window.addEventListener('resize', () => {
        if (game.track) {
            game.track.createTrack();
        }
    });
    
    // Log that the game has been initialized
    console.log('2D Car Racing game initialized with track selection');
});
