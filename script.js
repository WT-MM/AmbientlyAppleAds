// Global state
let layers = [];
let layerCounter = 0;
let activeLayerId = null;
let YTReady = false;

// YouTube API Ready callback
function onYouTubeIframeAPIReady() {
    YTReady = true;
    console.log('YouTube API Ready');
}

// Layer class to manage individual video layers
class VideoLayer {
    constructor(videoId, id) {
        this.id = id;
        this.videoId = videoId;
        this.x = 50;
        this.y = 50;
        this.width = 640;
        this.height = 360;
        this.opacity = 1;
        this.volume = 50;
        this.timeOffset = 0;
        this.player = null;
        this.element = null;
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        
        this.createElements();
        this.createPlayer();
        this.createControls();
    }
    
    createElements() {
        const canvas = document.getElementById('videoCanvas');
        this.element = document.createElement('div');
        this.element.className = 'video-layer';
        this.element.id = `layer-${this.id}`;
        this.element.style.left = `${this.x}px`;
        this.element.style.top = `${this.y}px`;
        this.element.style.width = `${this.width}px`;
        this.element.style.height = `${this.height}px`;
        this.element.style.opacity = this.opacity;
        
        // Create player container
        const playerDiv = document.createElement('div');
        playerDiv.id = `player-${this.id}`;
        playerDiv.style.width = '100%';
        playerDiv.style.height = '100%';
        
        this.element.appendChild(playerDiv);
        canvas.appendChild(this.element);
        
        // Add drag functionality
        this.element.addEventListener('mousedown', (e) => this.startDrag(e));
        this.element.addEventListener('click', () => this.setActive());
    }
    
    createPlayer() {
        if (!YTReady) {
            setTimeout(() => this.createPlayer(), 100);
            return;
        }
        
        this.player = new YT.Player(`player-${this.id}`, {
            videoId: this.videoId,
            width: '100%',
            height: '100%',
            playerVars: {
                autoplay: 0,
                controls: 0,
                modestbranding: 1,
                rel: 0,
                loop: 1,
                playlist: this.videoId
            },
            events: {
                'onReady': (event) => {
                    event.target.setVolume(this.volume);
                }
            }
        });
    }
    
    createControls() {
        const container = document.getElementById('layersContainer');
        const controlDiv = document.createElement('div');
        controlDiv.className = 'layer-control';
        controlDiv.id = `control-${this.id}`;
        controlDiv.dataset.layerId = this.id;
        
        controlDiv.innerHTML = `
            <div class="layer-header">
                <div class="layer-title">Layer ${this.id + 1}</div>
                <div class="layer-controls-group">
                    <button class="btn-icon btn-play" data-action="play">▶</button>
                    <button class="btn-icon btn-pause" data-action="pause">⏸</button>
                    <button class="btn-icon btn-remove" data-action="remove">×</button>
                </div>
            </div>
            
            <div class="control-row">
                <label>Volume <span class="value-display" data-value="volume">${this.volume}%</span></label>
                <input type="range" min="0" max="100" value="${this.volume}" data-control="volume">
            </div>
            
            <div class="control-row">
                <label>Opacity <span class="value-display" data-value="opacity">${Math.round(this.opacity * 100)}%</span></label>
                <input type="range" min="0" max="100" value="${this.opacity * 100}" data-control="opacity">
            </div>
            
            <div class="control-row">
                <label>Time Offset (seconds) <span class="value-display" data-value="timeOffset">${this.timeOffset}s</span></label>
                <input type="range" min="0" max="300" value="${this.timeOffset}" data-control="timeOffset">
            </div>
            
            <div class="control-row-split">
                <div class="control-item">
                    <label>X Position</label>
                    <input type="number" value="${this.x}" data-control="x">
                </div>
                <div class="control-item">
                    <label>Y Position</label>
                    <input type="number" value="${this.y}" data-control="y">
                </div>
            </div>
            
            <div class="control-row-split">
                <div class="control-item">
                    <label>Width</label>
                    <input type="number" value="${this.width}" data-control="width">
                </div>
                <div class="control-item">
                    <label>Height</label>
                    <input type="number" value="${this.height}" data-control="height">
                </div>
            </div>
        `;
        
        container.appendChild(controlDiv);
        
        // Add event listeners for controls
        controlDiv.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            if (action === 'play') this.play();
            else if (action === 'pause') this.pause();
            else if (action === 'remove') this.remove();
        });
        
        controlDiv.addEventListener('input', (e) => {
            const control = e.target.dataset.control;
            const value = parseFloat(e.target.value);
            
            if (control === 'volume') {
                this.setVolume(value);
                controlDiv.querySelector('[data-value="volume"]').textContent = `${value}%`;
            } else if (control === 'opacity') {
                this.setOpacity(value / 100);
                controlDiv.querySelector('[data-value="opacity"]').textContent = `${Math.round(value)}%`;
            } else if (control === 'timeOffset') {
                this.setTimeOffset(value);
                controlDiv.querySelector('[data-value="timeOffset"]').textContent = `${value}s`;
            } else if (control === 'x') {
                this.setPosition(value, this.y);
            } else if (control === 'y') {
                this.setPosition(this.x, value);
            } else if (control === 'width') {
                this.setSize(value, this.height);
            } else if (control === 'height') {
                this.setSize(this.width, value);
            }
        });
        
        controlDiv.addEventListener('click', () => this.setActive());
    }
    
    play() {
        if (this.player && this.player.playVideo) {
            if (this.timeOffset > 0) {
                this.player.seekTo(this.timeOffset, true);
            }
            this.player.playVideo();
        }
    }
    
    pause() {
        if (this.player && this.player.pauseVideo) {
            this.player.pauseVideo();
        }
    }
    
    setVolume(volume) {
        this.volume = volume;
        if (this.player && this.player.setVolume) {
            this.player.setVolume(volume);
        }
    }
    
    setOpacity(opacity) {
        this.opacity = opacity;
        this.element.style.opacity = opacity;
    }
    
    setPosition(x, y) {
        this.x = x;
        this.y = y;
        this.element.style.left = `${x}px`;
        this.element.style.top = `${y}px`;
        
        // Update controls
        const control = document.getElementById(`control-${this.id}`);
        if (control) {
            control.querySelector('[data-control="x"]').value = x;
            control.querySelector('[data-control="y"]').value = y;
        }
    }
    
    setSize(width, height) {
        this.width = width;
        this.height = height;
        this.element.style.width = `${width}px`;
        this.element.style.height = `${height}px`;
    }
    
    setTimeOffset(offset) {
        this.timeOffset = offset;
        // Update controls
        const control = document.getElementById(`control-${this.id}`);
        if (control) {
            control.querySelector('[data-control="timeOffset"]').value = offset;
        }
    }
    
    setActive() {
        // Remove active class from all layers
        document.querySelectorAll('.video-layer').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.layer-control').forEach(el => el.classList.remove('active'));
        
        // Add active class to this layer
        this.element.classList.add('active');
        const control = document.getElementById(`control-${this.id}`);
        if (control) {
            control.classList.add('active');
        }
        
        activeLayerId = this.id;
    }
    
    startDrag(e) {
        if (e.target.closest('iframe')) return; // Don't drag when clicking on video
        
        this.isDragging = true;
        this.dragStartX = e.clientX - this.x;
        this.dragStartY = e.clientY - this.y;
        
        const onMouseMove = (e) => {
            if (!this.isDragging) return;
            
            const newX = e.clientX - this.dragStartX;
            const newY = e.clientY - this.dragStartY;
            this.setPosition(newX, newY);
        };
        
        const onMouseUp = () => {
            this.isDragging = false;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
        
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }
    
    remove() {
        if (this.player && this.player.destroy) {
            this.player.destroy();
        }
        
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
        
        const control = document.getElementById(`control-${this.id}`);
        if (control && control.parentNode) {
            control.parentNode.removeChild(control);
        }
        
        const index = layers.findIndex(l => l.id === this.id);
        if (index > -1) {
            layers.splice(index, 1);
        }
        
        if (activeLayerId === this.id) {
            activeLayerId = null;
        }
        
        checkEmptyState();
    }
}

// Add layer function
function addLayer() {
    const select = document.getElementById('videoSelect');
    const videoId = select.value;
    
    if (!videoId) {
        alert('Please select a video first');
        return;
    }
    
    const layer = new VideoLayer(videoId, layerCounter++);
    layers.push(layer);
    layer.setActive();
    
    // Reset select
    select.value = '';
    
    checkEmptyState();
}

// Global play/pause functions
function playAll() {
    layers.forEach(layer => {
        if (layer.player && layer.player.playVideo) {
            if (layer.timeOffset > 0) {
                layer.player.seekTo(layer.timeOffset, true);
            }
            layer.player.playVideo();
        }
    });
}

function pauseAll() {
    layers.forEach(layer => {
        if (layer.player && layer.player.pauseVideo) {
            layer.player.pauseVideo();
        }
    });
}

// Check and show/hide empty state
function checkEmptyState() {
    const container = document.getElementById('layersContainer');
    let emptyState = container.querySelector('.empty-state');
    
    if (layers.length === 0) {
        if (!emptyState) {
            emptyState = document.createElement('div');
            emptyState.className = 'empty-state';
            emptyState.innerHTML = '<p>No layers yet.<br>Select a video and click "Add Layer" to get started.</p>';
            container.appendChild(emptyState);
        }
    } else {
        if (emptyState) {
            emptyState.remove();
        }
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    const addBtn = document.getElementById('addLayerBtn');
    const playAllBtn = document.getElementById('playAllBtn');
    const pauseAllBtn = document.getElementById('pauseAllBtn');
    
    addBtn.addEventListener('click', addLayer);
    playAllBtn.addEventListener('click', playAll);
    pauseAllBtn.addEventListener('click', pauseAll);
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Delete' && activeLayerId !== null) {
            const layer = layers.find(l => l.id === activeLayerId);
            if (layer) layer.remove();
        } else if (e.key === ' ' && activeLayerId !== null) {
            e.preventDefault();
            const layer = layers.find(l => l.id === activeLayerId);
            if (layer && layer.player && layer.player.getPlayerState) {
                const state = layer.player.getPlayerState();
                if (state === 1) { // Playing
                    layer.pause();
                } else {
                    layer.play();
                }
            }
        }
    });
    
    checkEmptyState();
});
