/**
 * Fast Cam - Simple & Lightweight Camera PWA
 */

const viewfinder = document.getElementById('viewfinder');
const photoBtn = document.getElementById('photo-btn');
const recordBtn = document.getElementById('record-btn');
const switchBtn = document.getElementById('switch-camera-btn');
const flashBtn = document.getElementById('flash-btn');
const galleryBtn = document.getElementById('gallery-btn');
const closeGalleryBtn = document.getElementById('close-gallery');
const galleryOverlay = document.getElementById('gallery-overlay');
const galleryGrid = document.getElementById('gallery-grid');
const lastPreview = document.getElementById('last-item-preview');
const recordingIndicator = document.getElementById('recording-indicator');
const recordingTimer = document.getElementById('recording-timer');
const captureCanvas = document.getElementById('capture-canvas');

let stream = null;
let currentFacingMode = 'environment'; // Default to back camera
let mediaRecorder = null;
let recordedChunks = [];
let recordingStartTime = 0;
let timerInterval = null;
let isFlashOn = false;
let db = null;

// Initialize camera
async function initCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }

    const constraints = {
        video: {
            facingMode: currentFacingMode,
            width: { ideal: 4096 }, // Ask for high res
            height: { ideal: 2160 }
        },
        audio: true
    };

    try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        viewfinder.srcObject = stream;
        
        // Update flash button visibility and state
        updateCapabilities();
    } catch (err) {
        console.error("Camera error:", err);
        alert("No se pudo acceder a la cámara. Asegúrate de estar en HTTPS.");
    }
}

// Switch Camera
switchBtn.onclick = () => {
    currentFacingMode = (currentFacingMode === 'user') ? 'environment' : 'user';
    initCamera();
};

// Flash / Torch control
async function updateCapabilities() {
    const track = stream.getVideoTracks()[0];
    const caps = track.getCapabilities();
    
    // Check if torch is supported
    if (caps.torch) {
        flashBtn.classList.remove('hidden');
        const settings = track.getSettings();
        isFlashOn = settings.torch || false;
        updateFlashIcon();
    } else {
        flashBtn.classList.add('hidden');
    }
}

async function toggleFlash() {
    const track = stream.getVideoTracks()[0];
    const caps = track.getCapabilities();
    if (caps.torch) {
        isFlashOn = !isFlashOn;
        await track.applyConstraints({
            advanced: [{ torch: isFlashOn }]
        });
        updateFlashIcon();
    }
}

function updateFlashIcon() {
    const icon = flashBtn.querySelector('i');
    icon.setAttribute('data-lucide', isFlashOn ? 'zap' : 'zap-off');
    lucide.createIcons();
}

flashBtn.onclick = toggleFlash;

// Take Photo
photoBtn.onclick = async () => {
    // Visual feedback
    photoBtn.style.transform = 'scale(0.8)';
    setTimeout(() => photoBtn.style.transform = 'scale(1)', 100);

    const context = captureCanvas.getContext('2d');
    captureCanvas.width = viewfinder.videoWidth;
    captureCanvas.height = viewfinder.videoHeight;
    context.drawImage(viewfinder, 0, 0, captureCanvas.width, captureCanvas.height);
    
    const blob = await new Promise(resolve => captureCanvas.toBlob(resolve, 'image/jpeg', 0.95));
    saveToGallery(blob, 'image');
};

// Video Recording
recordBtn.onclick = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        stopRecording();
    } else {
        startRecording();
    }
};

function startRecording() {
    recordedChunks = [];
    
    // Check supported mime types
    const types = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
        'video/mp4'
    ];
    let selectedType = types.find(type => MediaRecorder.isTypeSupported(type)) || '';
    
    try {
        mediaRecorder = new MediaRecorder(stream, { mimeType: selectedType });
    } catch (e) {
        mediaRecorder = new MediaRecorder(stream); // Fallback to default
    }
    
    mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: mediaRecorder.mimeType });
        saveToGallery(blob, 'video');
    };

    mediaRecorder.start();
    
    // UI update
    recordBtn.classList.add('recording');
    recordingIndicator.classList.remove('hidden');
    startTimer();
}

function stopRecording() {
    mediaRecorder.stop();
    recordBtn.classList.remove('recording');
    recordingIndicator.classList.add('hidden');
    stopTimer();
}

function startTimer() {
    recordingStartTime = Date.now();
    timerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
        const mins = String(Math.floor(elapsed / 60)).padStart(2, '0');
        const secs = String(elapsed % 60).padStart(2, '0');
        recordingTimer.textContent = `${mins}:${secs}`;
    }, 1000);
}

function stopTimer() {
    clearInterval(timerInterval);
    recordingTimer.textContent = '00:00';
}

// persistence - IndexedDB
function initDB() {
    return new Promise((resolve) => {
        const request = indexedDB.open('FastCamDB', 1);
        request.onupgradeneeded = (e) => {
            db = e.target.result;
            db.createObjectStore('gallery', { keyPath: 'id', autoIncrement: true });
        };
        request.onsuccess = (e) => {
            db = e.target.result;
            loadGalleryPreview();
            resolve();
        };
    });
}

function saveToGallery(blob, type) {
    const transaction = db.transaction(['gallery'], 'readwrite');
    const store = transaction.objectStore('gallery');
    const item = {
        blob,
        type,
        timestamp: Date.now()
    };
    store.add(item);
    
    transaction.oncomplete = () => {
        const url = URL.createObjectURL(blob);
        lastPreview.style.backgroundImage = `url(${url})`;
    };
}

async function loadGalleryPreview() {
    const transaction = db.transaction(['gallery'], 'readonly');
    const store = transaction.objectStore('gallery');
    const request = store.getAll();
    
    request.onsuccess = (e) => {
        const items = e.target.result;
        if (items.length > 0) {
            const lastItem = items[items.length - 1];
            const url = URL.createObjectURL(lastItem.blob);
            lastPreview.style.backgroundImage = `url(${url})`;
        }
    };
}

// Gallery UI
galleryBtn.onclick = () => {
    galleryOverlay.classList.remove('hidden');
    renderGallery();
};

closeGalleryBtn.onclick = () => {
    galleryOverlay.classList.add('hidden');
};

function renderGallery() {
    galleryGrid.innerHTML = '';
    const transaction = db.transaction(['gallery'], 'readonly');
    const store = transaction.objectStore('gallery');
    const request = store.getAll();

    request.onsuccess = (e) => {
        const items = e.target.result.reverse();
        items.forEach(item => {
            const url = URL.createObjectURL(item.blob);
            let el;
            if (item.type === 'image') {
                el = document.createElement('img');
                el.src = url;
            } else {
                el = document.createElement('video');
                el.src = url;
                el.onclick = () => el.play(); // Simple play on click
            }
            galleryGrid.appendChild(el);
        });
    };
}

// Start
initDB();
initCamera();
