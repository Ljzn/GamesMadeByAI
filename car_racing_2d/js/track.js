// Track system for the racing game

class Track {
    constructor(canvas, trackData = null) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // Track properties
        this.trackWidth = 150; // Width of the track in pixels
        this.trackOutline = []; // Outer edge of the track
        this.trackInline = []; // Inner edge of the track
        this.checkpoints = []; // Checkpoints for lap counting
        this.startLine = null; // Starting line position
        this.trackData = trackData; // Track data from JSON
        
        // Track visual properties
        this.trackColor = '#555';
        this.trackBorderColor = '#fff';
        this.trackBorderWidth = 5;
        this.checkpointColor = 'rgba(255, 255, 0, 0.3)';
        this.startLineColor = '#f00';
        
        // Initialize track
        this.createTrack();
    }
    
    // Create a track layout
    createTrack() {
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        // Initialize track variables
        let trackPoints;
        let outerTrackScale = 1.2;
        let innerTrackScale = 0.6;
        let trackCheckpointCount = 8;
        
        // If track data is provided, use it
        if (this.trackData) {
            // Convert factor-based coordinates to actual canvas coordinates
            trackPoints = this.trackData.controlPoints.map(point => {
                return {
                    x: width * point.xFactor,
                    y: height * point.yFactor
                };
            });
            
            // Set track properties from data
            outerTrackScale = this.trackData.outerTrackScale;
            innerTrackScale = this.trackData.innerTrackScale;
            trackCheckpointCount = this.trackData.checkpointCount;
            
            // Set visual properties
            if (this.trackData.trackColor) this.trackColor = this.trackData.trackColor;
            if (this.trackData.borderColor) this.trackBorderColor = this.trackData.borderColor;
        } else {
            // Fallback to default track if no data is provided
            trackPoints = [
                { x: width * 0.7, y: height * 0.8 },  // Start/finish line
                { x: width * 0.8, y: height * 0.6 },  // First curve control
                { x: width * 0.8, y: height * 0.3 },  // First curve control
                { x: width * 0.6, y: height * 0.2 },  // First curve end
                { x: width * 0.4, y: height * 0.2 },  // Second curve start
                { x: width * 0.2, y: height * 0.3 },  // Second curve control
                { x: width * 0.2, y: height * 0.4 },  // Second curve control
                { x: width * 0.3, y: height * 0.5 },  // Chicane point
                { x: width * 0.2, y: height * 0.6 },  // Third curve control
                { x: width * 0.3, y: height * 0.8 },  // Third curve control
                { x: width * 0.5, y: height * 0.8 },  // Final corner start
                { x: width * 0.6, y: height * 0.9 },  // Final corner control
                { x: width * 0.7, y: height * 0.8 }   // Back to start
            ];
        }
        
        // Create smooth track using the points
        this.trackOutline = this.createSmoothTrack(trackPoints, outerTrackScale);
        this.trackInline = this.createSmoothTrack(trackPoints, innerTrackScale);
        
        // Ensure the track is closed
        if (this.trackOutline.length > 0) {
            this.trackOutline.push({ ...this.trackOutline[0] });
            this.trackInline.push({ ...this.trackInline[0] });
        }
        
        // Create checkpoints for lap counting
        this.checkpoints = [];
        
        // Add checkpoints based on track data or default to 8
        for (let i = 0; i < trackCheckpointCount; i++) {
            // Get outer and inner points at specific locations around the track
            const outerIdx = Math.floor(i * this.trackOutline.length / trackCheckpointCount);
            const innerIdx = Math.floor(i * this.trackInline.length / trackCheckpointCount);
            
            // Ensure indices are valid
            if (outerIdx < this.trackOutline.length && innerIdx < this.trackInline.length) {
                this.checkpoints.push({
                    start: { x: this.trackInline[innerIdx].x, y: this.trackInline[innerIdx].y },
                    end: { x: this.trackOutline[outerIdx].x, y: this.trackOutline[outerIdx].y }
                });
            }
        }
        
        // Create start line at the first checkpoint
        if (this.trackOutline.length > 0 && this.trackInline.length > 0) {
            // If track data has a defined start position
            if (this.trackData && this.trackData.startPosition) {
                // Create start line based on track data
                const startIdx = Math.floor(0.8 * this.trackOutline.length); // Position at 80% around the track
                this.startLine = {
                    start: { x: this.trackInline[startIdx].x, y: this.trackInline[startIdx].y },
                    end: { x: this.trackOutline[startIdx].x, y: this.trackOutline[startIdx].y },
                    width: 5
                };
                
                // Use start position from track data
                this.startPosition = {
                    x: width * this.trackData.startPosition.xFactor,
                    y: height * this.trackData.startPosition.yFactor,
                    angle: this.trackData.startPosition.angle
                };
            } else {
                const startIdx = Math.floor(0.8 * this.trackOutline.length); // Position at 80% around the track
                
                this.startLine = {
                    start: { x: this.trackInline[startIdx].x, y: this.trackInline[startIdx].y },
                    end: { x: this.trackOutline[startIdx].x, y: this.trackOutline[startIdx].y },
                    width: 5
                };
                
                // Calculate perpendicular angle for car start orientation
                const dx = this.trackOutline[startIdx+1].x - this.trackOutline[startIdx-1].x;
                const dy = this.trackOutline[startIdx+1].y - this.trackOutline[startIdx-1].y;
                const angle = (Math.atan2(dy, dx) * 180 / Math.PI) + 90; // +90 to point along the track
                
                // Position the car slightly ahead of the start line
                const midX = (this.startLine.start.x + this.startLine.end.x) / 2;
                const midY = (this.startLine.start.y + this.startLine.end.y) / 2;
                
                this.startPosition = {
                    x: midX,
                    y: midY,
                    angle: angle // Starting angle
                };
            }
        } else {
            // Fallback if track generation fails
            this.startLine = {
                start: { x: width * 0.7, y: height * 0.8 },
                end: { x: width * 0.7, y: height * 0.7 },
                width: 5
            };
            
            this.startPosition = {
                x: width * 0.7, 
                y: height * 0.75,
                angle: 90
            };
        }
    }
    
    // Draw the track
    draw() {
        // Clear the canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw background with grass texture
        this.drawBackground();
        
        // Create a track gradient for the asphalt effect
        const trackGradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
        trackGradient.addColorStop(0, '#444');
        trackGradient.addColorStop(1, '#333');
        
        // Draw the track
        this.ctx.fillStyle = trackGradient;
        this.ctx.beginPath();
        
        // Draw outer edge
        this.ctx.moveTo(this.trackOutline[0].x, this.trackOutline[0].y);
        for (const point of this.trackOutline) {
            this.ctx.lineTo(point.x, point.y);
        }
        
        // Draw inner edge (counterclockwise to create a hole)
        this.ctx.moveTo(this.trackInline[0].x, this.trackInline[0].y);
        for (let i = this.trackInline.length - 1; i >= 0; i--) {
            this.ctx.lineTo(this.trackInline[i].x, this.trackInline[i].y);
        }
        
        // Fill and stroke
        this.ctx.fill();
        
        // Draw track details (lane markings, rumble strips)
        this.drawTrackDetails();
        
        // Draw track borders
        this.drawTrackBorder(this.trackOutline);
        this.drawTrackBorder(this.trackInline);
        
        // Draw checkpoints for debugging
        // This can be commented out in production
        /*
        for (let i = 0; i < this.checkpoints.length; i++) {
            const checkpoint = this.checkpoints[i];
            
            this.ctx.strokeStyle = this.checkpointColor;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(checkpoint.start.x, checkpoint.start.y);
            this.ctx.lineTo(checkpoint.end.x, checkpoint.end.y);
            this.ctx.stroke();
            
            // Add checkpoint number
            const midX = (checkpoint.start.x + checkpoint.end.x) / 2;
            const midY = (checkpoint.start.y + checkpoint.end.y) / 2;
            
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '14px Arial';
            this.ctx.fillText(i, midX, midY);
        }
        */
        
        // Draw start line
        this.ctx.strokeStyle = this.startLineColor;
        this.ctx.lineWidth = this.startLine.width;
        this.ctx.beginPath();
        this.ctx.moveTo(this.startLine.start.x, this.startLine.start.y);
        this.ctx.lineTo(this.startLine.end.x, this.startLine.end.y);
        this.ctx.stroke();
    }
    
    // Draw a textured background
    drawBackground() {
        // Draw grass background
        this.ctx.fillStyle = '#1a6600';  // Dark green base
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Add a stable pattern to simulate grass (no randomness to prevent flickering)
        this.ctx.fillStyle = '#247800'; // Slightly lighter green
        const patternSize = 15;
        
        // Use a fixed pattern based on coordinates instead of random generation
        for (let x = 0; x < this.canvas.width; x += patternSize) {
            for (let y = 0; y < this.canvas.height; y += patternSize) {
                // Create a stable checkered pattern
                if ((Math.floor(x / patternSize) + Math.floor(y / patternSize)) % 3 === 0) {
                    this.ctx.fillRect(x, y, patternSize/2, patternSize/2);
                }
                if ((Math.floor(x / patternSize) - Math.floor(y / patternSize)) % 4 === 0) {
                    this.ctx.fillRect(x + patternSize/2, y + patternSize/2, patternSize/3, patternSize/3);
                }
            }
        }
    }
    
    // Draw track details like lane markings and rumble strips
    drawTrackDetails() {
        // Draw dashed center line
        if (this.trackOutline.length > 0 && this.trackInline.length > 0) {
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([10, 10]);
            
            this.ctx.beginPath();
            for (let i = 0; i < this.trackOutline.length; i += 1) {
                // Get the midpoint between inner and outer track
                const outerPoint = this.trackOutline[i % this.trackOutline.length];
                const innerPoint = this.trackInline[i % this.trackInline.length];
                
                const midX = (outerPoint.x + innerPoint.x) / 2;
                const midY = (outerPoint.y + innerPoint.y) / 2;
                
                if (i === 0) {
                    this.ctx.moveTo(midX, midY);
                } else {
                    this.ctx.lineTo(midX, midY);
                }
            }
            
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        }
        
        // Draw start/finish line 
        this.ctx.strokeStyle = this.startLineColor;
        this.ctx.lineWidth = this.startLine.width;
        this.ctx.beginPath();
        this.ctx.moveTo(this.startLine.start.x, this.startLine.start.y);
        this.ctx.lineTo(this.startLine.end.x, this.startLine.end.y);
        this.ctx.stroke();
        
        // Add checkerboard pattern at start/finish
        const segments = 8; // Number of checkerboard segments
        const dx = (this.startLine.end.x - this.startLine.start.x) / segments;
        const dy = (this.startLine.end.y - this.startLine.start.y) / segments;
        
        for (let i = 0; i < segments; i++) {
            if (i % 2 === 0) {
                this.ctx.fillStyle = '#000';
            } else {
                this.ctx.fillStyle = '#fff';
            }
            
            this.ctx.beginPath();
            this.ctx.moveTo(this.startLine.start.x + i * dx, this.startLine.start.y + i * dy);
            this.ctx.lineTo(this.startLine.start.x + (i + 1) * dx, this.startLine.start.y + (i + 1) * dy);
            this.ctx.lineTo(this.startLine.end.x + (i + 1) * dx, this.startLine.end.y + (i + 1) * dy);
            this.ctx.lineTo(this.startLine.end.x + i * dx, this.startLine.end.y + i * dy);
            this.ctx.closePath();
            this.ctx.fill();
        }
    }
    
    // Draw track border
    drawTrackBorder(points) {
        this.ctx.strokeStyle = this.trackBorderColor;
        this.ctx.lineWidth = this.trackBorderWidth;
        
        this.ctx.beginPath();
        this.ctx.moveTo(points[0].x, points[0].y);
        
        for (const point of points) {
            this.ctx.lineTo(point.x, point.y);
        }
        
        this.ctx.closePath();
        this.ctx.stroke();
    }
    
    // Check if a point is on the track
    isOnTrack(x, y) {
        const point = { x, y };
        const insideOuter = pointInPolygon(point, this.trackOutline);
        const insideInner = pointInPolygon(point, this.trackInline);
        
        return insideOuter && !insideInner;
    }
    
    // Check if a car has crossed a checkpoint or start line
    checkLineIntersection(prevPosition, currentPosition, line) {
        const carMovement = {
            start: { x: prevPosition.x, y: prevPosition.y },
            end: { x: currentPosition.x, y: currentPosition.y }
        };
        
        return lineIntersection(carMovement, line);
    }
    
    // Get starting position for the car
    getStartPosition() {
        return this.startPosition;
    }
    
    // Find the nearest point on the track center line to the given position
    findNearestTrackCenter(x, y) {
        const position = { x, y };
        
        // If track isn't initialized properly, return null
        if (!this.trackOutline.length || !this.trackInline.length) {
            return null;
        }
        
        let closestPoint = null;
        let minDistance = Infinity;
        
        // Use a reasonable sample of track points to find the nearest center point
        const sampleStep = Math.max(1, Math.floor(this.trackOutline.length / 20)); // Sample about 20 points
        
        for (let i = 0; i < this.trackOutline.length; i += sampleStep) {
            if (i >= this.trackOutline.length || i >= this.trackInline.length) continue;
            
            // Calculate center point between inner and outer track at this position
            const outerPoint = this.trackOutline[i];
            const innerPoint = this.trackInline[i];
            
            const centerX = (outerPoint.x + innerPoint.x) / 2;
            const centerY = (outerPoint.y + innerPoint.y) / 2;
            
            // Calculate distance to this center point
            const dx = centerX - x;
            const dy = centerY - y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < minDistance) {
                minDistance = distance;
                closestPoint = { x: centerX, y: centerY };
            }
        }
        
        return closestPoint;
    }
    
    // Helper method to create a smooth track from control points
    createSmoothTrack(controlPoints, scaleFactor = 1.0) {
        const smoothPoints = [];
        const resolution = 10; // Number of segments between control points
        
        for (let i = 0; i < controlPoints.length; i++) {
            const p0 = controlPoints[(i - 1 + controlPoints.length) % controlPoints.length];
            const p1 = controlPoints[i];
            const p2 = controlPoints[(i + 1) % controlPoints.length];
            const p3 = controlPoints[(i + 2) % controlPoints.length];
            
            // Generate points along the curve
            for (let t = 0; t < resolution; t++) {
                const u = t / resolution;
                
                // Catmull-Rom spline calculation
                const u2 = u * u;
                const u3 = u2 * u;
                
                const x = 0.5 * (
                    (2 * p1.x) +
                    (-p0.x + p2.x) * u +
                    (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * u2 +
                    (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * u3
                );
                
                const y = 0.5 * (
                    (2 * p1.y) +
                    (-p0.y + p2.y) * u +
                    (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * u2 +
                    (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * u3
                );
                
                // Apply scale factor to create inner/outer track
                const dx = x - this.canvas.width / 2;
                const dy = y - this.canvas.height / 2;
                
                // Scale the point relative to the center
                const scaledX = (this.canvas.width / 2) + (dx * scaleFactor);
                const scaledY = (this.canvas.height / 2) + (dy * scaleFactor);
                
                smoothPoints.push({ x: scaledX, y: scaledY });
            }
        }
        
        return smoothPoints;
    }
}
