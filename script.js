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
        
        // Set initial size based on screen width
        const isMobile = window.innerWidth <= 768;
        this.width = isMobile ? Math.min(window.innerWidth * 0.8, 640) : 640;
        this.height = isMobile ? (this.width * 9 / 16) : 360; // Maintain 16:9 aspect ratio
        
        this.opacity = 1;
        this.volume = 50;
        this.timeOffset = 0;
        this.duration = 0; // Video duration in seconds
        this.playbackRate = 1; // Playback speed (1 = normal, 0.5 = half speed, 2 = double speed)
        this.player = null;
        this.element = null;
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.isResizing = false;
        this.resizeHandle = null;
        
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
        
        // Create resize handle
        this.resizeHandle = document.createElement('div');
        this.resizeHandle.className = 'resize-handle';
        this.resizeHandle.innerHTML = '↘';
        
        this.element.appendChild(playerDiv);
        this.element.appendChild(this.resizeHandle);
        canvas.appendChild(this.element);
        
        // Add drag functionality (mouse and touch)
        this.element.addEventListener('mousedown', (e) => this.startDrag(e));
        this.element.addEventListener('touchstart', (e) => this.startTouchDrag(e));
        this.element.addEventListener('click', () => this.setActive());
        
        // Add resize functionality
        this.resizeHandle.addEventListener('mousedown', (e) => this.startResize(e));
        this.resizeHandle.addEventListener('touchstart', (e) => this.startTouchResize(e));
        
        // Add context menu functionality
        this.element.addEventListener('contextmenu', (e) => this.showContextMenu(e));
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
                    event.target.setPlaybackRate(this.playbackRate);
                    // Get video duration
                    this.duration = event.target.getDuration();
                    this.updateTimeOffsetControls();
                }
            }
        });
    }
    
    updateTimeOffsetControls() {
        const control = document.getElementById(`control-${this.id}`);
        if (control && this.duration > 0) {
            const timeOffsetInput = control.querySelector('[data-control="timeOffset"]');
            const timeOffsetDisplay = control.querySelector('[data-value="timeOffset"]');
            
            if (timeOffsetInput) {
                timeOffsetInput.max = this.duration;
                timeOffsetInput.value = Math.min(this.timeOffset, this.duration);
            }
            
            if (timeOffsetDisplay) {
                const durationMinutes = Math.floor(this.duration / 60);
                const durationSeconds = Math.floor(this.duration % 60);
                timeOffsetDisplay.textContent = `${this.timeOffset}s / ${durationMinutes}:${durationSeconds.toString().padStart(2, '0')}`;
            }
        }
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
                <label>Time Offset <span class="value-display" data-value="timeOffset">${this.timeOffset}s</span></label>
                <input type="range" min="0" max="300" value="${this.timeOffset}" data-control="timeOffset">
            </div>
            
            <div class="control-row">
                <label>Playback Speed <span class="value-display" data-value="playbackRate">${this.playbackRate}x</span></label>
                <input type="range" min="0.25" max="2" step="0.25" value="${this.playbackRate}" data-control="playbackRate">
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
                this.updateTimeOffsetDisplay();
            } else if (control === 'playbackRate') {
                this.setPlaybackRate(value);
                controlDiv.querySelector('[data-value="playbackRate"]').textContent = `${value}x`;
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
        this.timeOffset = Math.min(offset, this.duration || 300); // Cap at video duration
        // Update controls
        const control = document.getElementById(`control-${this.id}`);
        if (control) {
            control.querySelector('[data-control="timeOffset"]').value = this.timeOffset;
            this.updateTimeOffsetDisplay();
        }
    }
    
    updateTimeOffsetDisplay() {
        const control = document.getElementById(`control-${this.id}`);
        if (control) {
            const timeOffsetDisplay = control.querySelector('[data-value="timeOffset"]');
            if (timeOffsetDisplay && this.duration > 0) {
                const durationMinutes = Math.floor(this.duration / 60);
                const durationSeconds = Math.floor(this.duration % 60);
                timeOffsetDisplay.textContent = `${this.timeOffset}s / ${durationMinutes}:${durationSeconds.toString().padStart(2, '0')}`;
            } else if (timeOffsetDisplay) {
                timeOffsetDisplay.textContent = `${this.timeOffset}s`;
            }
        }
    }
    
    setPlaybackRate(rate) {
        this.playbackRate = rate;
        if (this.player && this.player.setPlaybackRate) {
            this.player.setPlaybackRate(rate);
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
        if (e.target.closest('iframe') || e.target.classList.contains('resize-handle')) return; // Don't drag when clicking on video or resize handle
        
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
    
    startTouchDrag(e) {
        e.preventDefault(); // Prevent scrolling
        if (e.target.closest('iframe') || e.target.classList.contains('resize-handle')) return; // Don't drag when touching video or resize handle
        
        const touch = e.touches[0];
        this.isDragging = true;
        this.dragStartX = touch.clientX - this.x;
        this.dragStartY = touch.clientY - this.y;
        
        const onTouchMove = (e) => {
            if (!this.isDragging) return;
            e.preventDefault(); // Prevent scrolling
            
            const touch = e.touches[0];
            const newX = touch.clientX - this.dragStartX;
            const newY = touch.clientY - this.dragStartY;
            this.setPosition(newX, newY);
        };
        
        const onTouchEnd = () => {
            this.isDragging = false;
            document.removeEventListener('touchmove', onTouchMove);
            document.removeEventListener('touchend', onTouchEnd);
        };
        
        document.addEventListener('touchmove', onTouchMove, { passive: false });
        document.addEventListener('touchend', onTouchEnd);
    }
    
    startResize(e) {
        e.stopPropagation(); // Prevent drag
        this.isResizing = true;
        this.dragStartX = e.clientX;
        this.dragStartY = e.clientY;
        const startWidth = this.width;
        const startHeight = this.height;
        
        const onMouseMove = (e) => {
            if (!this.isResizing) return;
            
            const deltaX = e.clientX - this.dragStartX;
            const deltaY = e.clientY - this.dragStartY;
            
            const newWidth = Math.max(200, startWidth + deltaX); // Minimum width
            const newHeight = Math.max(112, startHeight + deltaY); // Minimum height (16:9 ratio)
            
            this.setSize(newWidth, newHeight);
        };
        
        const onMouseUp = () => {
            this.isResizing = false;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
        
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }
    
    startTouchResize(e) {
        e.preventDefault();
        e.stopPropagation(); // Prevent drag
        this.isResizing = true;
        const touch = e.touches[0];
        this.dragStartX = touch.clientX;
        this.dragStartY = touch.clientY;
        const startWidth = this.width;
        const startHeight = this.height;
        
        const onTouchMove = (e) => {
            if (!this.isResizing) return;
            e.preventDefault();
            
            const touch = e.touches[0];
            const deltaX = touch.clientX - this.dragStartX;
            const deltaY = touch.clientY - this.dragStartY;
            
            const newWidth = Math.max(200, startWidth + deltaX); // Minimum width
            const newHeight = Math.max(112, startHeight + deltaY); // Minimum height (16:9 ratio)
            
            this.setSize(newWidth, newHeight);
        };
        
        const onTouchEnd = () => {
            this.isResizing = false;
            document.removeEventListener('touchmove', onTouchMove);
            document.removeEventListener('touchend', onTouchEnd);
        };
        
        document.addEventListener('touchmove', onTouchMove, { passive: false });
        document.addEventListener('touchend', onTouchEnd);
    }
    
    showContextMenu(e) {
        e.preventDefault();
        this.setActive();
        
        const contextMenu = document.getElementById('contextMenu');
        const x = e.clientX;
        const y = e.clientY;
        
        // Position the context menu
        contextMenu.style.left = `${x}px`;
        contextMenu.style.top = `${y}px`;
        contextMenu.classList.add('open');
        
        // Store reference to this layer for context menu actions
        contextMenu.dataset.layerId = this.id;
        
        // Close context menu when clicking elsewhere
        const closeContextMenu = (e) => {
            if (!contextMenu.contains(e.target)) {
                contextMenu.classList.remove('open');
                document.removeEventListener('click', closeContextMenu);
            }
        };
        
        setTimeout(() => {
            document.addEventListener('click', closeContextMenu);
        }, 100);
    }
    
    duplicate() {
        // Create a new layer with the same properties
        const newLayer = new VideoLayer(this.videoId, layerCounter++);
        
        // Copy all properties
        newLayer.x = this.x + 20; // Offset slightly
        newLayer.y = this.y + 20;
        newLayer.width = this.width;
        newLayer.height = this.height;
        newLayer.opacity = this.opacity;
        newLayer.volume = this.volume;
        newLayer.timeOffset = this.timeOffset;
        newLayer.playbackRate = this.playbackRate;
        
        // Update the visual elements
        newLayer.element.style.left = `${newLayer.x}px`;
        newLayer.element.style.top = `${newLayer.y}px`;
        newLayer.element.style.width = `${newLayer.width}px`;
        newLayer.element.style.height = `${newLayer.height}px`;
        newLayer.element.style.opacity = newLayer.opacity;
        
        // Update controls
        const control = document.getElementById(`control-${newLayer.id}`);
        if (control) {
            control.querySelector('[data-control="x"]').value = newLayer.x;
            control.querySelector('[data-control="y"]').value = newLayer.y;
            control.querySelector('[data-control="width"]').value = newLayer.width;
            control.querySelector('[data-control="height"]').value = newLayer.height;
            control.querySelector('[data-control="opacity"]').value = newLayer.opacity * 100;
            control.querySelector('[data-control="volume"]').value = newLayer.volume;
            control.querySelector('[data-control="timeOffset"]').value = newLayer.timeOffset;
            control.querySelector('[data-control="playbackRate"]').value = newLayer.playbackRate;
            control.querySelector('[data-value="opacity"]').textContent = `${Math.round(newLayer.opacity * 100)}%`;
            control.querySelector('[data-value="volume"]').textContent = `${newLayer.volume}%`;
            control.querySelector('[data-value="timeOffset"]').textContent = `${newLayer.timeOffset}s`;
            control.querySelector('[data-value="playbackRate"]').textContent = `${newLayer.playbackRate}x`;
        }
        
        layers.push(newLayer);
        newLayer.setActive();
        
        checkEmptyState();
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

// Mobile controls toggle functionality
function toggleMobileControls() {
    const controlPanel = document.querySelector('.control-panel');
    const overlay = document.getElementById('mobileOverlay');
    const toggleBtn = document.getElementById('mobileToggleBtn');
    
    const isOpen = controlPanel.classList.contains('open');
    
    if (isOpen) {
        controlPanel.classList.remove('open');
        overlay.classList.remove('open');
        toggleBtn.textContent = '☰';
    } else {
        controlPanel.classList.add('open');
        overlay.classList.add('open');
        toggleBtn.textContent = '✕';
    }
}

// Close mobile controls when clicking overlay
function closeMobileControls() {
    const controlPanel = document.querySelector('.control-panel');
    const overlay = document.getElementById('mobileOverlay');
    const toggleBtn = document.getElementById('mobileToggleBtn');
    
    controlPanel.classList.remove('open');
    overlay.classList.remove('open');
    toggleBtn.textContent = '☰';
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    const addBtn = document.getElementById('addLayerBtn');
    const playAllBtn = document.getElementById('playAllBtn');
    const pauseAllBtn = document.getElementById('pauseAllBtn');
    const mobileToggleBtn = document.getElementById('mobileToggleBtn');
    const mobileOverlay = document.getElementById('mobileOverlay');
    
    addBtn.addEventListener('click', addLayer);
    playAllBtn.addEventListener('click', playAll);
    pauseAllBtn.addEventListener('click', pauseAll);
    
    // Mobile controls toggle
    if (mobileToggleBtn) {
        mobileToggleBtn.addEventListener('click', toggleMobileControls);
    }
    
    if (mobileOverlay) {
        mobileOverlay.addEventListener('click', closeMobileControls);
    }
    
    // Context menu event listeners
    const contextMenu = document.getElementById('contextMenu');
    if (contextMenu) {
        contextMenu.addEventListener('click', (e) => {
            const action = e.target.closest('.context-menu-item')?.dataset.action;
            const layerId = parseInt(contextMenu.dataset.layerId);
            const layer = layers.find(l => l.id === layerId);
            
            if (action === 'duplicate' && layer) {
                layer.duplicate();
                contextMenu.classList.remove('open');
            } else if (action === 'delete' && layer) {
                layer.remove();
                contextMenu.classList.remove('open');
            }
        });
    }
    
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
