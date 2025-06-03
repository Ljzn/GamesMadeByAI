// Track loader to manage track data loading

class TrackLoader {
    constructor() {
        this.tracks = [];
        this.selectedTrackId = 'classic'; // Default track
    }
    
    // Load track data from JSON
    async loadTracks() {
        try {
            const response = await fetch('js/tracks.json');
            
            if (!response.ok) {
                throw new Error(`Failed to load track data: ${response.statusText}`);
            }
            
            const data = await response.json();
            this.tracks = data.tracks;
            
            // Load selected track from local storage if available
            const savedTrackId = localStorage.getItem('selectedTrackId');
            if (savedTrackId && this.tracks.find(track => track.id === savedTrackId)) {
                this.selectedTrackId = savedTrackId;
            }
            
            return this.tracks;
        } catch (error) {
            console.error('Error loading track data:', error);
            return [];
        }
    }
    
    // Set the selected track
    selectTrack(trackId) {
        this.selectedTrackId = trackId;
        localStorage.setItem('selectedTrackId', trackId);
    }
    
    // Get the currently selected track
    getSelectedTrack() {
        return this.tracks.find(track => track.id === this.selectedTrackId) || this.tracks[0];
    }
    
    // Create track selection UI
    createTrackSelectionUI(container, onSelectCallback) {
        container.innerHTML = '';
        
        this.tracks.forEach(track => {
            const trackOption = document.createElement('div');
            trackOption.className = 'track-option';
            if (track.id === this.selectedTrackId) {
                trackOption.classList.add('selected');
            }
            
            const trackPreview = document.createElement('div');
            trackPreview.className = 'track-preview';
            trackPreview.style.backgroundColor = track.previewColor || '#555';
            
            const trackName = document.createElement('div');
            trackName.className = 'track-name';
            trackName.textContent = track.name;
            
            const trackDescription = document.createElement('div');
            trackDescription.className = 'track-description';
            trackDescription.textContent = track.description;
            
            trackOption.appendChild(trackPreview);
            trackOption.appendChild(trackName);
            trackOption.appendChild(trackDescription);
            
            // Add event listener for track selection
            trackOption.addEventListener('click', () => {
                // Remove selected class from all tracks
                document.querySelectorAll('.track-option').forEach(el => {
                    el.classList.remove('selected');
                });
                
                // Add selected class to this track
                trackOption.classList.add('selected');
                
                // Update selected track
                this.selectTrack(track.id);
                
                // Call the callback
                if (typeof onSelectCallback === 'function') {
                    onSelectCallback(track);
                }
            });
            
            container.appendChild(trackOption);
        });
    }
}
