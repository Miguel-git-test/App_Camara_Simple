/**
 * Fast Cam - Simple & Lightweight Camera PWA
 */

const viewfinder = document.getElementById('viewfinder');
const photoBtn = document.getElementById('photo-btn');
const recordBtn = document.getElementById('record-btn');
const switchBtn = document.getElementById('switch-camera-btn');
const flashBtn = document.getElementById('flash-btn');
const galleryBtn = document.getElementById('gallery-btn');
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

// Initialize camera with auto-hardware detection
async function initCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }

    const idealQualities = [
        { w: 1920, h: 1080, name: 'Full HD' },
        { w: 1280, h: 720, name: 'HD' },
        { w: 640, h: 480, name: 'SD' }
    ];

    let successStream = null;
    let lastError = null;

    async function tryGetStream(w, h, audio = true) {
        const c = {
            video: {
                facingMode: currentFacingMode,
                width: { ideal: w },
                height: { ideal: h },
                frameRate: { ideal: 30 }
            },
            audio: audio
        };
        try {
            return await navigator.mediaDevices.getUserMedia(c);
        } catch (e) {
            lastError = e;
            return null;
        }
    }

    try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error("Su navegador no soporta el acceso a la cámara.");
        }

        // 1. Probar resoluciones de mayor a menor con audio
        for (const quality of idealQualities) {
            console.log(`Intentando: ${quality.name}`);
            successStream = await tryGetStream(quality.w, quality.h, true);
            if (successStream) break;
        }

        // 2. Si falló todo con audio, probar sin audio (fallback)
        if (!successStream) {
            console.log("Reintentando sin audio...");
            for (const quality of idealQualities) {
                successStream = await tryGetStream(quality.w, quality.h, false);
                if (successStream) break;
            }
        }

        if (!successStream) throw lastError || new Error("No se pudo iniciar la cámara.");

        stream = successStream;
        viewfinder.srcObject = stream;
        updateCapabilities();
        
    } catch (err) {
        console.error("Camera error:", err);
        
        // Diagnóstico adicional
        let devicesInfo = "Cámaras: ";
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const cams = devices.filter(d => d.kind === 'videoinput');
            devicesInfo += cams.length > 0 ? cams.length : "0";
        } catch (e) {
            devicesInfo += "Error";
        }

        alert("ERROR v1.2 (" + (err.name || 'Error') + "):\n" + (err.message || 'Desconocido') + "\n\n" + devicesInfo + "\n\n1. Revisa permisos.\n2. Prueba RECARGAR.");
        
        if (!document.getElementById('retry-btn')) {
            const reloadBtn = document.createElement('button');
            reloadBtn.id = 'retry-btn';
            reloadBtn.textContent = "RECARGAR APP";
            reloadBtn.style.cssText = "position:fixed; top:50%; left:50%; transform:translate(-50%, -50%); z-index:999; padding:20px; background:red; color:white; border:none; font-weight:bold; border-radius:10px; box-shadow: 0 4px 15px rgba(0,0,0,0.5);";
            reloadBtn.onclick = () => {
                if ('serviceWorker' in navigator) {
                    navigator.serviceWorker.getRegistrations().then(regs => {
                        for(let reg of regs) reg.unregister();
                        window.location.reload(true);
                    });
                } else {
                    window.location.reload(true);
                }
            };
            document.body.appendChild(reloadBtn);
        }
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
    
    const types = [
        'video/mp4;codecs=avc1',
        'video/webm;codecs=h264',
        'video/webm;codecs=vp8,opus',
        'video/webm',
        'video/mp4'
    ];
    let selectedType = types.find(type => MediaRecorder.isTypeSupported(type)) || '';
    
    const options = {
        mimeType: selectedType,
        videoBitsPerSecond: 2500000 
    };

    try {
        mediaRecorder = new MediaRecorder(stream, options);
    } catch (e) {
        mediaRecorder = new MediaRecorder(stream); 
    }
    
    mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: mediaRecorder.mimeType });
        saveToGallery(blob, 'video');
    };

    mediaRecorder.start(1000); 
    
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
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `fastcam_${Date.now()}.${type === 'image' ? 'jpg' : 'webm'}`;
        a.click();
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

// Gallery UI - Trigger native file explorer
const nativeGalleryInput = document.getElementById('native-gallery-input');

galleryBtn.onclick = () => {
    nativeGalleryInput.click();
};

// Start
initDB();
initCamera();

// PWA Install Prompt
let deferredPrompt;
const installBtn = document.getElementById('install-btn');

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.classList.remove('hidden');
});

installBtn.onclick = async () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            installBtn.classList.add('hidden');
        }
        deferredPrompt = null;
    }
};
